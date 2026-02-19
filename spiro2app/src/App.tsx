import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { ControlPanel } from './components/control-panel/ControlPanel'

import { compileParametric } from './spiro/equation'
import { useSpiroRenderer } from './spiro/useSpiroRenderer'
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
  NoiseMode,
  StrokeWidthMode,
} from './spiro/types'

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const layerCounterRef = useRef(2)

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
  const [activeLayerId, setActiveLayerId] = useState('layer-1')

  const [mirrorX, setMirrorX] = useState(false)
  const [mirrorY, setMirrorY] = useState(false)
  const [rotationalRepeats, setRotationalRepeats] = useState(1)
  const [rotationOffsetDeg, setRotationOffsetDeg] = useState(0)

  const [strokeWidthMode, setStrokeWidthMode] = useState<StrokeWidthMode>('fixed')
  const [baseLineWidth, setBaseLineWidth] = useState(1.5)
  const [lineWidthBoost, setLineWidthBoost] = useState(3)
  const [dashedLines, setDashedLines] = useState(false)
  const [dashLength, setDashLength] = useState(10)
  const [dashGap, setDashGap] = useState(6)
  const [glowAmount, setGlowAmount] = useState(0)
  const [equationExampleId, setEquationExampleId] = useState('')
  const [activeEquation, setActiveEquation] = useState<'x' | 'y'>('x')

  const [amplitudeMod, setAmplitudeMod] = useState(0)
  const [frequencyMod, setFrequencyMod] = useState(0)
  const [phaseMod, setPhaseMod] = useState(0)
  const [noiseMode, setNoiseMode] = useState<NoiseMode>('off')
  const [noiseAmount, setNoiseAmount] = useState(0)
  const [noiseFrequency, setNoiseFrequency] = useState(0.7)
  const [noiseSpeed, setNoiseSpeed] = useState(0.5)
  const [noiseOctaves, setNoiseOctaves] = useState(3)
  const [noiseSeed, setNoiseSeed] = useState(3.2)
  const [maxTrailPointsPerLayer, setMaxTrailPointsPerLayer] = useState(12000)
  const [adaptiveQuality, setAdaptiveQuality] = useState(true)
  const [maxAdaptiveStep, setMaxAdaptiveStep] = useState(4)

  const [isPaused, setIsPaused] = useState(false)
  const [resetTick, setResetTick] = useState(0)
  const [uiMinimized, setUiMinimized] = useState(false)
  const [controlTab, setControlTab] = useState<'layer' | 'global'>('layer')

  const activeLayer = useMemo(
    () => layers.find((layer) => layer.id === activeLayerId) ?? layers[0],
    [layers, activeLayerId]
  )
  const compiledLayers = useMemo(
    () =>
      layers.map((layer) => ({
        id: layer.id,
        ...compileParametric(layer.exprX, layer.exprY),
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
    setLayers((existing) => existing.map((layer) => (layer.id === activeLayerId ? { ...layer, ...patch } : layer)))
  }
  const addLayer = () => {
    if (layers.length >= 4) {
      return
    }
    const id = `layer-${layerCounterRef.current}`
    layerCounterRef.current += 1
    const base = activeLayer ?? layers[0]
    const layer = base
      ? { ...base, id, name: `Layer ${layerCounterRef.current - 1}`, visible: true }
      : createLayerFromPreset(PRESETS[0], id, `Layer ${layerCounterRef.current - 1}`)
    setLayers((existing) => [...existing, layer])
    setActiveLayerId(id)
    setResetTick((value) => value + 1)
  }
  const duplicateLayer = () => {
    if (!activeLayer || layers.length >= 4) {
      return
    }
    const id = `layer-${layerCounterRef.current}`
    layerCounterRef.current += 1
    setLayers((existing) => [...existing, { ...activeLayer, id, name: `${activeLayer.name} Copy`, visible: true }])
    setActiveLayerId(id)
    setResetTick((value) => value + 1)
  }
  const removeLayer = () => {
    if (!activeLayer || layers.length <= 1) {
      return
    }
    const filtered = layers.filter((layer) => layer.id !== activeLayer.id)
    setLayers(filtered)
    setActiveLayerId(filtered[0].id)
    setResetTick((value) => value + 1)
  }

  const applyEquationExample = (id: string) => {
    setEquationExampleId(id)
    const example = EQUATION_EXAMPLES.find((entry) => entry.id === id)
    if (!example) {
      return
    }
    updateActiveLayer({ exprX: example.exprX, exprY: example.exprY })
    setResetTick((value) => value + 1)
  }

  const insertSnippet = (snippet: string) => {
    if (!activeLayer) {
      return
    }
    if (activeEquation === 'x') {
      updateActiveLayer({ exprX: `${activeLayer.exprX}${snippet}` })
    } else {
      updateActiveLayer({ exprY: `${activeLayer.exprY}${snippet}` })
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
      R: preset.R,
      r: preset.r,
      d: preset.d,
      speed: preset.speed,
      uSpeed: preset.uSpeed ?? 0.4,
      lineLifetime: preset.lineLifetime,
      lineForever: true,
      drawMode: preset.drawMode,
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

  useSpiroRenderer({
    canvasRef,
    layers,
    compiledLayers,
    isPaused,
    resetTick,
    mirrorX,
    mirrorY,
    rotationalRepeats,
    rotationOffsetDeg,
    amplitudeMod,
    frequencyMod,
    phaseMod,
    noiseMode,
    noiseAmount,
    noiseFrequency,
    noiseSpeed,
    noiseOctaves,
    noiseSeed,
    strokeWidthMode,
    baseLineWidth,
    lineWidthBoost,
    dashedLines,
    dashLength,
    dashGap,
    glowAmount,
    maxTrailPointsPerLayer,
    adaptiveQuality,
    maxAdaptiveStep,
  })

  return (
    <main className="app">
      <canvas ref={canvasRef} className="plot-canvas" />
      <ControlPanel
        uiMinimized={uiMinimized}
        isPaused={isPaused}
        controlTab={controlTab}
        activeLayerError={activeLayerError}
        setUiMinimized={setUiMinimized}
        setIsPaused={setIsPaused}
        setControlTab={setControlTab}
        onReset={() => setResetTick((value) => value + 1)}
        layerProps={{
          selectedPresetId,
          customPresets,
          customPresetName,
          activeCustomPreset,
          layers,
          activeLayerId,
          activeLayer,
          equationExampleId,
          activeEquation,
          setCustomPresetName,
          setActiveLayerId,
          setActiveEquation,
          onPresetSelect,
          updateActiveLayer,
          saveNewCustomPreset,
          updateCurrentCustomPreset,
          renameCurrentCustomPreset,
          deleteCurrentCustomPreset,
          exportCustomPresets,
          importCustomPresets,
          addLayer,
          duplicateLayer,
          removeLayer,
          applyEquationExample,
          insertSnippet,
          parseNumber,
        }}
        globalProps={{
          rotationalRepeats,
          rotationOffsetDeg,
          mirrorX,
          mirrorY,
          phaseMod,
          frequencyMod,
          amplitudeMod,
          noiseMode,
          noiseAmount,
          noiseFrequency,
          noiseSpeed,
          noiseOctaves,
          noiseSeed,
          adaptiveQuality,
          maxTrailPointsPerLayer,
          maxAdaptiveStep,
          strokeWidthMode,
          baseLineWidth,
          lineWidthBoost,
          dashedLines,
          dashLength,
          dashGap,
          glowAmount,
          setRotationalRepeats,
          setRotationOffsetDeg,
          setMirrorX,
          setMirrorY,
          setPhaseMod,
          setFrequencyMod,
          setAmplitudeMod,
          setNoiseMode,
          setNoiseAmount,
          setNoiseFrequency,
          setNoiseSpeed,
          setNoiseOctaves,
          setNoiseSeed,
          setAdaptiveQuality,
          setMaxTrailPointsPerLayer,
          setMaxAdaptiveStep,
          setStrokeWidthMode,
          setBaseLineWidth,
          setLineWidthBoost,
          setDashedLines,
          setDashLength,
          setDashGap,
          setGlowAmount,
          parseNumber,
        }}
      />
    </main>
  )
}

export default App
