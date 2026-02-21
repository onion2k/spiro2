import { BufferAttribute, BufferGeometry, Color, Points, PointsMaterial } from 'three'

import { buildLineOffsets, buildSymmetryVariants, colorForPoint, type RuntimeLayer } from '../runtime'

type RenderPointsOptions = {
  runtimeLayer: RuntimeLayer
  center: { x: number; y: number }
  nowSec: number
  step: number
  mirrorX: boolean
  mirrorY: boolean
  rotationalRepeats: number
  rotationOffsetDeg: number
}

export function renderPoints(options: RenderPointsOptions) {
  const { runtimeLayer, center, nowSec, step, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg } = options
  const layer = runtimeLayer.layer
  const pointPositions: number[] = []
  const pointColors: number[] = []

  for (let i = 0; i < runtimeLayer.trail.length; i += step) {
    const point = runtimeLayer.trail[i]
    const offsets = buildLineOffsets(layer, point.index, runtimeLayer.paramU)
    const style = colorForPoint(point, layer, nowSec)
    const rgb = new Color(`hsl(${style.hue}, 95%, 72%)`)
    for (const offset of offsets) {
      const copies = buildSymmetryVariants(
        { x: point.x + offset.x, y: point.y + offset.y },
        center,
        mirrorX,
        mirrorY,
        rotationalRepeats,
        rotationOffsetDeg
      )
      for (const copy of copies) {
        pointPositions.push(copy.x - center.x, center.y - copy.y, point.z)
        pointColors.push(rgb.r, rgb.g, rgb.b)
      }
    }
  }

  if (pointPositions.length === 0) {
    return null
  }
  const pointGeometry = new BufferGeometry()
  pointGeometry.setAttribute('position', new BufferAttribute(new Float32Array(pointPositions), 3))
  pointGeometry.setAttribute('color', new BufferAttribute(new Float32Array(pointColors), 3))
  const pointMaterial = new PointsMaterial({
    size: Math.max(1, layer.pointSize * 2),
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
  })
  return new Points(pointGeometry, pointMaterial)
}
