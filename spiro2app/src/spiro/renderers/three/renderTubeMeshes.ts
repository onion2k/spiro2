import {
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  Mesh,
  MeshPhysicalMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
} from 'three'

import { buildLineOffsets, createSymmetryTransforms2D, getSmoothedTrail, tangentForTrail, type RuntimeLayer } from '../runtime'

type RenderTubeMeshesOptions = {
  runtimeLayer: RuntimeLayer
  center: { x: number; y: number }
  step: number
  mirrorX: boolean
  mirrorY: boolean
  rotationalRepeats: number
  rotationOffsetDeg: number
  baseLineWidth: number
  lineWidthBoost: number
  trailSmoothing: number
  lineMaterialColor: string
  lineMaterialMetalness: number
  lineMaterialRoughness: number
  lineMaterialClearcoat: number
  lineMaterialClearcoatRoughness: number
}

function createPipeTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#f4f8ff')
    gradient.addColorStop(0.3, '#c4ccd8')
    gradient.addColorStop(0.52, '#8895a6')
    gradient.addColorStop(0.72, '#cad3de')
    gradient.addColorStop(1, '#e9eff8')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < 160; i += 1) {
      const y = Math.floor((i / 160) * canvas.height)
      const alpha = 0.05 + Math.random() * 0.08
      ctx.fillStyle = `rgba(255,255,255,${alpha})`
      ctx.fillRect(0, y, canvas.width, 1)
    }
  }
  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(28, 1.2)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function createPipeMaterial(options: RenderTubeMeshesOptions) {
  const pipeTexture = createPipeTexture()
  const color = new Color(options.lineMaterialColor)
  return new MeshPhysicalMaterial({
    color,
    map: pipeTexture,
    metalness: Math.max(0.75, Math.min(1, options.lineMaterialMetalness)),
    roughness: Math.max(0.05, Math.min(0.28, options.lineMaterialRoughness)),
    clearcoat: Math.max(0.5, Math.min(1, options.lineMaterialClearcoat)),
    clearcoatRoughness: Math.max(0.04, Math.min(0.22, options.lineMaterialClearcoatRoughness)),
    envMapIntensity: 2.35,
    sheen: 0.2,
    specularIntensity: 1,
  })
}

function buildTrackPoints(options: RenderTubeMeshesOptions) {
  const {
    runtimeLayer,
    center,
    step,
    mirrorX,
    mirrorY,
    rotationalRepeats,
    rotationOffsetDeg,
    trailSmoothing,
  } = options
  const tracks = new Map<string, Vector3[][]>()
  const activeStrip = new Map<string, Vector3[]>()
  const smoothedTrail = getSmoothedTrail(runtimeLayer, trailSmoothing)
  const symmetryTransforms = createSymmetryTransforms2D(
    { x: center.x, y: center.y },
    mirrorX,
    mirrorY,
    rotationalRepeats,
    rotationOffsetDeg
  )

  for (let i = 0; i < smoothedTrail.length; i += Math.max(1, step)) {
    const current = smoothedTrail[i]
    if (!current) {
      continue
    }
    const tangent = tangentForTrail(smoothedTrail, i, step)
    const offsets = buildLineOffsets(runtimeLayer.layer, current.index, runtimeLayer.paramU, tangent)
    for (let line = 0; line < offsets.length; line += 1) {
      const sourceX = current.x + offsets[line].x
      const sourceY = current.y + offsets[line].y
      const sourceZ = current.z + offsets[line].z

      for (let pair = 0; pair < symmetryTransforms.length; pair += 1) {
        const transform = symmetryTransforms[pair]
        const transformedX = sourceX * transform.xAxisX + sourceY * transform.yAxisX + transform.offsetX
        const transformedY = sourceX * transform.xAxisY + sourceY * transform.yAxisY + transform.offsetY
        const trackKey = `${line}:${pair}`
        let strip = activeStrip.get(trackKey)
        if (!strip) {
          strip = []
          activeStrip.set(trackKey, strip)
        }
        if (!current.connected && strip.length >= 4) {
          const allStrips = tracks.get(trackKey) ?? []
          allStrips.push(strip)
          tracks.set(trackKey, allStrips)
          strip = []
          activeStrip.set(trackKey, strip)
        }
        strip.push(new Vector3(transformedX - center.x, center.y - transformedY, sourceZ))
      }
    }
  }

  for (const [trackKey, strip] of activeStrip) {
    if (strip.length < 4) {
      continue
    }
    const allStrips = tracks.get(trackKey) ?? []
    allStrips.push(strip)
    tracks.set(trackKey, allStrips)
  }

  return tracks
}

export function renderTubeMeshes(options: RenderTubeMeshesOptions) {
  const material = createPipeMaterial(options)
  const radius = Math.max(2.5, options.baseLineWidth + options.lineWidthBoost * 0.45)
  const radialSegments = 20
  const nodes: Mesh[] = []
  const trackStrips = buildTrackPoints(options)

  for (const strips of trackStrips.values()) {
    for (const strip of strips) {
      if (strip.length < 4) {
        continue
      }
      const curve = new CatmullRomCurve3(strip, false, 'centripetal', 0.5)
      const tubularSegments = Math.max(32, Math.min(10240, Math.floor(strip.length * 1.6)))
      const geometry = new TubeGeometry(curve, tubularSegments, radius, radialSegments, false)
      const mesh = new Mesh(geometry, material)
      mesh.frustumCulled = false
      nodes.push(mesh)
    }
  }

  if (nodes.length === 0) {
    material.dispose()
  } else {
    // A shared material/texture is used across all strips in a layer.
    for (let i = 0; i < nodes.length; i += 1) {
      nodes[i].userData = { ...nodes[i].userData, skipMaterialDispose: i > 0 }
    }
  }

  return nodes
}
