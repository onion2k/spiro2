import { PALETTES } from '../constants'
import { clamp01, interpolateHue } from '../math'
import { fbmNoise2D, hashNoise2D } from '../noise'
import type { LayerConfig, Phase2, Point3, StrokeWidthMode, TrailPoint } from '../types'
import type { CompiledLayer, SpiroRendererConfig } from './types'

export type RuntimeLayer = {
  layer: LayerConfig
  generator: CompiledLayer['generator']
  generatorState: Record<string, number>
  paramT: number
  paramU: number
  previous: Point3 | null
  previousDirection: Point3 | null
  trail: TrailPoint[]
  pointIndex: number
}

export type RuntimeState = {
  runtimeLayers: RuntimeLayer[]
  runtimeLayerById: Map<string, RuntimeLayer>
  compiledLayersRef: CompiledLayer[]
  compiledGeneratorById: Map<string, CompiledLayer['generator']>
  prevTimeMs: number
  fpsEma: number
}

export type RuntimeDecisionStrategies = {
  modulatePhase: (args: { base: Phase2; layer: LayerConfig }) => Phase2
  applyNoiseAndAmplitude: (args: { point: Point3; basePhase: Phase2; samplePhase: Phase2; layer: LayerConfig }) => Point3
  scalePoint: (args: { point: Point3; layer: LayerConfig; center: Point3; width: number; height: number }) => Point3
}

type StepRuntimeOptions = Pick<
  SpiroRendererConfig,
  | 'layers'
  | 'compiledLayers'
  | 'isPaused'
  | 'amplitudeMod'
  | 'frequencyMod'
  | 'phaseMod'
  | 'noiseMode'
  | 'noiseAmount'
  | 'noiseFrequency'
  | 'noiseSpeed'
  | 'noiseOctaves'
  | 'noiseSeed'
  | 'maxTrailPointsPerLayer'
> & {
  state: RuntimeState
  timeMs: number
  width: number
  height: number
  decisionStrategies?: Partial<RuntimeDecisionStrategies>
}

function createGeneratorState(generator: CompiledLayer['generator']) {
  if (!generator?.createState) {
    return {}
  }
  return generator.createState()
}

export function createRuntimeState(layers: LayerConfig[], compiledLayers: CompiledLayer[]): RuntimeState {
  const compiledMap = new Map(compiledLayers.map((entry) => [entry.id, entry.generator]))
  const runtimeLayers = layers.map((layer) => ({
    layer,
    generator: compiledMap.get(layer.id) ?? null,
    generatorState: createGeneratorState(compiledMap.get(layer.id) ?? null),
    paramT: 0,
    paramU: 0,
    previous: null,
    previousDirection: null,
    trail: [],
    pointIndex: 0,
  }))
  return {
    runtimeLayers,
    runtimeLayerById: new Map(runtimeLayers.map((runtimeLayer) => [runtimeLayer.layer.id, runtimeLayer])),
    compiledLayersRef: compiledLayers,
    compiledGeneratorById: compiledMap,
    prevTimeMs: 0,
    fpsEma: 60,
  }
}

