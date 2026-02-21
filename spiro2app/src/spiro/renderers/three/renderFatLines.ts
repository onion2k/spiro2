import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, MeshPhysicalMaterial, Vector3 } from 'three'

import { buildLineOffsets, buildSymmetryVariants, colorForPoint, lineWidthForPoint, type RuntimeLayer } from '../runtime'
import type { StrokeWidthMode } from '../../types'

type RenderFatLinesOptions = {
  runtimeLayer: RuntimeLayer
  center: { x: number; y: number }
  nowSec: number
  width: number
  height: number
  step: number
  mirrorX: boolean
  mirrorY: boolean
  rotationalRepeats: number
  rotationOffsetDeg: number
  strokeWidthMode: StrokeWidthMode
  baseLineWidth: number
  lineWidthBoost: number
  dashedLines: boolean
  dashLength: number
  dashGap: number
  lineMaterialColor: string
  lineMaterialMetalness: number
  lineMaterialRoughness: number
  lineMaterialClearcoat: number
  lineMaterialClearcoatRoughness: number
  lineMaterialTransmission: number
  lineMaterialThickness: number
  lineMaterialIor: number
}

type TrackStrip = { positions: number[]; colors: number[] }
type Track = TrackStrip & { strips: TrackStrip[] }

type RibbonMaterialOptions = {
  lineMaterialColor: string
  lineMaterialMetalness: number
  lineMaterialRoughness: number
  lineMaterialClearcoat: number
  lineMaterialClearcoatRoughness: number
  lineMaterialTransmission: number
  lineMaterialThickness: number
  lineMaterialIor: number
}

function createPhysicalRibbonMaterial(options: RibbonMaterialOptions) {
  const {
    lineMaterialColor,
    lineMaterialMetalness,
    lineMaterialRoughness,
    lineMaterialClearcoat,
    lineMaterialClearcoatRoughness,
    lineMaterialTransmission,
    lineMaterialThickness,
    lineMaterialIor,
  } = options

  const baseColor = new Color(lineMaterialColor)
  const sheenColor = baseColor.clone().lerp(new Color('#ffffff'), 0.7)
  const transmission = Math.max(0, Math.min(1, lineMaterialTransmission))
  const isTransmissive = transmission > 0.001

  return new MeshPhysicalMaterial({
    color: baseColor,
    vertexColors: true,
    side: DoubleSide,
    transparent: isTransmissive,
    opacity: 1,
    depthTest: true,
    depthWrite: !isTransmissive,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    metalness: Math.max(0, Math.min(1, lineMaterialMetalness)),
    roughness: Math.max(0, Math.min(1, lineMaterialRoughness)),
    clearcoat: Math.max(0, Math.min(1, lineMaterialClearcoat)),
    clearcoatRoughness: Math.max(0, Math.min(1, lineMaterialClearcoatRoughness)),
    transmission,
    thickness: Math.max(0, lineMaterialThickness),
    ior: Math.max(1, Math.min(2.333, lineMaterialIor)),
    sheen: 0.9,
    sheenColor,
    sheenRoughness: Math.max(0.08, Math.min(1, lineMaterialRoughness * 0.65)),
    specularIntensity: 1,
  })
}

function buildRibbonMesh(strip: TrackStrip, lineWidth: number, materialOptions: RibbonMaterialOptions) {
  const pointCount = Math.floor(strip.positions.length / 3)
  if (pointCount < 2) {
    return null
  }

  const halfWidth = Math.max(0.25, lineWidth * 0.5)
  const upA = new Vector3(0, 0, 1)
  const upB = new Vector3(0, 1, 0)
  const pPrev = new Vector3()
  const pCurr = new Vector3()
  const pNext = new Vector3()
  const tangent = new Vector3()
  const side = new Vector3()

  const cumulativeLength: number[] = new Array(pointCount)
  cumulativeLength[0] = 0
  let totalLength = 0
  for (let i = 1; i < pointCount; i += 1) {
    const ix = i * 3
    const px = (i - 1) * 3
    const segment = Math.hypot(
      strip.positions[ix] - strip.positions[px],
      strip.positions[ix + 1] - strip.positions[px + 1],
      strip.positions[ix + 2] - strip.positions[px + 2]
    )
    totalLength += segment
    cumulativeLength[i] = totalLength
  }

  const vertices: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let i = 0; i < pointCount; i += 1) {
    const ci = i * 3
    const pi = Math.max(0, i - 1) * 3
    const ni = Math.min(pointCount - 1, i + 1) * 3
    pCurr.set(strip.positions[ci], strip.positions[ci + 1], strip.positions[ci + 2])
    pPrev.set(strip.positions[pi], strip.positions[pi + 1], strip.positions[pi + 2])
    pNext.set(strip.positions[ni], strip.positions[ni + 1], strip.positions[ni + 2])

    tangent.subVectors(pNext, pPrev)
    if (tangent.lengthSq() < 1e-8) {
      tangent.set(1, 0, 0)
    } else {
      tangent.normalize()
    }

    side.crossVectors(tangent, upA)
    if (side.lengthSq() < 1e-8) {
      side.crossVectors(tangent, upB)
    }
    side.normalize().multiplyScalar(halfWidth)

    const left = pCurr.clone().add(side)
    const right = pCurr.clone().sub(side)
    vertices.push(left.x, left.y, left.z, right.x, right.y, right.z)

    const cr = strip.colors[ci]
    const cg = strip.colors[ci + 1]
    const cb = strip.colors[ci + 2]
    colors.push(cr, cg, cb, cr, cg, cb)

    const u = totalLength > 1e-5 ? cumulativeLength[i] / totalLength : i / Math.max(1, pointCount - 1)
    uvs.push(u, 0, u, 1)

    if (i < pointCount - 1) {
      const a = i * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3
      indices.push(a, c, b, c, d, b)
    }
  }

  if (indices.length === 0) {
    return null
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const mesh = new Mesh(geometry, createPhysicalRibbonMaterial(materialOptions))
  mesh.frustumCulled = false
  return mesh
}

