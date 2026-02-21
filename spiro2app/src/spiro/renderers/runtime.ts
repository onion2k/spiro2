import { PALETTES } from '../constants'
import { clamp01, interpolateHue, rotatePoint } from '../math'
import { fbmNoise2D, hashNoise2D } from '../noise'
import type { LayerConfig, Point, StrokeWidthMode, TrailPoint } from '../types'
import type { CompiledLayer, SpiroRendererConfig } from './types'

export type RuntimeLayer = {
  layer: LayerConfig
  fn: CompiledLayer['fn']
  paramT: number
  paramU: number
  previous: Point | null
  previousAngle: number | null
  trail: TrailPoint[]
  pointIndex: number
  sampleCounter: number
}

export type RuntimeState = {
  runtimeLayers: RuntimeLayer[]
  prevTimeMs: number
  fpsEma: number
  sampleStride: number
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
  | 'adaptiveQuality'
  | 'maxAdaptiveStep'
> & {
  state: RuntimeState
  timeMs: number
  width: number
  height: number
}

export function createRuntimeState(layers: LayerConfig[], compiledLayers: CompiledLayer[]): RuntimeState {
  const compiledMap = new Map(compiledLayers.map((entry) => [entry.id, entry.fn]))
  return {
    runtimeLayers: layers.map((layer) => ({
      layer,
      fn: compiledMap.get(layer.id) ?? null,
      paramT: 0,
      paramU: 0,
      previous: null,
      previousAngle: null,
      trail: [],
      pointIndex: 0,
      sampleCounter: 0,
    })),
    prevTimeMs: 0,
    fpsEma: 60,
    sampleStride: 1,
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
    adaptiveQuality,
    maxAdaptiveStep,
    timeMs,
    width,
    height,
  } = options
  const dt = state.prevTimeMs === 0 ? 0 : (timeMs - state.prevTimeMs) / 1000
  const nowSec = timeMs / 1000
  const center = { x: width / 2, y: height / 2 }
  state.prevTimeMs = timeMs

  const compiledMap = new Map(compiledLayers.map((entry) => [entry.id, entry.fn]))
  const byId = new Map(state.runtimeLayers.map((runtime) => [runtime.layer.id, runtime]))
  state.runtimeLayers = layers.map((layer) => {
    const existing = byId.get(layer.id)
    const fn = compiledMap.get(layer.id) ?? null
    if (existing) {
      existing.layer = layer
      existing.fn = fn
      return existing
    }
    return {
      layer,
      fn,
      paramT: 0,
      paramU: 0,
      previous: null,
      previousAngle: null,
      trail: [],
      pointIndex: 0,
      sampleCounter: 0,
    }
  })

  if (dt > 0) {
    const fps = 1 / dt
    state.fpsEma = state.fpsEma * 0.9 + fps * 0.1
    if (adaptiveQuality) {
      if (state.fpsEma < 24) {
        state.sampleStride = Math.min(Math.max(1, maxAdaptiveStep), state.sampleStride + 1)
      } else if (state.fpsEma > 50) {
        state.sampleStride = Math.max(1, state.sampleStride - 1)
      }
    } else {
      state.sampleStride = 1
    }
  }

  for (const runtime of state.runtimeLayers) {
    const layer = runtime.layer
    if (runtime.fn && !isPaused && layer.visible) {
      runtime.paramT += dt * layer.speed
      runtime.paramU += dt * layer.uSpeed

      runtime.sampleCounter += 1
      if (runtime.sampleCounter % state.sampleStride === 0) {
        const modulationPhase = runtime.paramU * 0.83 + Math.sin(runtime.paramT * 0.17)
        const modT =
          (runtime.paramT + phaseMod * Math.sin(modulationPhase)) *
          (1 + frequencyMod * Math.sin(runtime.paramU * 0.71))
        const modU =
          (runtime.paramU + phaseMod * 0.35 * Math.cos(runtime.paramT * 0.29)) *
          (1 + frequencyMod * 0.35 * Math.sin(runtime.paramT * 0.23))
        const point = runtime.fn(modT, modU, layer.R, layer.r, layer.d)
        if (Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)) {
          const amplitudeScaleX = 1 + amplitudeMod * Math.sin(runtime.paramU * 0.91)
          const amplitudeScaleY = 1 + amplitudeMod * Math.cos(runtime.paramU * 0.73)
          const nx = modT * noiseFrequency + runtime.paramT * noiseSpeed
          const ny = modU * noiseFrequency + runtime.paramU * noiseSpeed
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
          const modX = point.x * amplitudeScaleX + wobbleX
          const modY = point.y * amplitudeScaleY + wobbleY
          const modZ = point.z * layer.zScale
          const maxRange = Math.max(1, Math.abs(layer.R - layer.r) + Math.abs(layer.d))
          const scale = (Math.min(width, height) * 0.46) / maxRange
          const x = center.x + modX * scale
          const y = center.y + modY * scale
          const z = modZ * scale

          let speedNorm = 0
          let curvatureNorm = 0
          if (runtime.previous && dt > 0) {
            const dx = x - runtime.previous.x
            const dy = y - runtime.previous.y
            const distance = Math.hypot(dx, dy)
            speedNorm = clamp01(distance / (Math.min(width, height) * 0.04))

            const angle = Math.atan2(dy, dx)
            if (runtime.previousAngle !== null) {
              const turn = Math.atan2(Math.sin(angle - runtime.previousAngle), Math.cos(angle - runtime.previousAngle))
              curvatureNorm = clamp01(Math.abs(turn) / Math.PI)
            }
            runtime.previousAngle = angle
          } else {
            runtime.previousAngle = null
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
          runtime.previous = { x, y }
        } else {
          runtime.previous = null
          runtime.previousAngle = null
        }
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
          runtime.previousAngle = null
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

export function buildLineOffsets(layer: LayerConfig, pointIndex: number, paramU: number) {
  const count = Math.max(1, Math.min(16, Math.round(layer.multiLineCount)))
  const spread = Math.max(0, layer.multiLineSpread)
  if (count === 1 || spread === 0) {
    return [{ x: 0, y: 0 }]
  }
  const normalizedPhaseStep = (0.08 * layer.multiLineMotionSpeed) / Math.max(0.15, Math.abs(layer.speed))
  const baseOrbitPhase = paramU * 0.6 + pointIndex * normalizedPhaseStep
  let globalPhase = 0
  if (layer.multiLineMotion === 'orbit') {
    globalPhase = baseOrbitPhase
  } else if (layer.multiLineMotion === 'random') {
    globalPhase = Math.sin(pointIndex * 0.071 + baseOrbitPhase * 0.83) * Math.PI
  }
  const offsets: Point[] = []
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + globalPhase
    offsets.push({ x: Math.cos(angle) * spread, y: Math.sin(angle) * spread })
  }
  return offsets
}

export function buildSymmetryVariants(
  point: Point,
  center: Point,
  mirrorX: boolean,
  mirrorY: boolean,
  rotationalRepeats: number,
  rotationOffsetDeg: number
) {
  const variants: Point[] = []
  const repeats = Math.max(1, rotationalRepeats)
  const offsetRad = (rotationOffsetDeg * Math.PI) / 180
  for (let i = 0; i < repeats; i += 1) {
    const angle = offsetRad + (i / repeats) * Math.PI * 2
    const rotated = rotatePoint(point, center, angle)
    variants.push(rotated)
    if (mirrorX) {
      variants.push({ x: center.x * 2 - rotated.x, y: rotated.y })
    }
    if (mirrorY) {
      variants.push({ x: rotated.x, y: center.y * 2 - rotated.y })
    }
    if (mirrorX && mirrorY) {
      variants.push({ x: center.x * 2 - rotated.x, y: center.y * 2 - rotated.y })
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
