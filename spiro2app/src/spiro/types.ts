export type ParametricFn = (t: number, u: number, R: number, r: number, d: number) => { x: number; y: number; z: number }
export type DrawMode = 'lines' | 'points' | 'lines-points'
export type MultiLineMotionMode = 'fixed' | 'orbit' | 'random'
export type ColorMode = 'hue-cycle' | 'age' | 'speed' | 'curvature' | 'palette'
export type StrokeWidthMode = 'fixed' | 'speed' | 'curvature'
export type NoiseMode = 'off' | 'grain' | 'flow'
export type PaletteId = 'neon' | 'sunset' | 'ocean' | 'forest' | 'candy'
export type Point = { x: number; y: number }

export type LayerConfig = {
  id: string
  name: string
  visible: boolean
  exprX: string
  exprY: string
  exprZ: string
  R: number
  r: number
  d: number
  zScale: number
  speed: number
  uSpeed: number
  lineLifetime: number
  lineForever: boolean
  drawMode: DrawMode
  pointSize: number
  multiLineCount: number
  multiLineMotion: MultiLineMotionMode
  multiLineSpread: number
  multiLineMotionSpeed: number
  colorMode: ColorMode
  paletteId: PaletteId
  hueLock: boolean
  baseHue: number
}

export type TrailPoint = {
  x: number
  y: number
  z: number
  drawnAt: number
  hue: number
  connected: boolean
  speedNorm: number
  curvatureNorm: number
  index: number
}

export type Preset = {
  id: string
  name: string
  exprX: string
  exprY: string
  exprZ?: string
  R: number
  r: number
  d: number
  zScale?: number
  speed: number
  uSpeed?: number
  lineLifetime: number
  drawMode: DrawMode
  pointSize: number
}

export type LayerPresetData = Omit<LayerConfig, 'id' | 'name' | 'visible'>

export type CustomPreset = {
  id: string
  name: string
  data: LayerPresetData
  createdAt: string
  updatedAt: string
}

export type CustomPresetStoreV1 = {
  version: 1
  presets: CustomPreset[]
}

export type EquationExample = {
  id: string
  name: string
  exprX: string
  exprY: string
  exprZ?: string
}
