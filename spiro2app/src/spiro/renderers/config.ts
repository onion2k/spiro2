import type { SpiroRendererConfig } from './types'

type RuntimeConfig = Pick<SpiroRendererConfig, 'layers' | 'compiledLayers' | 'isPaused' | 'resetTick' | 'recenterTick'>
type SettingsConfig = Omit<SpiroRendererConfig, keyof RuntimeConfig>

type BuildRendererConfigInput = RuntimeConfig & {
  settings: SettingsConfig
}

export function buildRendererConfig(input: BuildRendererConfigInput): SpiroRendererConfig {
  const { layers, compiledLayers, isPaused, resetTick, recenterTick, settings } = input
  return {
    layers,
    compiledLayers,
    isPaused,
    resetTick,
    recenterTick,
    ...settings,
  }
}