export function stepRuntime(options: StepRuntimeOptions) {
  const {
    state,
    layers,
    compiledLayers,
    isPaused,
    amplitudeMod,
    frequencyMod,
    phaseMod,
    noiseMode,
    noiseAmount,
    noiseFrequency,
    noiseSpeed,
    noiseOctaves,
    noiseSeed,
    maxTrailPointsPerLayer,
    timeMs,
    width,
    height,
    decisionStrategies,
  } = options
  const dt = state.prevTimeMs === 0 ? 0 : (timeMs - state.prevTimeMs) / 1000
  const nowSec = timeMs / 1000
  const center = { x: width / 2, y: height / 2, z: 0 }
  state.prevTimeMs = timeMs

  const defaultStrategies: RuntimeDecisionStrategies = {
    modulatePhase: ({ base }) => {
      const modulationPhase = base.u * 0.83 + Math.sin(base.t * 0.17)
      return {
        t: (base.t + phaseMod * Math.sin(modulationPhase)) * (1 + frequencyMod * Math.sin(base.u * 0.71)),
        u: (base.u + phaseMod * 0.35 * Math.cos(base.t * 0.29)) * (1 + frequencyMod * 0.35 * Math.sin(base.t * 0.23)),
      }
    },
    applyNoiseAndAmplitude: ({ point, basePhase, samplePhase }) => {
      const amplitudeScaleX = 1 + amplitudeMod * Math.sin(basePhase.u * 0.91)
      const amplitudeScaleY = 1 + amplitudeMod * Math.cos(basePhase.u * 0.73)
      const nx = samplePhase.t * noiseFrequency + basePhase.t * noiseSpeed
      const ny = samplePhase.u * noiseFrequency + basePhase.u * noiseSpeed
      const octaves = Math.max(1, Math.min(6, Math.round(noiseOctaves)))
      let wobbleX = 0
      let wobbleY = 0
      if (noiseMode === 'grain') {
        wobbleX = (hashNoise2D(nx, ny, noiseSeed) - 0.5) * 2 * noiseAmount
        wobbleY = (hashNoise2D(nx + 17.3, ny + 9.1, noiseSeed + 1.77) - 0.5) * 2 * noiseAmount
      } else if (noiseMode === 'flow') {
        wobbleX = fbmNoise2D(nx, ny, noiseSeed, octaves) * noiseAmount
        wobbleY = fbmNoise2D(nx + 19.2, ny + 7.6, noiseSeed + 2.03, octaves) * noiseAmount
      }
      return {
        x: point.x * amplitudeScaleX + wobbleX,
        y: point.y * amplitudeScaleY + wobbleY,
        z: point.z,
      }
    },
    scalePoint: ({ point, layer, center: viewportCenter, width: viewportWidth, height: viewportHeight }) => {
      const maxRange = Math.max(1, Math.abs(layer.R - layer.r) + Math.abs(layer.d))
      const scale = (Math.min(viewportWidth, viewportHeight) * 0.46) / maxRange
      return {
        x: viewportCenter.x + point.x * scale,
        y: viewportCenter.y + point.y * scale,
        z: point.z * scale,
      }
    },
  }
  const strategies: RuntimeDecisionStrategies = {
    ...defaultStrategies,
    ...decisionStrategies,
  }

  if (state.compiledLayersRef !== compiledLayers) {
    state.compiledLayersRef = compiledLayers
    state.compiledGeneratorById = new Map(compiledLayers.map((entry) => [entry.id, entry.generator]))
  }

  const nextRuntimeLayers: RuntimeLayer[] = []
  const nextRuntimeLayerById = new Map<string, RuntimeLayer>()
  for (const layer of layers) {
    const existing = state.runtimeLayerById.get(layer.id)
    const generator = state.compiledGeneratorById.get(layer.id) ?? null
    if (existing) {
      existing.layer = layer
      if (existing.generator !== generator) {
        existing.generatorState = createGeneratorState(generator)
        existing.paramT = 0
        existing.paramU = 0
        existing.previous = null
        existing.previousDirection = null
        existing.trail = []
        existing.pointIndex = 0
      }
      existing.generator = generator
      nextRuntimeLayers.push(existing)
      nextRuntimeLayerById.set(layer.id, existing)
      continue
    }
    const created: RuntimeLayer = {
      layer,
      generator,
      generatorState: createGeneratorState(generator),
      paramT: 0,
      paramU: 0,
      previous: null,
      previousDirection: null,
      trail: [],
      pointIndex: 0,
    }
    nextRuntimeLayers.push(created)
    nextRuntimeLayerById.set(layer.id, created)
  }
  state.runtimeLayers = nextRuntimeLayers
  state.runtimeLayerById = nextRuntimeLayerById

  if (dt > 0) {
    const fps = 1 / dt
    state.fpsEma = state.fpsEma * 0.9 + fps * 0.1
  }

  for (const runtime of state.runtimeLayers) {
    const layer = runtime.layer
    if (runtime.generator && !isPaused && layer.visible) {
      const sample = runtime.generator.step({
        layer,
        dt,
        state: runtime.generatorState,
        modulatePhase: (base) => strategies.modulatePhase({ base, layer }),
      })
      if (Number.isFinite(runtime.generatorState.t)) {
        runtime.paramT = runtime.generatorState.t
      }
      if (Number.isFinite(runtime.generatorState.u)) {
        runtime.paramU = runtime.generatorState.u
      }

      if (sample && Number.isFinite(sample.point.x) && Number.isFinite(sample.point.y) && Number.isFinite(sample.point.z)) {
        runtime.paramT = sample.phase.base.t
        runtime.paramU = sample.phase.base.u

        const noisyPoint = strategies.applyNoiseAndAmplitude({
          point: sample.point,
          basePhase: sample.phase.base,
          samplePhase: sample.phase.sample,
          layer,
        })
        const scaledPoint = strategies.scalePoint({
          point: noisyPoint,
          layer,
          center,
          width,
          height,
        })
        const x = scaledPoint.x
        const y = scaledPoint.y
        const z = scaledPoint.z

        let speedNorm = 0
        let curvatureNorm = 0
        if (runtime.previous && dt > 0) {
          const dx = x - runtime.previous.x
          const dy = y - runtime.previous.y
          const dz = z - runtime.previous.z
          const distance = Math.hypot(dx, dy, dz)
          speedNorm = clamp01(distance / (Math.min(width, height) * 0.04))

          if (distance > 1e-6) {
            const direction = { x: dx / distance, y: dy / distance, z: dz / distance }
            if (runtime.previousDirection) {
              const dot =
                runtime.previousDirection.x * direction.x +
                runtime.previousDirection.y * direction.y +
                runtime.previousDirection.z * direction.z
              const clampedDot = Math.max(-1, Math.min(1, dot))
              const turn = Math.acos(clampedDot)
              curvatureNorm = clamp01(turn / Math.PI)
            }
            runtime.previousDirection = direction
          } else {
            runtime.previousDirection = null
          }
        } else {
          runtime.previousDirection = null
        }

        runtime.trail.push({
          x,
          y,
          z,
          drawnAt: nowSec,
          hue: (runtime.paramT * 40) % 360,
          connected: runtime.previous !== null,
          speedNorm,
          curvatureNorm,
          index: runtime.pointIndex,
        })
        runtime.pointIndex += 1
        runtime.previous = { x, y, z }
      } else {
        runtime.previous = null
        runtime.previousDirection = null
      }
    }

    if (!layer.lineForever) {
      const cutoff = nowSec - layer.lineLifetime
      let firstVisible = 0
      while (firstVisible < runtime.trail.length && runtime.trail[firstVisible].drawnAt < cutoff) {
        firstVisible += 1
      }
      if (firstVisible > 0) {
        runtime.trail = runtime.trail.slice(firstVisible)
        if (runtime.trail.length > 0) {
          runtime.trail[0].connected = false
        } else {
          runtime.previous = null
          runtime.previousDirection = null
        }
      }
    }

    if (runtime.trail.length > maxTrailPointsPerLayer) {
      const trim = runtime.trail.length - maxTrailPointsPerLayer
      runtime.trail = runtime.trail.slice(trim)
      if (runtime.trail.length > 0) {
        runtime.trail[0].connected = false
      }
    }
  }

  return { nowSec, center }
}

