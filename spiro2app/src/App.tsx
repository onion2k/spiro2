import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

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
  ColorMode,
  CustomPreset,
  CustomPresetStoreV1,
  DrawMode,
  LayerConfig,
  LayerPresetData,
  NoiseMode,
  PaletteId,
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
  const [uiMode, setUiMode] = useState<'basic' | 'advanced'>('basic')

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
  const isAdvanced = uiMode === 'advanced'

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
    setSelectedPresetId(`builtin:${PRESETS[0].id}`)
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
      } else {
        setSelectedPresetId(`builtin:${PRESETS[0].id}`)
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
      colorMode: activeLayer?.colorMode ?? 'hue-cycle',
      paletteId: activeLayer?.paletteId ?? 'neon',
      hueLock: activeLayer?.hueLock ?? false,
      baseHue: activeLayer?.baseHue ?? 210,
    })
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
      <div className="control-row compact">
        <label htmlFor="ui-mode">ui</label>
        <select id="ui-mode" value={uiMode} onChange={(event) => setUiMode(event.target.value as 'basic' | 'advanced')}>
          <option value="basic">Basic</option>
          <option value="advanced">Advanced</option>
        </select>
        <button type="button" onClick={() => setIsPaused((value) => !value)}>
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button type="button" onClick={() => setResetTick((value) => value + 1)}>
          Reset
        </button>
      </div>

      {!isAdvanced ? (
        <details className="control-section" open>
          <summary>Quick Controls</summary>
          <div className="control-row">
            <label htmlFor="preset">preset</label>
            <select
              id="preset"
              value={selectedPresetId}
              onChange={(event) => {
                const value = event.target.value
                if (value.startsWith('builtin:')) {
                  applyPreset(value.replace('builtin:', ''))
                  return
                }
                if (value.startsWith('custom:')) {
                  applyCustomPreset(value.replace('custom:', ''))
                }
              }}
            >
              <optgroup label="Built-in">
                {PRESETS.map((preset) => (
                  <option key={preset.id} value={`builtin:${preset.id}`}>
                    {preset.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Custom">
                {customPresets.map((preset) => (
                  <option key={preset.id} value={`custom:${preset.id}`}>
                    {preset.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="control-row compact">
            <label htmlFor="layer-select">layer</label>
            <select id="layer-select" value={activeLayerId} onChange={(event) => setActiveLayerId(event.target.value)}>
              {layers.map((layer) => (
                <option key={layer.id} value={layer.id}>
                  {layer.name}
                </option>
              ))}
            </select>
            <label htmlFor="layer-visible">visible</label>
            <input
              id="layer-visible"
              type="checkbox"
              checked={activeLayer?.visible ?? true}
              onChange={(event) => updateActiveLayer({ visible: event.target.checked })}
            />
            <button type="button" onClick={addLayer} disabled={layers.length >= 4}>
              Add
            </button>
            <button type="button" onClick={removeLayer} disabled={layers.length <= 1}>
              Remove
            </button>
          </div>
          <div className="control-row compact">
            <label htmlFor="r-big">R</label>
            <input
              id="r-big"
              type="number"
              step="0.2"
              value={activeLayer?.R ?? 0}
              onChange={(event) => updateActiveLayer({ R: parseNumber(event.target.value, activeLayer?.R ?? 0) })}
            />
            <label htmlFor="r-small">r</label>
            <input
              id="r-small"
              type="number"
              value={activeLayer?.r ?? 0}
              onChange={(event) => updateActiveLayer({ r: parseNumber(event.target.value, activeLayer?.r ?? 0) })}
            />
            <label htmlFor="offset">d</label>
            <input
              id="offset"
              type="number"
              value={activeLayer?.d ?? 0}
              onChange={(event) => updateActiveLayer({ d: parseNumber(event.target.value, activeLayer?.d ?? 0) })}
            />
            <label htmlFor="speed">speed</label>
            <input
              id="speed"
              type="number"
              step="0.1"
              value={activeLayer?.speed ?? 0}
              onChange={(event) => updateActiveLayer({ speed: parseNumber(event.target.value, activeLayer?.speed ?? 0) })}
            />
            <label htmlFor="draw-mode">mode</label>
            <select
              id="draw-mode"
              value={activeLayer?.drawMode ?? 'lines'}
              onChange={(event) => updateActiveLayer({ drawMode: event.target.value as DrawMode })}
            >
              <option value="lines">Lines</option>
              <option value="points">Points</option>
              <option value="lines-points">Lines + points</option>
            </select>
          </div>
        </details>
      ) : (
        <>
          <details className="control-section" open>
            <summary>Presets And Layers</summary>
            <div className="control-row">
              <label htmlFor="preset">preset</label>
              <select
                id="preset"
                value={selectedPresetId}
                onChange={(event) => {
                  const value = event.target.value
                  if (value.startsWith('builtin:')) {
                    applyPreset(value.replace('builtin:', ''))
                    return
                  }
                  if (value.startsWith('custom:')) {
                    applyCustomPreset(value.replace('custom:', ''))
                  }
                }}
              >
                <optgroup label="Built-in">
                  {PRESETS.map((preset) => (
                    <option key={preset.id} value={`builtin:${preset.id}`}>
                      {preset.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Custom">
                  {customPresets.map((preset) => (
                    <option key={preset.id} value={`custom:${preset.id}`}>
                      {preset.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="control-row compact">
              <label htmlFor="custom-preset-name">custom preset</label>
              <input
                id="custom-preset-name"
                value={customPresetName}
                onChange={(event) => setCustomPresetName(event.target.value)}
              />
              <button type="button" onClick={saveNewCustomPreset}>
                Save New
              </button>
              <button type="button" onClick={updateCurrentCustomPreset} disabled={!activeCustomPreset}>
                Update
              </button>
              <button type="button" onClick={renameCurrentCustomPreset} disabled={!activeCustomPreset}>
                Rename
              </button>
              <button type="button" onClick={deleteCurrentCustomPreset} disabled={!activeCustomPreset}>
                Delete
              </button>
              <button type="button" onClick={exportCustomPresets}>
                Export JSON
              </button>
              <button type="button" onClick={importCustomPresets}>
                Import JSON
              </button>
            </div>
            <div className="control-row compact">
              <label htmlFor="layer-select">layer</label>
              <select id="layer-select" value={activeLayerId} onChange={(event) => setActiveLayerId(event.target.value)}>
                {layers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name}
                  </option>
                ))}
              </select>
              <label htmlFor="layer-name">name</label>
              <input
                id="layer-name"
                value={activeLayer?.name ?? ''}
                onChange={(event) => updateActiveLayer({ name: event.target.value || 'Layer' })}
              />
              <label htmlFor="layer-visible">visible</label>
              <input
                id="layer-visible"
                type="checkbox"
                checked={activeLayer?.visible ?? true}
                onChange={(event) => updateActiveLayer({ visible: event.target.checked })}
              />
              <button type="button" onClick={addLayer} disabled={layers.length >= 4}>
                Add
              </button>
              <button type="button" onClick={duplicateLayer} disabled={layers.length >= 4}>
                Duplicate
              </button>
              <button type="button" onClick={removeLayer} disabled={layers.length <= 1}>
                Remove
              </button>
            </div>
          </details>

          <details className="control-section" open>
            <summary>Equations</summary>
            <div className="control-row">
              <label htmlFor="equation-x">x(t,u)=</label>
              <input
                id="equation-x"
                value={activeLayer?.exprX ?? ''}
                onChange={(event) => updateActiveLayer({ exprX: event.target.value })}
                onFocus={() => setActiveEquation('x')}
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <div className="control-row">
              <label htmlFor="equation-y">y(t,u)=</label>
              <input
                id="equation-y"
                value={activeLayer?.exprY ?? ''}
                onChange={(event) => updateActiveLayer({ exprY: event.target.value })}
                onFocus={() => setActiveEquation('y')}
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <div className="control-row compact">
              <label htmlFor="equation-example">example</label>
              <select id="equation-example" value={equationExampleId} onChange={(event) => applyEquationExample(event.target.value)}>
                <option value="">Custom</option>
                {EQUATION_EXAMPLES.map((example) => (
                  <option key={example.id} value={example.id}>
                    {example.name}
                  </option>
                ))}
              </select>
              <label htmlFor="active-equation">target</label>
              <select
                id="active-equation"
                value={activeEquation}
                onChange={(event) => setActiveEquation(event.target.value as 'x' | 'y')}
              >
                <option value="x">x(t,u)</option>
                <option value="y">y(t,u)</option>
              </select>
              <button type="button" onClick={() => insertSnippet(' + 0.4 * sin(u)')}>
                +sin(u)
              </button>
              <button type="button" onClick={() => insertSnippet(' + 0.3 * triangle(u)')}>
                +triangle(u)
              </button>
              <button type="button" onClick={() => insertSnippet(' + 0.25 * saw(u)')}>
                +saw(u)
              </button>
              <button type="button" onClick={() => insertSnippet(' + pulse(u, 0.2)')}>
                +pulse
              </button>
            </div>
          </details>

          <details className="control-section" open>
            <summary>Curve</summary>
            <div className="control-row compact">
        <label htmlFor="r-big">R</label>
        <input
          id="r-big"
          type="number"
          step="0.2"
          value={activeLayer?.R ?? 0}
          onChange={(event) => updateActiveLayer({ R: parseNumber(event.target.value, activeLayer?.R ?? 0) })}
        />
        <label htmlFor="r-small">r</label>
        <input
          id="r-small"
          type="number"
          value={activeLayer?.r ?? 0}
          onChange={(event) => updateActiveLayer({ r: parseNumber(event.target.value, activeLayer?.r ?? 0) })}
        />
        <label htmlFor="offset">d</label>
        <input
          id="offset"
          type="number"
          value={activeLayer?.d ?? 0}
          onChange={(event) => updateActiveLayer({ d: parseNumber(event.target.value, activeLayer?.d ?? 0) })}
        />
        <label htmlFor="speed">speed</label>
        <input
          id="speed"
          type="number"
          step="0.1"
          value={activeLayer?.speed ?? 0}
          onChange={(event) => updateActiveLayer({ speed: parseNumber(event.target.value, activeLayer?.speed ?? 0) })}
        />
        <label htmlFor="u-speed">u speed</label>
        <input
          id="u-speed"
          type="number"
          step="0.05"
          value={activeLayer?.uSpeed ?? 0}
          onChange={(event) => updateActiveLayer({ uSpeed: parseNumber(event.target.value, activeLayer?.uSpeed ?? 0) })}
        />
        <label htmlFor="line-life">life (s)</label>
        <input
          id="line-life"
          type="number"
          min="0.2"
          step="0.2"
          value={activeLayer?.lineLifetime ?? 0.2}
          onChange={(event) =>
            updateActiveLayer({
              lineLifetime: Math.max(0.2, parseNumber(event.target.value, activeLayer?.lineLifetime ?? 0.2)),
            })
          }
          disabled={activeLayer?.lineForever ?? false}
        />
        <label htmlFor="line-forever">forever</label>
        <input
          id="line-forever"
          type="checkbox"
          checked={activeLayer?.lineForever ?? false}
          onChange={(event) => updateActiveLayer({ lineForever: event.target.checked })}
        />
        <label htmlFor="draw-mode">mode</label>
        <select
          id="draw-mode"
          value={activeLayer?.drawMode ?? 'lines'}
          onChange={(event) => updateActiveLayer({ drawMode: event.target.value as DrawMode })}
        >
          <option value="lines">Lines</option>
          <option value="points">Points</option>
          <option value="lines-points">Lines + points</option>
        </select>
        <label htmlFor="point-size">pt size</label>
        <input
          id="point-size"
          type="number"
          min="0.5"
          step="0.1"
          value={activeLayer?.pointSize ?? 0.5}
          onChange={(event) =>
            updateActiveLayer({ pointSize: Math.max(0.5, parseNumber(event.target.value, activeLayer?.pointSize ?? 0.5)) })
          }
        />
      </div>
          </details>
          <details className="control-section" open>
            <summary>Symmetry</summary>
            <div className="control-row compact">
        <label htmlFor="repeat">rot repeat</label>
        <input
          id="repeat"
          type="number"
          min="1"
          max="16"
          step="1"
          value={rotationalRepeats}
          onChange={(event) =>
            setRotationalRepeats(Math.max(1, Math.min(16, Math.round(parseNumber(event.target.value, rotationalRepeats)))))
          }
        />
        <label htmlFor="repeat-offset">repeat deg</label>
        <input
          id="repeat-offset"
          type="number"
          step="1"
          value={rotationOffsetDeg}
          onChange={(event) => setRotationOffsetDeg(parseNumber(event.target.value, rotationOffsetDeg))}
        />
        <label htmlFor="mirror-x">mirror X</label>
        <input id="mirror-x" type="checkbox" checked={mirrorX} onChange={(event) => setMirrorX(event.target.checked)} />
        <label htmlFor="mirror-y">mirror Y</label>
        <input id="mirror-y" type="checkbox" checked={mirrorY} onChange={(event) => setMirrorY(event.target.checked)} />
      </div>
          </details>
          <details className="control-section" open>
            <summary>Noise And Modulation</summary>
            <div className="control-row compact">
        <label htmlFor="phase-mod">phase</label>
        <input
          id="phase-mod"
          type="number"
          step="0.05"
          value={phaseMod}
          onChange={(event) => setPhaseMod(parseNumber(event.target.value, phaseMod))}
        />
        <label htmlFor="freq-mod">freq</label>
        <input
          id="freq-mod"
          type="number"
          step="0.05"
          value={frequencyMod}
          onChange={(event) => setFrequencyMod(parseNumber(event.target.value, frequencyMod))}
        />
        <label htmlFor="amp-mod">amp</label>
        <input
          id="amp-mod"
          type="number"
          step="0.05"
          value={amplitudeMod}
          onChange={(event) => setAmplitudeMod(parseNumber(event.target.value, amplitudeMod))}
        />
        <label htmlFor="noise-mode">noise mode</label>
        <select id="noise-mode" value={noiseMode} onChange={(event) => setNoiseMode(event.target.value as NoiseMode)}>
          <option value="off">Off</option>
          <option value="grain">Grain</option>
          <option value="flow">Flow</option>
        </select>
        <label htmlFor="noise-amt">noise</label>
        <input
          id="noise-amt"
          type="number"
          step="0.05"
          min="0"
          value={noiseAmount}
          onChange={(event) => setNoiseAmount(Math.max(0, parseNumber(event.target.value, noiseAmount)))}
          disabled={noiseMode === 'off'}
        />
        <label htmlFor="noise-freq">noise f</label>
        <input
          id="noise-freq"
          type="number"
          step="0.1"
          min="0.1"
          value={noiseFrequency}
          onChange={(event) => setNoiseFrequency(Math.max(0.1, parseNumber(event.target.value, noiseFrequency)))}
          disabled={noiseMode === 'off'}
        />
        <label htmlFor="noise-speed">noise v</label>
        <input
          id="noise-speed"
          type="number"
          step="0.05"
          min="0"
          value={noiseSpeed}
          onChange={(event) => setNoiseSpeed(Math.max(0, parseNumber(event.target.value, noiseSpeed)))}
          disabled={noiseMode === 'off'}
        />
        <label htmlFor="noise-oct">oct</label>
        <input
          id="noise-oct"
          type="number"
          min="1"
          max="6"
          step="1"
          value={noiseOctaves}
          onChange={(event) => setNoiseOctaves(Math.max(1, Math.min(6, Math.round(parseNumber(event.target.value, noiseOctaves)))))}
          disabled={noiseMode !== 'flow'}
        />
        <label htmlFor="noise-seed">seed</label>
        <input
          id="noise-seed"
          type="number"
          step="0.1"
          value={noiseSeed}
          onChange={(event) => setNoiseSeed(parseNumber(event.target.value, noiseSeed))}
          disabled={noiseMode === 'off'}
        />
      </div>
          </details>
          <details className="control-section" open>
            <summary>Performance</summary>
            <div className="control-row compact">
        <label htmlFor="adaptive-quality">adaptive</label>
        <input
          id="adaptive-quality"
          type="checkbox"
          checked={adaptiveQuality}
          onChange={(event) => setAdaptiveQuality(event.target.checked)}
        />
        <label htmlFor="max-trail">max pts/layer</label>
        <input
          id="max-trail"
          type="number"
          min="1000"
          step="500"
          value={maxTrailPointsPerLayer}
          onChange={(event) =>
            setMaxTrailPointsPerLayer(Math.max(1000, Math.round(parseNumber(event.target.value, maxTrailPointsPerLayer))))
          }
        />
        <label htmlFor="max-step">max skip</label>
        <input
          id="max-step"
          type="number"
          min="1"
          max="8"
          step="1"
          value={maxAdaptiveStep}
          onChange={(event) => setMaxAdaptiveStep(Math.max(1, Math.min(8, Math.round(parseNumber(event.target.value, maxAdaptiveStep)))))}
          disabled={!adaptiveQuality}
        />
      </div>
          </details>
          <details className="control-section" open>
            <summary>Stroke</summary>
            <div className="control-row compact">
        <label htmlFor="stroke-width-mode">stroke</label>
        <select
          id="stroke-width-mode"
          value={strokeWidthMode}
          onChange={(event) => setStrokeWidthMode(event.target.value as StrokeWidthMode)}
        >
          <option value="fixed">Fixed Width</option>
          <option value="speed">Width by Speed</option>
          <option value="curvature">Width by Curvature</option>
        </select>
        <label htmlFor="base-line-width">base w</label>
        <input
          id="base-line-width"
          type="number"
          min="0.2"
          step="0.1"
          value={baseLineWidth}
          onChange={(event) => setBaseLineWidth(Math.max(0.2, parseNumber(event.target.value, baseLineWidth)))}
        />
        <label htmlFor="line-width-boost">boost</label>
        <input
          id="line-width-boost"
          type="number"
          min="0"
          step="0.1"
          value={lineWidthBoost}
          onChange={(event) => setLineWidthBoost(Math.max(0, parseNumber(event.target.value, lineWidthBoost)))}
        />
        <label htmlFor="dashed-lines">dashed</label>
        <input
          id="dashed-lines"
          type="checkbox"
          checked={dashedLines}
          onChange={(event) => setDashedLines(event.target.checked)}
        />
        <label htmlFor="dash-length">dash</label>
        <input
          id="dash-length"
          type="number"
          min="1"
          step="1"
          value={dashLength}
          onChange={(event) => setDashLength(Math.max(1, parseNumber(event.target.value, dashLength)))}
          disabled={!dashedLines}
        />
        <label htmlFor="dash-gap">gap</label>
        <input
          id="dash-gap"
          type="number"
          min="0"
          step="1"
          value={dashGap}
          onChange={(event) => setDashGap(Math.max(0, parseNumber(event.target.value, dashGap)))}
          disabled={!dashedLines}
        />
        <label htmlFor="glow-amount">glow</label>
        <input
          id="glow-amount"
          type="number"
          min="0"
          step="1"
          value={glowAmount}
          onChange={(event) => setGlowAmount(Math.max(0, parseNumber(event.target.value, glowAmount)))}
        />
      </div>
          </details>
          <details className="control-section" open>
            <summary>Color</summary>
            <div className="control-row compact">
        <label htmlFor="color-mode">color</label>
        <select
          id="color-mode"
          value={activeLayer?.colorMode ?? 'hue-cycle'}
          onChange={(event) => updateActiveLayer({ colorMode: event.target.value as ColorMode })}
        >
          <option value="hue-cycle">Hue Cycle</option>
          <option value="palette">Palette Sweep</option>
          <option value="age">By Age</option>
          <option value="speed">By Speed</option>
          <option value="curvature">By Curvature</option>
        </select>
        <label htmlFor="palette">palette</label>
        <select
          id="palette"
          value={activeLayer?.paletteId ?? 'neon'}
          onChange={(event) => updateActiveLayer({ paletteId: event.target.value as PaletteId })}
        >
          <option value="neon">Neon</option>
          <option value="sunset">Sunset</option>
          <option value="ocean">Ocean</option>
          <option value="forest">Forest</option>
          <option value="candy">Candy</option>
        </select>
        <label htmlFor="hue-lock">hue lock</label>
        <input
          id="hue-lock"
          type="checkbox"
          checked={activeLayer?.hueLock ?? false}
          onChange={(event) => updateActiveLayer({ hueLock: event.target.checked })}
        />
        <label htmlFor="base-hue">base hue</label>
        <input
          id="base-hue"
          type="number"
          min="0"
          max="360"
          step="1"
          value={activeLayer?.baseHue ?? 210}
          onChange={(event) => updateActiveLayer({ baseHue: parseNumber(event.target.value, activeLayer?.baseHue ?? 210) })}
          disabled={!(activeLayer?.hueLock ?? false)}
        />
      </div>
          </details>
        </>
      )}
      {activeLayerError ? <p className="error">{activeLayerError}</p> : null}
      <p className="hint">
        Equation helpers: sin, cos, tan, sqrt, pow, PI, E, clamp(v,lo,hi), mix(a,b,p), saw(v), triangle(v), pulse(v,w). Time terms: t and u. Noise: Off, Grain, Flow.
      </p>
      <canvas ref={canvasRef} className="plot-canvas" />
    </main>
  )
}

export default App