function hashTrackKey(trackKey: string) {
  let hash = 2166136261
  for (let i = 0; i < trackKey.length; i += 1) {
    hash ^= trackKey.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function trackDepthBias(trackKey: string) {
  const normalized = (hashTrackKey(trackKey) % 1024) / 1023
  return (normalized - 0.5) * 0.9
}

export function renderFatLines(options: RenderFatLinesOptions) {
  const {
    runtimeLayer,
    center,
    nowSec,
    step,
    mirrorX,
    mirrorY,
    rotationalRepeats,
    rotationOffsetDeg,
    strokeWidthMode,
    baseLineWidth,
    lineWidthBoost,
    dashedLines,
    dashLength,
    dashGap,
    lineMaterialColor,
    lineMaterialMetalness,
    lineMaterialRoughness,
    lineMaterialClearcoat,
    lineMaterialClearcoatRoughness,
    lineMaterialTransmission,
    lineMaterialThickness,
    lineMaterialIor,
  } = options

  const layer = runtimeLayer.layer
  const widthRange = Math.max(0, lineWidthBoost)
  const bucketCount = widthRange > 0.001 ? 5 : 1
  const materialOptions: RibbonMaterialOptions = {
    lineMaterialColor,
    lineMaterialMetalness,
    lineMaterialRoughness,
    lineMaterialClearcoat,
    lineMaterialClearcoatRoughness,
    lineMaterialTransmission,
    lineMaterialThickness,
    lineMaterialIor,
  }
  const bucketTracks: Array<Map<string, Track>> = Array.from({ length: bucketCount }, () => new Map())
  const previousBucketByTrack = new Map<string, number>()
  const depthBiasByTrack = new Map<string, number>()
  const dashCycle = Math.max(1, dashLength + dashGap)

  for (let i = 0; i < runtimeLayer.trail.length; i += Math.max(1, step)) {
    const current = runtimeLayer.trail[i]
    const offsets = buildLineOffsets(layer, current.index, runtimeLayer.paramU)
    const linePairs = offsets.length
    const style = colorForPoint(current, layer, nowSec)
    const rgb = new Color(`hsl(${style.hue}, 90%, 70%)`)
    const computedWidth = lineWidthForPoint(current, strokeWidthMode, baseLineWidth, lineWidthBoost)
    const bucketIndex =
      bucketCount === 1
        ? 0
        : Math.max(
            0,
            Math.min(
              bucketCount - 1,
              Math.round(((computedWidth - baseLineWidth) / Math.max(0.001, widthRange)) * (bucketCount - 1))
            )
          )

    for (let line = 0; line < linePairs; line += 1) {
      const points = buildSymmetryVariants(
        { x: current.x + offsets[line].x, y: current.y + offsets[line].y },
        center,
        mirrorX,
        mirrorY,
        rotationalRepeats,
        rotationOffsetDeg
      )

      for (let pair = 0; pair < points.length; pair += 1) {
        const trackKey = `${line}:${pair}`
        const wasBucket = previousBucketByTrack.get(trackKey)
        const dashPhase = ((current.index % dashCycle) + dashCycle) % dashCycle
        const inDash = !dashedLines || dashPhase <= dashLength
        const shouldBreak = !current.connected || !inDash || wasBucket === undefined || wasBucket !== bucketIndex
        const bucketTrackMap = bucketTracks[bucketIndex]
        let track = bucketTrackMap.get(trackKey)
        if (!track) {
          track = { positions: [], colors: [], strips: [] }
          bucketTrackMap.set(trackKey, track)
        }

        if (shouldBreak && track.positions.length >= 6) {
          track.strips.push({ positions: track.positions, colors: track.colors })
          track.positions = []
          track.colors = []
        }
        if (!inDash) {
          previousBucketByTrack.delete(trackKey)
          continue
        }

        if (!depthBiasByTrack.has(trackKey)) {
          depthBiasByTrack.set(trackKey, trackDepthBias(trackKey))
        }
        const zBias = depthBiasByTrack.get(trackKey) ?? 0
        track.positions.push(points[pair].x - center.x, center.y - points[pair].y, current.z + zBias)
        track.colors.push(rgb.r, rgb.g, rgb.b)
        previousBucketByTrack.set(trackKey, bucketIndex)
      }
    }
  }

  const nodes: Mesh[] = []
  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const widthFactor = bucketCount === 1 ? 0 : bucket / (bucketCount - 1)
    const lineWidth = baseLineWidth + widthRange * widthFactor

    for (const track of bucketTracks[bucket].values()) {
      if (track.positions.length >= 6) {
        track.strips.push({ positions: track.positions, colors: track.colors })
      }
      for (const strip of track.strips) {
        const ribbonMesh = buildRibbonMesh(strip, lineWidth, materialOptions)
        if (ribbonMesh) {
          nodes.push(ribbonMesh)
        }
      }
    }
  }

  return nodes
}