function normalize3(vector: Point3) {
  const length = Math.hypot(vector.x, vector.y, vector.z)
  if (length < 1e-8) {
    return { x: 1, y: 0, z: 0 }
  }
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length }
}

function cross3(a: Point3, b: Point3): Point3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

export function tangentForTrail(trail: TrailPoint[], index: number, step: number): Point3 {
  const previousIndex = Math.max(0, index - Math.max(1, step))
  const nextIndex = Math.min(trail.length - 1, index + Math.max(1, step))
  const previous = trail[previousIndex]
  const next = trail[nextIndex]
  return normalize3({
    x: next.x - previous.x,
    y: next.y - previous.y,
    z: next.z - previous.z,
  })
}

function smoothTrailPoint(trail: TrailPoint[], index: number, amount: number) {
  const current = trail[index]
  if (!current || amount <= 0 || !current.connected) {
    return current
  }
  const previous = trail[Math.max(0, index - 1)]
  const next = trail[Math.min(trail.length - 1, index + 1)]
  if (!previous || !next || !previous.connected || !next.connected) {
    return current
  }
  const clamped = Math.max(0, Math.min(1, amount))
  const neighborWeight = Math.min(0.45, clamped * 0.45)
  const selfWeight = 1 - neighborWeight * 2
  return {
    ...current,
    x: current.x * selfWeight + (previous.x + next.x) * neighborWeight,
    y: current.y * selfWeight + (previous.y + next.y) * neighborWeight,
    z: current.z * selfWeight + (previous.z + next.z) * neighborWeight,
  }
}

