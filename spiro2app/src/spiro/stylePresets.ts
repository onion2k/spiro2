import type { GlobalSettings } from './renderers/defaults'
import { MATERIAL_PRESETS } from './renderers/materialPresets'
import type { LineMaterialPresetId } from './renderers/types'
import type { LayerConfig } from './types'

type StyleLayerPatch = Pick<
  LayerConfig,
  'multiLineCount' | 'multiLineMotion' | 'multiLineSpread' | 'multiLineMotionSpeed' | 'colorMode' | 'paletteId' | 'hueLock' | 'baseHue'
>

type StyleGlobalPatch = Partial<GlobalSettings>

export type StylePreset = {
  id: string
  name: string
  description: string
  global: StyleGlobalPatch
  layer: Partial<StyleLayerPatch>
}

function withMaterialPreset(presetId: Exclude<LineMaterialPresetId, 'custom'>): StyleGlobalPatch {
  return {
    lineMaterialPreset: presetId,
    ...MATERIAL_PRESETS[presetId],
  }
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'neon-vortex',
    name: 'Neon Vortex',
    description: 'Fast orbiting copies with bright neon tint and lively modulation.',
    global: {
      rotationalRepeats: 3,
      rotationOffsetDeg: 8,
      phaseMod: 0.65,
      frequencyMod: 0.45,
      amplitudeMod: 0.35,
      noiseMode: 'flow',
      noiseAmount: 0.16,
      noiseFrequency: 1.1,
      noiseSpeed: 0.55,
      noiseOctaves: 4,
      baseLineWidth: 2.4,
      lineWidthBoost: 5.4,
      ...withMaterialPreset('chrome'),
      lineMaterialColor: '#7dd3fc',
    },
    layer: {
      multiLineCount: 4,
      multiLineMotion: 'orbit',
      multiLineSpread: 18,
      multiLineMotionSpeed: 1.6,
      colorMode: 'palette',
      paletteId: 'neon',
      hueLock: false,
      baseHue: 210,
    },
  },
  {
    id: 'sunset-ribbon',
    name: 'Sunset Ribbon',
    description: 'Softer copies and warm gradients with gentle motion.',
    global: {
      rotationalRepeats: 2,
      rotationOffsetDeg: 4,
      phaseMod: 0.25,
      frequencyMod: 0.2,
      amplitudeMod: 0.15,
      noiseMode: 'grain',
      noiseAmount: 0.08,
      noiseFrequency: 0.75,
      noiseSpeed: 0.28,
      baseLineWidth: 3,
      lineWidthBoost: 3.8,
      ...withMaterialPreset('satin-plastic'),
      lineMaterialColor: '#ffb089',
    },
    layer: {
      multiLineCount: 3,
      multiLineMotion: 'orbit',
      multiLineSpread: 12,
      multiLineMotionSpeed: 0.9,
      colorMode: 'palette',
      paletteId: 'sunset',
      hueLock: false,
      baseHue: 20,
    },
  },
  {
    id: 'ocean-current',
    name: 'Ocean Current',
    description: 'Dense flowing copies with cool hues and fluid modulation.',
    global: {
      rotationalRepeats: 4,
      rotationOffsetDeg: -6,
      phaseMod: 0.45,
      frequencyMod: 0.55,
      amplitudeMod: 0.3,
      noiseMode: 'flow',
      noiseAmount: 0.22,
      noiseFrequency: 1.35,
      noiseSpeed: 0.68,
      noiseOctaves: 5,
      baseLineWidth: 2.2,
      lineWidthBoost: 4.6,
      ...withMaterialPreset('frosted-glass'),
      lineMaterialColor: '#93c5fd',
    },
    layer: {
      multiLineCount: 5,
      multiLineMotion: 'random',
      multiLineSpread: 22,
      multiLineMotionSpeed: 1.2,
      colorMode: 'palette',
      paletteId: 'ocean',
      hueLock: false,
      baseHue: 205,
    },
  },
  {
    id: 'forest-pulse',
    name: 'Forest Pulse',
    description: 'Organic pulse with earthy tones and modest copy motion.',
    global: {
      rotationalRepeats: 2,
      rotationOffsetDeg: 0,
      phaseMod: 0.5,
      frequencyMod: 0.32,
      amplitudeMod: 0.42,
      noiseMode: 'grain',
      noiseAmount: 0.11,
      noiseFrequency: 0.95,
      noiseSpeed: 0.33,
      baseLineWidth: 2.7,
      lineWidthBoost: 4.1,
      ...withMaterialPreset('matte-ribbon'),
      lineMaterialColor: '#9ae6b4',
    },
    layer: {
      multiLineCount: 3,
      multiLineMotion: 'fixed',
      multiLineSpread: 14,
      multiLineMotionSpeed: 0.7,
      colorMode: 'palette',
      paletteId: 'forest',
      hueLock: false,
      baseHue: 125,
    },
  },
  {
    id: 'candy-burst',
    name: 'Candy Burst',
    description: 'High-energy copy motion and saturated candy palette colors.',
    global: {
      rotationalRepeats: 6,
      rotationOffsetDeg: 3,
      phaseMod: 1.05,
      frequencyMod: 0.78,
      amplitudeMod: 0.62,
      noiseMode: 'off',
      noiseAmount: 0,
      baseLineWidth: 2,
      lineWidthBoost: 5.8,
      ...withMaterialPreset('brushed-metal'),
      lineMaterialColor: '#f9a8d4',
    },
    layer: {
      multiLineCount: 6,
      multiLineMotion: 'random',
      multiLineSpread: 24,
      multiLineMotionSpeed: 2,
      colorMode: 'palette',
      paletteId: 'candy',
      hueLock: false,
      baseHue: 315,
    },
  },
]
