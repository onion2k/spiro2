export type ParametricFn = (t: number, u: number, R: number, r: number, d: number) => { x: number; y: number; z: number }
export type MultiLineMotionMode = 'fixed' | 'orbit' | 'random'
export type ColorMode = 'hue-cycle' | 'age' | 'speed' | 'curvature' | 'palette'
export type StrokeWidthMode = 'fixed' | 'speed' | 'curvature'
export type NoiseMode = 'off' | 'grain' | 'flow'
export type PaletteId = 'neon' | 'sunset' | 'ocean' | 'forest' | 'candy'
export type PathGeneratorKind = 'parametric' | 'lissajous' | 'strange-attractor'
export type AttractorEquation =
  | 'lorenz'
  | 'rossler'
  | 'chen'
  | 'thomas'
  | 'halvorsen'
  | 'aizawa'
  | 'lu-chen'
  | 'rabinovich-fabrikant'
export type Point = { x: number; y: number }
export type Point3 = { x: number; y: number; z: number }

export type LayerConfig = {
  id: string
  name: string
  visible: boolean
  exprX: string
  exprY: string
  exprZ: string
  generatorKind: PathGeneratorKind
  lissajousAx: number
  lissajousAy: number
  lissajousAz: number
  lissajousFx: number
  lissajousFy: number
  lissajousFz: number
  lissajousPhaseX: number
  lissajousPhaseY: number
  lissajousPhaseZ: number
  lissajousUMixX: number
  lissajousUMixY: number
  lissajousUMixZ: number
  attractorSigma: number
  attractorRho: number
  attractorBeta: number
  attractorStepScale: number
  attractorInitialX: number
  attractorInitialY: number
  attractorInitialZ: number
  attractorScale: number
  attractorWarmupSteps: number
  attractorEquation: AttractorEquation
  R: number
  r: number
  d: number
  speed: number
  uSpeed: number
  lineLifetime: number
  lineForever: boolean
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

export type Phase2 = {
  t: number
  u: number
}

export type PathGeneratorPhase = {
  base: Phase2
  sample: Phase2
}

export type PathGeneratorSample = {
  point: Point3
  phase: PathGeneratorPhase
}

export type PathGeneratorState = Record<string, number>

export type PathGenerator = {
  kind: string
  createState?: () => PathGeneratorState
  step: (args: {
    layer: LayerConfig
    dt: number
    state: PathGeneratorState
    modulatePhase: (base: Phase2) => Phase2
  }) => PathGeneratorSample | null
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
  generatorKind?: PathGeneratorKind
  lissajousAx?: number
  lissajousAy?: number
  lissajousAz?: number
  lissajousFx?: number
  lissajousFy?: number
  lissajousFz?: number
  lissajousPhaseX?: number
  lissajousPhaseY?: number
  lissajousPhaseZ?: number
  lissajousUMixX?: number
  lissajousUMixY?: number
  lissajousUMixZ?: number
  attractorSigma?: number
  attractorRho?: number
  attractorBeta?: number
  attractorStepScale?: number
  attractorInitialX?: number
  attractorInitialY?: number
  attractorInitialZ?: number
  attractorScale?: number
  attractorWarmupSteps?: number
  attractorEquation?: AttractorEquation
  R: number
  r: number
  d: number
  speed: number
  uSpeed?: number
  lineLifetime: number
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
