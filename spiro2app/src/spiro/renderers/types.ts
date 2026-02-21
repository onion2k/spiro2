import type { RefObject } from 'react'

import type { LayerConfig, NoiseMode, StrokeWidthMode } from '../types'

export type RendererType = 'canvas2d' | 'svg' | 'three'

export type CompiledLayer = {
  id: string
  fn: ((t: number, u: number, R: number, r: number, d: number) => { x: number; y: number }) | null
}

export type SpiroRendererConfig = {
  layers: LayerConfig[]
  compiledLayers: CompiledLayer[]
  isPaused: boolean
  resetTick: number
  mirrorX: boolean
  mirrorY: boolean
  rotationalRepeats: number
  rotationOffsetDeg: number
  amplitudeMod: number
  frequencyMod: number
  phaseMod: number
  noiseMode: NoiseMode
  noiseAmount: number
  noiseFrequency: number
  noiseSpeed: number
  noiseOctaves: number
  noiseSeed: number
  strokeWidthMode: StrokeWidthMode
  baseLineWidth: number
  lineWidthBoost: number
  dashedLines: boolean
  dashLength: number
  dashGap: number
  glowAmount: number
  maxTrailPointsPerLayer: number
  adaptiveQuality: boolean
  maxAdaptiveStep: number
}

export type SpiroRendererOptions = SpiroRendererConfig & {
  rendererType: RendererType
  canvasRef: RefObject<HTMLCanvasElement | null>
  svgRef: RefObject<SVGSVGElement | null>
  threeContainerRef: RefObject<HTMLDivElement | null>
}
