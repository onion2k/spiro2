import { Color } from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

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
}

export function renderFatLines(options: RenderFatLinesOptions) {
  const {
    runtimeLayer,
    center,
    nowSec,
    width,
    height,
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
  } = options

  const layer = runtimeLayer.layer
  const widthRange = Math.max(0, lineWidthBoost)
  const bucketCount = widthRange > 0.001 ? 5 : 1
  const bucketPositions: number[][] = Array.from({ length: bucketCount }, () => [])
  const bucketColors: number[][] = Array.from({ length: bucketCount }, () => [])

  for (let i = Math.max(step, 1); i < runtimeLayer.trail.length; i += step) {
    const current = runtimeLayer.trail[i]
    if (!current.connected) {
      continue
    }
    const prior = runtimeLayer.trail[i - step]
    const fromOffsets = buildLineOffsets(layer, prior.index, runtimeLayer.paramU)
    const toOffsets = buildLineOffsets(layer, current.index, runtimeLayer.paramU)
    const linePairs = Math.min(fromOffsets.length, toOffsets.length)
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
    const linePositions = bucketPositions[bucketIndex]
    const lineColors = bucketColors[bucketIndex]

    for (let line = 0; line < linePairs; line += 1) {
      const from = buildSymmetryVariants(
        { x: prior.x + fromOffsets[line].x, y: prior.y + fromOffsets[line].y },
        center,
        mirrorX,
        mirrorY,
        rotationalRepeats,
        rotationOffsetDeg
      )
      const to = buildSymmetryVariants(
        { x: current.x + toOffsets[line].x, y: current.y + toOffsets[line].y },
        center,
        mirrorX,
        mirrorY,
        rotationalRepeats,
        rotationOffsetDeg
      )
      const pairs = Math.min(from.length, to.length)
      for (let pair = 0; pair < pairs; pair += 1) {
        linePositions.push(from[pair].x - center.x, center.y - from[pair].y, prior.z)
        linePositions.push(to[pair].x - center.x, center.y - to[pair].y, current.z)
        lineColors.push(rgb.r, rgb.g, rgb.b)
        lineColors.push(rgb.r, rgb.g, rgb.b)
      }
    }
  }

  const nodes: LineSegments2[] = []
  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    if (bucketPositions[bucket].length === 0) {
      continue
    }
    const widthFactor = bucketCount === 1 ? 0 : bucket / (bucketCount - 1)
    const linePixelWidth = baseLineWidth + widthRange * widthFactor

    const lineGeometry = new LineSegmentsGeometry()
    lineGeometry.setPositions(bucketPositions[bucket])
    lineGeometry.setColors(bucketColors[bucket])

    const lineMaterial = new LineMaterial({
      color: 0xffffff,
      linewidth: Math.max(0.5, linePixelWidth),
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      dashed: dashedLines,
      dashSize: Math.max(1, dashLength),
      gapSize: Math.max(0, dashGap),
    })
    lineMaterial.resolution.set(width, height)

    const fatLine = new LineSegments2(lineGeometry, lineMaterial)
    if (dashedLines) {
      fatLine.computeLineDistances()
    }
    nodes.push(fatLine)
  }
  return nodes
}