function buildSmoothedTrail(trail: TrailPoint[], amount: number) {
  if (amount <= 0 || trail.length < 3) {
    return trail
  }
  const clamped = Math.max(0, Math.min(1, amount))
  const passes = Math.max(1, Math.min(10, Math.round(clamped * 10)))
  let output = trail.map((point) => ({ ...point }))
  for (let pass = 0; pass < passes; pass += 1) {
    output = output.map((_, index) => smoothTrailPoint(output, index, clamped) ?? output[index])
  }
  return output
}

type SmoothedTrailCacheEntry = {
  trail: TrailPoint[]
  trailLength: number
  lastPointIndex: number
  smoothingAmount: number
  result: TrailPoint[]
}

const smoothedTrailCache = new WeakMap<RuntimeLayer, SmoothedTrailCacheEntry>()

export function getSmoothedTrail(runtimeLayer: RuntimeLayer, smoothingAmount: number) {
  if (smoothingAmount <= 0 || runtimeLayer.trail.length < 3) {
    return runtimeLayer.trail
  }
  const trail = runtimeLayer.trail
  const trailLength = trail.length
  const lastPointIndex = trailLength > 0 ? trail[trailLength - 1]?.index ?? -1 : -1
  const cached = smoothedTrailCache.get(runtimeLayer)
  if (
    cached &&
    cached.trail === trail &&
    cached.trailLength === trailLength &&
    cached.lastPointIndex === lastPointIndex &&
    cached.smoothingAmount === smoothingAmount
  ) {
    return cached.result
  }
  const result = buildSmoothedTrail(trail, smoothingAmount)
  smoothedTrailCache.set(runtimeLayer, {
    trail,
    trailLength,
    lastPointIndex,
    smoothingAmount,
    result,
  })
  return result
}

export type SymmetryTransform2D = {
  xAxisX: number
  xAxisY: number
  yAxisX: number
  yAxisY: number
  offsetX: number
  offsetY: number
}

export function createSymmetryTransforms2D(
  center: { x: number; y: number },
  mirrorX: boolean,
  mirrorY: boolean,
  rotationalRepeats: number,
  rotationOffsetDeg: number
) {
  const transforms: SymmetryTransform2D[] = []
  const repeats = Math.max(1, rotationalRepeats)
  const offsetRad = (rotationOffsetDeg * Math.PI) / 180
  for (let i = 0; i < repeats; i += 1) {
    const angle = offsetRad + (i / repeats) * Math.PI * 2
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)
    transforms.push({
      xAxisX: cosA,
      xAxisY: sinA,
      yAxisX: -sinA,
      yAxisY: cosA,
      offsetX: center.x - center.x * cosA + center.y * sinA,
      offsetY: center.y - center.x * sinA - center.y * cosA,
    })
    if (mirrorX) {
      transforms.push({
        xAxisX: -cosA,
        xAxisY: sinA,
        yAxisX: sinA,
        yAxisY: cosA,
        offsetX: center.x + center.x * cosA - center.y * sinA,
        offsetY: center.y - center.x * sinA - center.y * cosA,
      })
    }
    if (mirrorY) {
      transforms.push({
        xAxisX: cosA,
        xAxisY: -sinA,
        yAxisX: -sinA,
        yAxisY: -cosA,
        offsetX: center.x - center.x * cosA + center.y * sinA,
        offsetY: center.y + center.x * sinA + center.y * cosA,
      })
    }
    if (mirrorX && mirrorY) {
      transforms.push({
        xAxisX: -cosA,
        xAxisY: -sinA,
        yAxisX: sinA,
        yAxisY: -cosA,
        offsetX: center.x + center.x * cosA - center.y * sinA,
        offsetY: center.y + center.x * sinA + center.y * cosA,
      })
    }
  }
  return transforms
}

