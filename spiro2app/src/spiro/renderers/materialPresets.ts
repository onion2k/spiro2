import type { GlobalSettings } from './defaults'
import type { LineMaterialPresetId } from './types'

export type MaterialPresetValues = Pick<
  GlobalSettings,
  | 'lineMaterialColor'
  | 'lineMaterialMetalness'
  | 'lineMaterialRoughness'
  | 'lineMaterialClearcoat'
  | 'lineMaterialClearcoatRoughness'
  | 'lineMaterialTransmission'
  | 'lineMaterialThickness'
  | 'lineMaterialIor'
>

export const MATERIAL_PRESETS: Record<Exclude<LineMaterialPresetId, 'custom'>, MaterialPresetValues> = {
  'matte-ribbon': {
    lineMaterialColor: '#f1f1f1',
    lineMaterialMetalness: 0.02,
    lineMaterialRoughness: 0.9,
    lineMaterialClearcoat: 0.02,
    lineMaterialClearcoatRoughness: 0.75,
    lineMaterialTransmission: 0,
    lineMaterialThickness: 0.3,
    lineMaterialIor: 1.32,
  },
  'satin-plastic': {
    lineMaterialColor: '#f7f4ee',
    lineMaterialMetalness: 0,
    lineMaterialRoughness: 0.35,
    lineMaterialClearcoat: 0.32,
    lineMaterialClearcoatRoughness: 0.28,
    lineMaterialTransmission: 0,
    lineMaterialThickness: 0.6,
    lineMaterialIor: 1.46,
  },
  'brushed-metal': {
    lineMaterialColor: '#c9d0da',
    lineMaterialMetalness: 0.88,
    lineMaterialRoughness: 0.48,
    lineMaterialClearcoat: 0.08,
    lineMaterialClearcoatRoughness: 0.45,
    lineMaterialTransmission: 0,
    lineMaterialThickness: 0.5,
    lineMaterialIor: 1.55,
  },
  chrome: {
    lineMaterialColor: '#ffffff',
    lineMaterialMetalness: 1,
    lineMaterialRoughness: 0.08,
    lineMaterialClearcoat: 0.24,
    lineMaterialClearcoatRoughness: 0.08,
    lineMaterialTransmission: 0,
    lineMaterialThickness: 0.5,
    lineMaterialIor: 1.6,
  },
  'frosted-glass': {
    lineMaterialColor: '#e9f6ff',
    lineMaterialMetalness: 0,
    lineMaterialRoughness: 0.22,
    lineMaterialClearcoat: 0.18,
    lineMaterialClearcoatRoughness: 0.3,
    lineMaterialTransmission: 0.78,
    lineMaterialThickness: 1.15,
    lineMaterialIor: 1.5,
  },
}
