import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import './App.css'
import { ControlPanel } from './components/control-panel/ControlPanel'

import { compileParametric } from './spiro/equation'
import { buildRendererConfig } from './spiro/renderers/config'
import { DEFAULT_GLOBAL_SETTINGS } from './spiro/renderers/defaults'
import type { GlobalSettings } from './spiro/renderers/defaults'
import { STYLE_PRESETS } from './spiro/stylePresets'
import {
  createLayerFromPreset,
  CUSTOM_PRESET_STORAGE_KEY,
  EQUATION_EXAMPLES,
  PRESETS,
} from './spiro/constants'
import { parseCustomPresetPayload, toLayerPresetData } from './spiro/customPresets'
import type {
  CustomPreset,
  CustomPresetStoreV1,
  LayerConfig,
  LayerPresetData,
} from './spiro/types'

const ThreeSurface = lazy(() => import('./spiro/renderers/ThreeSurface'))
const NO_STYLE_PRESET_ID = 'none'

function App() {
  const [selectedPresetId, setSelectedPresetId] = useState(`builtin:${PRESETS[0].id}`)
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    if (typeof window === 'undefined') {
      return []
    }
    try {
      const raw = window.localStorage.getItem(CUSTOM_PRESET_STORAGE_KEY)
      if (!raw) {
        return []
      }
      return parseCustomPresetPayload(JSON.parse(raw))
    } catch {
      return []
    }
  })
  const [customPresetName, setCustomPresetName] = useState('My Preset')
  const [layers, setLayers] = useState<LayerConfig[]>([
    createLayerFromPreset(PRESETS[0], 'layer-1', 'Layer 1'),
  ])
  const [equationExampleId, setEquationExampleId] = useState('')
  const [activeEquation, setActiveEquation] = useState<'x' | 'y' | 'z'>('x')
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(() => ({ ...DEFAULT_GLOBAL_SETTINGS }))
  const [selectedStylePresetId, setSelectedStylePresetId] = useState(NO_STYLE_PRESET_ID)

  const [isPaused, setIsPaused] = useState(false)
  const [resetTick, setResetTick] = useState(0)
  const [recenterTick, setRecenterTick] = useState(0)
  const [uiMinimized, setUiMinimized] = useState(false)
  const [controlTab, setControlTab] = useState<'pattern-basic' | 'pattern-advanced' | 'rendering' | 'presets'>('pattern-basic')
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const clearStyleGlobalPatch: Partial<GlobalSettings> = {
    rotationalRepeats: DEFAULT_GLOBAL_SETTINGS.rotationalRepeats,
    rotationOffsetDeg: DEFAULT_GLOBAL_SETTINGS.rotationOffsetDeg,
    phaseMod: DEFAULT_GLOBAL_SETTINGS.phaseMod,
    frequencyMod: DEFAULT_GLOBAL_SETTINGS.frequencyMod,
    amplitudeMod: DEFAULT_GLOBAL_SETTINGS.amplitudeMod,
    noiseMode: DEFAULT_GLOBAL_SETTINGS.noiseMode,
    noiseAmount: DEFAULT_GLOBAL_SETTINGS.noiseAmount,
    noiseFrequency: DEFAULT_GLOBAL_SETTINGS.noiseFrequency,
    noiseSpeed: DEFAULT_GLOBAL_SETTINGS.noiseSpeed,
    noiseOctaves: DEFAULT_GLOBAL_SETTINGS.noiseOctaves,
    baseLineWidth: DEFAULT_GLOBAL_SETTINGS.baseLineWidth,
    lineWidthBoost: DEFAULT_GLOBAL_SETTINGS.lineWidthBoost,
    lineMaterialPreset: DEFAULT_GLOBAL_SETTINGS.lineMaterialPreset,
    lineMaterialColor: DEFAULT_GLOBAL_SETTINGS.lineMaterialColor,
    lineMaterialMetalness: DEFAULT_GLOBAL_SETTINGS.lineMaterialMetalness,
    lineMaterialRoughness: DEFAULT_GLOBAL_SETTINGS.lineMaterialRoughness,
    lineMaterialClearcoat: DEFAULT_GLOBAL_SETTINGS.lineMaterialClearcoat,
    lineMaterialClearcoatRoughness: DEFAULT_GLOBAL_SETTINGS.lineMaterialClearcoatRoughness,
    lineMaterialTransmission: DEFAULT_GLOBAL_SETTINGS.lineMaterialTransmission,
    lineMaterialThickness: DEFAULT_GLOBAL_SETTINGS.lineMaterialThickness,
    lineMaterialIor: DEFAULT_GLOBAL_SETTINGS.lineMaterialIor,
  }
  const clearStyleLayerPatch: Partial<LayerConfig> = {
    multiLineCount: 1,
    multiLineMotion: 'fixed',
    multiLineSpread: 14,
    multiLineMotionSpeed: 1,
    colorMode: 'hue-cycle',
    paletteId: 'neon',
    hueLock: false,
    baseHue: 210,
  }
  const updateGlobalSetting = <K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]) => {
    setGlobalSettings((current) => ({ ...current, [key]: value }))
  }

  const applyStylePreset = (presetId: string) => {
    if (presetId === NO_STYLE_PRESET_ID) {
      setSelectedStylePresetId(NO_STYLE_PRESET_ID)
      setGlobalSettings((current) => ({ ...current, ...clearStyleGlobalPatch }))
      setLayers((current) => current.map((layer) => ({ ...layer, ...clearStyleLayerPatch })))
      setResetTick((value) => value + 1)
      return
    }
    const preset = STYLE_PRESETS.find((entry) => entry.id === presetId)
    if (!preset) {
      return
    }
    setSelectedStylePresetId(preset.id)
    setGlobalSettings((current) => ({ ...current, ...preset.global }))
    setLayers((current) => current.map((layer) => ({ ...layer, ...preset.layer })))
    setResetTick((value) => value + 1)
  }

  const activeLayer = useMemo(
    () => layers[0],
    [layers]
  )
  const compiledLayers = useMemo(
    () =>
      layers.map((layer) => ({
        id: layer.id,
        ...compileParametric(layer.exprX, layer.exprY, layer.exprZ),
      })),
    [layers]
  )
  const activeLayerError = useMemo(
    () => compiledLayers.find((entry) => entry.id === activeLayer?.id)?.error ?? '',
    [compiledLayers, activeLayer]
  )

  const parseNumber = (value: string, fallback: number) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  const activeCustomPreset = useMemo(() => {
    if (!selectedPresetId.startsWith('custom:')) {
      return null
    }
    const id = selectedPresetId.replace('custom:', '')
    return customPresets.find((preset) => preset.id === id) ?? null
  }, [selectedPresetId, customPresets])

  const applyLayerPresetData = (data: LayerPresetData) => {
    updateActiveLayer(data)
    setEquationExampleId('')
    setIsPaused(false)
    setResetTick((value) => value + 1)
  }

  const applyCustomPreset = (id: string) => {
    const preset = customPresets.find((entry) => entry.id === id)
    if (!preset) {
      return
    }
    setSelectedPresetId(`custom:${id}`)
    setCustomPresetName(preset.name)
    applyLayerPresetData(preset.data)
  }

  const saveNewCustomPreset = () => {
    if (!activeLayer) {
      return
    }
    const trimmedName = customPresetName.trim() || `Preset ${customPresets.length + 1}`
    const now = new Date().toISOString()
    const id = `cp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    const preset: CustomPreset = {
      id,
      name: trimmedName,
      data: toLayerPresetData(activeLayer),
      createdAt: now,
      updatedAt: now,
    }
    setCustomPresets((existing) => [...existing, preset])
    setSelectedPresetId(`custom:${id}`)
  }

  const updateCurrentCustomPreset = () => {
    if (!activeLayer || !activeCustomPreset) {
      return
    }
    const now = new Date().toISOString()
    setCustomPresets((existing) =>
      existing.map((preset) =>
        preset.id === activeCustomPreset.id
          ? {
              ...preset,
              name: customPresetName.trim() || preset.name,
              data: toLayerPresetData(activeLayer),
              updatedAt: now,
            }
          : preset
      )
    )
  }

  const renameCurrentCustomPreset = () => {
    if (!activeCustomPreset) {
      return
    }
    const trimmedName = customPresetName.trim()
    if (!trimmedName) {
      return
    }
    setCustomPresets((existing) =>
      existing.map((preset) =>
        preset.id === activeCustomPreset.id ? { ...preset, name: trimmedName, updatedAt: new Date().toISOString() } : preset
      )
    )
  }

  const deleteCurrentCustomPreset = () => {
    if (!activeCustomPreset) {
      return
    }
    const remaining = customPresets.filter((preset) => preset.id !== activeCustomPreset.id)
    setCustomPresets(remaining)
    applyPreset(PRESETS[0].id)
  }

  const exportCustomPresets = async () => {
    const payload: CustomPresetStoreV1 = { version: 1, presets: customPresets }
    const json = JSON.stringify(payload, null, 2)
    try {
      await navigator.clipboard.writeText(json)
      window.alert('Custom presets copied to clipboard as JSON.')
    } catch {
      window.prompt('Copy JSON:', json)
    }
  }

  const importCustomPresets = () => {
    const pasted = window.prompt('Paste preset JSON (will replace current custom presets):')
    if (!pasted) {
      return
    }
    try {
      const parsed = JSON.parse(pasted)
      const imported = parseCustomPresetPayload(parsed)
      setCustomPresets(imported)
      if (imported.length > 0) {
        setSelectedPresetId(`custom:${imported[0].id}`)
        setCustomPresetName(imported[0].name)
        applyLayerPresetData(imported[0].data)
      } else {
        applyPreset(PRESETS[0].id)
      }
    } catch (error) {
      if (error instanceof Error) {
        window.alert(`Import failed: ${error.message}`)
      } else {
        window.alert('Import failed: invalid JSON.')
      }
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const payload: CustomPresetStoreV1 = { version: 1, presets: customPresets }
    window.localStorage.setItem(CUSTOM_PRESET_STORAGE_KEY, JSON.stringify(payload))
  }, [customPresets])

  useEffect(() => {
    if (activeCustomPreset) {
      setCustomPresetName(activeCustomPreset.name)
    }
  }, [activeCustomPreset])

  const updateActiveLayer = (patch: Partial<LayerConfig>) => {
    setLayers((existing) => (existing[0] ? [{ ...existing[0], ...patch }] : existing))
  }

  const applyEquationExample = (id: string) => {
    setEquationExampleId(id)
    const example = EQUATION_EXAMPLES.find((entry) => entry.id === id)
    if (!example) {
      return
    }
    updateActiveLayer({ exprX: example.exprX, exprY: example.exprY, exprZ: example.exprZ ?? '0' })
    setResetTick((value) => value + 1)
  }

  const insertSnippet = (snippet: string) => {
    if (!activeLayer) {
      return
    }
    if (activeEquation === 'x') {
      updateActiveLayer({ exprX: `${activeLayer.exprX}${snippet}` })
    } else if (activeEquation === 'y') {
      updateActiveLayer({ exprY: `${activeLayer.exprY}${snippet}` })
    } else {
      updateActiveLayer({ exprZ: `${activeLayer.exprZ}${snippet}` })
    }
  }

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find((entry) => entry.id === presetId)
    if (!preset) {
      return
    }

    setSelectedPresetId(`builtin:${preset.id}`)
    setCustomPresetName('My Preset')
    applyLayerPresetData({
      exprX: preset.exprX,
      exprY: preset.exprY,
      exprZ: preset.exprZ ?? '0',
      R: preset.R,
      r: preset.r,
      d: preset.d,
      zScale: preset.zScale ?? (activeLayer?.zScale ?? 0.6),
      speed: preset.speed,
      uSpeed: preset.uSpeed ?? 0.4,
      lineLifetime: preset.lineLifetime,
      lineForever: true,
      pointSize: preset.pointSize,
      multiLineCount: activeLayer?.multiLineCount ?? 1,
      multiLineMotion: activeLayer?.multiLineMotion ?? 'fixed',
      multiLineSpread: activeLayer?.multiLineSpread ?? 14,
      multiLineMotionSpeed: activeLayer?.multiLineMotionSpeed ?? 1,
      colorMode: activeLayer?.colorMode ?? 'hue-cycle',
      paletteId: activeLayer?.paletteId ?? 'neon',
      hueLock: activeLayer?.hueLock ?? false,
      baseHue: activeLayer?.baseHue ?? 210,
    })
  }

  const onPresetSelect = (value: string) => {
    if (value.startsWith('builtin:')) {
      applyPreset(value.replace('builtin:', ''))
      return
    }
    if (value.startsWith('custom:')) {
      applyCustomPreset(value.replace('custom:', ''))
    }
  }

  const rendererConfig = useMemo(
    () =>
      buildRendererConfig({
        layers,
        compiledLayers,
        isPaused,
        resetTick,
        recenterTick,
        settings: globalSettings,
      }),
    [layers, compiledLayers, isPaused, resetTick, recenterTick, globalSettings]
  )

  return (
    <main className="app">
      <Suspense fallback={<div className="plot-canvas" />}>
        <ThreeSurface {...rendererConfig} />
      </Suspense>
      <ControlPanel
        uiMinimized={uiMinimized}
        isPaused={isPaused}
        controlTab={controlTab}
        activeLayerError={activeLayerError}
        mobilePanelOpen={mobilePanelOpen}
        setUiMinimized={setUiMinimized}
        setIsPaused={setIsPaused}
        setControlTab={setControlTab}
        setMobilePanelOpen={setMobilePanelOpen}
        onReset={() => setResetTick((value) => value + 1)}
        layerProps={{
          selectedPresetId,
          customPresets,
          customPresetName,
          activeCustomPreset,
          activeLayer,
          equationExampleId,
          activeEquation,
          setCustomPresetName,
          setActiveEquation,
          onPresetSelect,
          updateActiveLayer,
          saveNewCustomPreset,
          updateCurrentCustomPreset,
          renameCurrentCustomPreset,
          deleteCurrentCustomPreset,
          exportCustomPresets,
          importCustomPresets,
          applyEquationExample,
          insertSnippet,
          parseNumber,
        }}
        globalProps={{
          settings: globalSettings,
          selectedStylePresetId,
          onStylePresetSelect: applyStylePreset,
          updateSetting: updateGlobalSetting,
          onRecenterCamera: () => setRecenterTick((value) => value + 1),
          parseNumber,
        }}
      />
    </main>
  )
}

export default App