export function buildLineOffsets(layer: LayerConfig, pointIndex: number, paramU: number, tangent?: Point3) {
  const count = Math.max(1, Math.min(16, Math.round(layer.multiLineCount)))
  const spread = Math.max(0, layer.multiLineSpread)
  if (count === 1 || spread === 0) {
    return [{ x: 0, y: 0, z: 0 }]
  }
  const normalizedPhaseStep = (0.08 * layer.multiLineMotionSpeed) / Math.max(0.15, Math.abs(layer.speed))
  const baseOrbitPhase = paramU * 0.6 + pointIndex * normalizedPhaseStep
  let globalPhase = 0
  if (layer.multiLineMotion === 'orbit') {
    globalPhase = baseOrbitPhase
  } else if (layer.multiLineMotion === 'random') {
    globalPhase = Math.sin(pointIndex * 0.071 + baseOrbitPhase * 0.83) * Math.PI
  }
  const offsets: Point3[] = []
  const tangentDir = normalize3(tangent ?? { x: 0, y: 0, z: 1 })
  const reference = Math.abs(tangentDir.z) < 0.95 ? { x: 0, y: 0, z: 1 } : { x: 0, y: 1, z: 0 }
  const basisU = normalize3(cross3(reference, tangentDir))
  const basisV = normalize3(cross3(tangentDir, basisU))
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + globalPhase
    const localX = Math.cos(angle) * spread
    const localY = Math.sin(angle) * spread
    offsets.push({
      x: basisU.x * localX + basisV.x * localY,
      y: basisU.y * localX + basisV.y * localY,
      z: basisU.z * localX + basisV.z * localY,
    })
  }
  return offsets
}

export function buildSymmetryVariants3D(
  point: Point3,
  center: Point3,
  mirrorX: boolean,
  mirrorY: boolean,
  rotationalRepeats: number,
  rotationOffsetDeg: number
) {
  const variants: Point3[] = []
  const repeats = Math.max(1, rotationalRepeats)
  const offsetRad = (rotationOffsetDeg * Math.PI) / 180
  for (let i = 0; i < repeats; i += 1) {
    const angle = offsetRad + (i / repeats) * Math.PI * 2
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)
    const relativeX = point.x - center.x
    const relativeY = point.y - center.y
    const rotated = {
      x: center.x + relativeX * cosA - relativeY * sinA,
      y: center.y + relativeX * sinA + relativeY * cosA,
      z: point.z,
    }
    variants.push(rotated)
    if (mirrorX) {
      variants.push({ x: center.x * 2 - rotated.x, y: rotated.y, z: rotated.z })
    }
    if (mirrorY) {
      variants.push({ x: rotated.x, y: center.y * 2 - rotated.y, z: rotated.z })
    }
    if (mirrorX && mirrorY) {
      variants.push({ x: center.x * 2 - rotated.x, y: center.y * 2 - rotated.y, z: rotated.z })
    }
  }
  return variants
}

export function colorForPoint(point: TrailPoint, layer: LayerConfig, nowSec: number) {
  const palette = PALETTES[layer.paletteId]
  const ageRatio = layer.lineForever ? 0 : clamp01((nowSec - point.drawnAt) / layer.lineLifetime)
  const alpha = layer.lineForever ? 1 : Math.max(0.06, 1 - ageRatio)
  let hue = point.hue
  if (layer.colorMode === 'palette') {
    hue = interpolateHue(palette, (point.index % 120) / 120)
  } else if (layer.colorMode === 'age') {
    hue = interpolateHue(palette, ageRatio)
  } else if (layer.colorMode === 'speed') {
    hue = interpolateHue(palette, point.speedNorm)
  } else if (layer.colorMode === 'curvature') {
    hue = interpolateHue(palette, point.curvatureNorm)
  }
  if (layer.hueLock) {
    hue = layer.baseHue
  }
  return { hue, alpha }
}

export function lineWidthForPoint(
  point: TrailPoint,
  strokeWidthMode: StrokeWidthMode,
  baseLineWidth: number,
  lineWidthBoost: number
) {
  let metric = 0
  if (strokeWidthMode === 'speed') {
    metric = point.speedNorm
  } else if (strokeWidthMode === 'curvature') {
    metric = point.curvatureNorm
  }
  return baseLineWidth + lineWidthBoost * metric
}
