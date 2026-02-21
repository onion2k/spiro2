import type { LayerConfig, NoiseMode, StrokeWidthMode } from '../types'

export type ThreeCameraMode = 'orthographic' | 'perspective'
export type ThreeLineRenderMode = 'fat-lines' | 'instanced-sprites'

export type CompiledLayer = {
  id: string
  fn: ((t: number, u: number, R: number, r: number, d: number) => { x: number; y: number; z: number }) | null
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
  threeSpriteSize: number
  threeSpriteSoftness: number
  threeCameraMode: ThreeCameraMode
  threeLineRenderMode: ThreeLineRenderMode
  maxTrailPointsPerLayer: number
  adaptiveQuality: boolean
  maxAdaptiveStep: number
}

export type RendererHudStats = {
  fps: number
  frameMs: number
  drawCalls: number
  renderedObjects: number
  trailPoints: number
  pointVertices: number
  instancedSprites: number
  lineObjects: number
  threeCameraMode: ThreeCameraMode
  threeLineRenderMode: ThreeLineRenderMode
}
