import type { ChangeEvent } from 'react'

import type { NoiseMode, StrokeWidthMode } from '@/spiro/types'
import type { GlobalSettings } from '@/spiro/renderers/defaults'
import type { GlobalDrawMode, LineMaterialPresetId, ThreeCameraMode, ThreeLineRenderMode } from '@/spiro/renderers/types'

export type GlobalControlsProps = {
  settings: GlobalSettings
  updateSetting: <K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]) => void
  parseNumber: (value: string, fallback: number) => number
}

type NumericSettingKey = {
  [K in keyof GlobalSettings]: GlobalSettings[K] extends number ? K : never
}[keyof GlobalSettings]

type NumericBounds = {
  min?: number
  max?: number
  integer?: boolean
}

type MaterialPresetValues = Pick<
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

const MATERIAL_PRESETS: Record<Exclude<LineMaterialPresetId, 'custom'>, MaterialPresetValues> = {
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

export function GlobalControls({ settings, updateSetting, parseNumber }: GlobalControlsProps) {
  const {
    threeCameraMode,
    threeLineRenderMode,
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
    globalDrawMode,
    threeSpriteSize,
    threeSpriteSoftness,
    autoRotateScene,
    autoRotateSpeed,
    lineMaterialPreset,
    lineMaterialColor,
    lineMaterialMetalness,
    lineMaterialRoughness,
    lineMaterialClearcoat,
    lineMaterialClearcoatRoughness,
    lineMaterialTransmission,
    lineMaterialThickness,
    lineMaterialIor,
  } = settings

  const parseBoundedNumber = (value: string, fallback: number, bounds: NumericBounds = {}) => {
    const { min, max, integer = false } = bounds
    let next = parseNumber(value, fallback)
    if (integer) {
      next = Math.round(next)
    }
    if (typeof min === 'number') {
      next = Math.max(min, next)
    }
    if (typeof max === 'number') {
      next = Math.min(max, next)
    }
    return next
  }

  const onNumberChange =
    <K extends NumericSettingKey>(key: K, fallback: number, bounds?: NumericBounds) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      updateSetting(key, parseBoundedNumber(event.target.value, fallback, bounds) as GlobalSettings[K])
    }

  const applyMaterialPreset = (presetId: Exclude<LineMaterialPresetId, 'custom'>) => {
    const preset = MATERIAL_PRESETS[presetId]
    updateSetting('lineMaterialPreset', presetId)
    updateSetting('lineMaterialColor', preset.lineMaterialColor)
    updateSetting('lineMaterialMetalness', preset.lineMaterialMetalness)
    updateSetting('lineMaterialRoughness', preset.lineMaterialRoughness)
    updateSetting('lineMaterialClearcoat', preset.lineMaterialClearcoat)
    updateSetting('lineMaterialClearcoatRoughness', preset.lineMaterialClearcoatRoughness)
    updateSetting('lineMaterialTransmission', preset.lineMaterialTransmission)
    updateSetting('lineMaterialThickness', preset.lineMaterialThickness)
    updateSetting('lineMaterialIor', preset.lineMaterialIor)
  }

  const onMaterialNumberChange =
    <K extends NumericSettingKey>(key: K, fallback: number, bounds?: NumericBounds) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      updateSetting('lineMaterialPreset', 'custom')
      updateSetting(key, parseBoundedNumber(event.target.value, fallback, bounds) as GlobalSettings[K])
    }

  const onMaterialColorChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateSetting('lineMaterialPreset', 'custom')
    updateSetting('lineMaterialColor', event.target.value)
  }

  return (
    <section className="control-group" aria-label="Global Controls">
      <section className="panel-section">
        <h3 className="panel-section-title">Renderer</h3>
        <p className="section-help">Configure three.js camera projection and line rendering mode.</p>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="three-camera-mode">three.js Camera</label>
            <select
              id="three-camera-mode"
              title="Switch between orthographic and perspective camera projection."
              value={threeCameraMode}
              onChange={(event) => updateSetting('threeCameraMode', event.target.value as ThreeCameraMode)}
            >
              <option value="orthographic">Orthographic</option>
              <option value="perspective">Perspective</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="three-line-render-mode">three.js Line Mode</label>
            <select
              id="three-line-render-mode"
              title="Choose how line mode is rendered in three.js."
              value={threeLineRenderMode}
              onChange={(event) => updateSetting('threeLineRenderMode', event.target.value as ThreeLineRenderMode)}
            >
              <option value="fat-lines">Fat Lines</option>
              <option value="instanced-sprites">Instanced Point Sprites</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="global-draw-mode">Global Draw Mode</label>
            <select
              id="global-draw-mode"
              title="Render all layers as lines or points."
              value={globalDrawMode}
              onChange={(event) => updateSetting('globalDrawMode', event.target.value as GlobalDrawMode)}
            >
              <option value="lines">Lines</option>
              <option value="points">Points</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="three-sprite-size">Sprite Size</label>
            <input
              id="three-sprite-size"
              type="number"
              title="Scale multiplier for instanced sprite quads."
              min="0.2"
              max="4"
              step="0.1"
              value={threeSpriteSize}
              onChange={onNumberChange('threeSpriteSize', threeSpriteSize, { min: 0.2, max: 4 })}
              disabled={threeLineRenderMode !== 'instanced-sprites'}
            />
          </div>
          <div className="field">
            <label htmlFor="three-sprite-softness">Sprite Softness</label>
            <input
              id="three-sprite-softness"
              type="number"
              title="Controls edge falloff softness for instanced sprites."
              min="0"
              max="1"
              step="0.05"
              value={threeSpriteSoftness}
              onChange={onNumberChange('threeSpriteSoftness', threeSpriteSoftness, { min: 0, max: 1 })}
              disabled={threeLineRenderMode !== 'instanced-sprites'}
            />
          </div>
          <div className="field checkbox-field">
            <label htmlFor="auto-rotate-scene">Auto Rotate Scene</label>
            <input
              id="auto-rotate-scene"
              type="checkbox"
              title="Automatically orbit the camera around the scene."
              checked={autoRotateScene}
              onChange={(event) => updateSetting('autoRotateScene', event.target.checked)}
            />
          </div>
          <div className="field">
            <label htmlFor="auto-rotate-speed">Auto Rotate Speed</label>
            <input
              id="auto-rotate-speed"
              type="number"
              title="OrbitControls auto-rotation speed."
              min="-10"
              max="10"
              step="0.1"
              value={autoRotateSpeed}
              onChange={onNumberChange('autoRotateSpeed', autoRotateSpeed, { min: -10, max: 10 })}
              disabled={!autoRotateScene}
            />
          </div>
        </div>
      </section>

      <section className="panel-section">
        <h3 className="panel-section-title">Symmetry</h3>
        <p className="section-help">Apply mirror and rotational symmetry to all active layers.</p>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="repeat">Rotational Repeats</label>
            <input
              id="repeat"
              type="number"
              title="Number of rotated copies drawn around the center."
              min="1"
              max="16"
              step="1"
              value={rotationalRepeats}
              onChange={onNumberChange('rotationalRepeats', rotationalRepeats, { min: 1, max: 16, integer: true })}
            />
          </div>
          <div className="field">
            <label htmlFor="repeat-offset">Rotation Offset (deg)</label>
            <input
              id="repeat-offset"
              type="number"
              title="Angular offset in degrees between repeated copies."
              step="1"
              value={rotationOffsetDeg}
              onChange={onNumberChange('rotationOffsetDeg', rotationOffsetDeg)}
            />
          </div>
          <div className="field checkbox-field">
            <label htmlFor="mirror-x">Mirror X</label>
            <input id="mirror-x" type="checkbox" title="Mirror output across the X axis." checked={mirrorX} onChange={(event) => updateSetting('mirrorX', event.target.checked)} />
          </div>
          <div className="field checkbox-field">
            <label htmlFor="mirror-y">Mirror Y</label>
            <input id="mirror-y" type="checkbox" title="Mirror output across the Y axis." checked={mirrorY} onChange={(event) => updateSetting('mirrorY', event.target.checked)} />
          </div>
        </div>
      </section>

      <section className="panel-section">
        <h3 className="panel-section-title">Noise And Modulation</h3>
        <p className="section-help">Animate variation in phase, frequency, amplitude, and procedural noise for organic motion.</p>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="phase-mod">Phase Mod</label>
            <input
              id="phase-mod"
              type="number"
              title="Phase offset modulation strength."
              step="0.05"
              value={phaseMod}
              onChange={onNumberChange('phaseMod', phaseMod)}
            />
          </div>
          <div className="field">
            <label htmlFor="freq-mod">Frequency Mod</label>
            <input
              id="freq-mod"
              type="number"
              title="Frequency modulation strength."
              step="0.05"
              value={frequencyMod}
              onChange={onNumberChange('frequencyMod', frequencyMod)}
            />
          </div>
          <div className="field">
            <label htmlFor="amp-mod">Amplitude Mod</label>
            <input
              id="amp-mod"
              type="number"
              title="Amplitude modulation strength."
              step="0.05"
              value={amplitudeMod}
              onChange={onNumberChange('amplitudeMod', amplitudeMod)}
            />
          </div>
          <div className="field">
            <label htmlFor="noise-mode">Noise Mode</label>
            <select id="noise-mode" title="Select noise algorithm or disable noise." value={noiseMode} onChange={(event) => updateSetting('noiseMode', event.target.value as NoiseMode)}>
              <option value="off">Off</option>
              <option value="grain">Grain</option>
              <option value="flow">Flow</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="noise-amt">Noise Amount</label>
            <input
              id="noise-amt"
              type="number"
              title="Overall amount of positional perturbation from noise."
              step="0.05"
              min="0"
              value={noiseAmount}
              onChange={onNumberChange('noiseAmount', noiseAmount, { min: 0 })}
              disabled={noiseMode === 'off'}
            />
          </div>
          <div className="field">
            <label htmlFor="noise-freq">Noise Frequency</label>
            <input
              id="noise-freq"
              type="number"
              title="Spatial frequency of noise variation."
              step="0.1"
              min="0.1"
              value={noiseFrequency}
              onChange={onNumberChange('noiseFrequency', noiseFrequency, { min: 0.1 })}
              disabled={noiseMode === 'off'}
            />
          </div>
          <div className="field">
            <label htmlFor="noise-speed">Noise Speed</label>
            <input
              id="noise-speed"
              type="number"
              title="How quickly noise changes over time."
              step="0.05"
              min="0"
              value={noiseSpeed}
              onChange={onNumberChange('noiseSpeed', noiseSpeed, { min: 0 })}
              disabled={noiseMode === 'off'}
            />
          </div>
          <div className="field">
            <label htmlFor="noise-oct">Noise Octaves</label>
            <input
              id="noise-oct"
              type="number"
              title="Number of fractal layers for Flow noise."
              min="1"
              max="6"
              step="1"
              value={noiseOctaves}
              onChange={onNumberChange('noiseOctaves', noiseOctaves, { min: 1, max: 6, integer: true })}
              disabled={noiseMode !== 'flow'}
            />
          </div>
          <div className="field">
            <label htmlFor="noise-seed">Noise Seed</label>
            <input
              id="noise-seed"
              type="number"
              title="Seed value for deterministic noise variation."
              step="0.1"
              value={noiseSeed}
              onChange={onNumberChange('noiseSeed', noiseSeed)}
              disabled={noiseMode === 'off'}
            />
          </div>
        </div>
      </section>

      <section className="panel-section">
        <h3 className="panel-section-title">Performance</h3>
        <p className="section-help">Balance smoothness and frame rate by constraining trail size and adaptive stepping.</p>
        <div className="field-grid">
          <div className="field checkbox-field">
            <label htmlFor="adaptive-quality">Adaptive Quality</label>
            <input
              id="adaptive-quality"
              type="checkbox"
              title="Skip points adaptively when rendering gets expensive."
              checked={adaptiveQuality}
              onChange={(event) => updateSetting('adaptiveQuality', event.target.checked)}
            />
          </div>
          <div className="field">
            <label htmlFor="max-trail">Max Points Per Layer</label>
            <input
              id="max-trail"
              type="number"
              title="Hard cap for stored trail points per layer."
              min="1000"
              step="500"
              value={maxTrailPointsPerLayer}
              onChange={onNumberChange('maxTrailPointsPerLayer', maxTrailPointsPerLayer, { min: 1000, integer: true })}
            />
          </div>
          <div className="field">
            <label htmlFor="max-step">Max Adaptive Skip</label>
            <input
              id="max-step"
              type="number"
              title="Maximum point-skip factor when adaptive quality is enabled."
              min="1"
              max="8"
              step="1"
              value={maxAdaptiveStep}
              onChange={onNumberChange('maxAdaptiveStep', maxAdaptiveStep, { min: 1, max: 8, integer: true })}
              disabled={!adaptiveQuality}
            />
          </div>
        </div>
      </section>

      <section className="panel-section">
        <h3 className="panel-section-title">Stroke</h3>
        <p className="section-help">Configure line thickness behavior, dash style, and material rendering.</p>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="stroke-width-mode">Stroke Width Mode</label>
            <select
              id="stroke-width-mode"
              title="Set how stroke width is computed along the path."
              value={strokeWidthMode}
              onChange={(event) => updateSetting('strokeWidthMode', event.target.value as StrokeWidthMode)}
            >
              <option value="fixed">Fixed Width</option>
              <option value="speed">Width by Speed</option>
              <option value="curvature">Width by Curvature</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="base-line-width">Base Width</label>
            <input
              id="base-line-width"
              type="number"
              title="Base line width in pixels."
              min="0.2"
              step="0.1"
              value={baseLineWidth}
              onChange={onNumberChange('baseLineWidth', baseLineWidth, { min: 0.2 })}
            />
          </div>
          <div className="field">
            <label htmlFor="line-width-boost">Width Boost</label>
            <input
              id="line-width-boost"
              type="number"
              title="Extra width applied by dynamic width modes."
              min="0"
              step="0.1"
              value={lineWidthBoost}
              onChange={onNumberChange('lineWidthBoost', lineWidthBoost, { min: 0 })}
            />
          </div>
          <div className="field checkbox-field">
            <label htmlFor="dashed-lines">Dashed Lines</label>
            <input
              id="dashed-lines"
              type="checkbox"
              title="Render paths as dashed lines."
              checked={dashedLines}
              onChange={(event) => updateSetting('dashedLines', event.target.checked)}
            />
          </div>
          <div className="field">
            <label htmlFor="dash-length">Dash Length</label>
            <input
              id="dash-length"
              type="number"
              title="Length of visible dash segments."
              min="1"
              step="1"
              value={dashLength}
              onChange={onNumberChange('dashLength', dashLength, { min: 1 })}
              disabled={!dashedLines}
            />
          </div>
          <div className="field">
            <label htmlFor="dash-gap">Dash Gap</label>
            <input
              id="dash-gap"
              type="number"
              title="Gap length between dash segments."
              min="0"
              step="1"
              value={dashGap}
              onChange={onNumberChange('dashGap', dashGap, { min: 0 })}
              disabled={!dashedLines}
            />
          </div>
          <div className="field">
            <label htmlFor="line-material-preset">Material Preset</label>
            <select
              id="line-material-preset"
              title="Apply a bundled physical material setup for ribbon lines."
              value={lineMaterialPreset}
              onChange={(event) => {
                const presetId = event.target.value as LineMaterialPresetId
                if (presetId === 'custom') {
                  updateSetting('lineMaterialPreset', 'custom')
                } else {
                  applyMaterialPreset(presetId)
                }
              }}
              disabled={threeLineRenderMode !== 'fat-lines'}
            >
              <option value="matte-ribbon">Matte Ribbon</option>
              <option value="satin-plastic">Satin Plastic</option>
              <option value="brushed-metal">Brushed Metal</option>
              <option value="chrome">Chrome</option>
              <option value="frosted-glass">Frosted Glass</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="line-material-color">Line Color</label>
            <input
              id="line-material-color"
              type="color"
              title="Base tint for ribbon material (multiplies with animated vertex color)."
              value={lineMaterialColor}
              onChange={onMaterialColorChange}
              disabled={threeLineRenderMode !== 'fat-lines'}
            />
          </div>
          <div className="field">
            <label htmlFor="line-material-metalness">Line Metalness</label>
            <input
              id="line-material-metalness"
              type="number"
              title="Physical material metalness for ribbon lines."
              min="0"
              max="1"
              step="0.05"
              value={lineMaterialMetalness}
              onChange={onMaterialNumberChange('lineMaterialMetalness', lineMaterialMetalness, { min: 0, max: 1 })}
              disabled={threeLineRenderMode !== 'fat-lines'}
            />
          </div>
          <div className="field">
            <label htmlFor="line-material-roughness">Line Roughness</label>
            <input
              id="line-material-roughness"
              type="number"
              title="Physical material roughness for ribbon lines."
              min="0"
              max="1"
              step="0.05"
              value={lineMaterialRoughness}
              onChange={onMaterialNumberChange('lineMaterialRoughness', lineMaterialRoughness, { min: 0, max: 1 })}
              disabled={threeLineRenderMode !== 'fat-lines'}
            />
          </div>
          <div className="field">
            <label htmlFor="line-material-clearcoat">Line Clearcoat</label>
            <input
              id="line-material-clearcoat"
              type="number"
              title="Additional clearcoat layer intensity for ribbon material."
              min="0"
              max="1"
              step="0.05"
              value={lineMaterialClearcoat}
              onChange={onMaterialNumberChange('lineMaterialClearcoat', lineMaterialClearcoat, { min: 0, max: 1 })}
              disabled={threeLineRenderMode !== 'fat-lines'}
            />
          </div>
          <div className="field">
            <label htmlFor="line-material-clearcoat-roughness">Clearcoat Roughness</label>
            <input
              id="line-material-clearcoat-roughness"
              type="number"
              title="Roughness of the ribbon clearcoat layer."
              min="0"
              max="1"
              step="0.05"
              value={lineMaterialClearcoatRoughness}
              onChange={onMaterialNumberChange('lineMaterialClearcoatRoughness', lineMaterialClearcoatRoughness, {
                min: 0,
                max: 1,
              })}
              disabled={threeLineRenderMode !== 'fat-lines'}
            />
          </div>
          <div className="field">
            <label htmlFor="line-material-transmission">Line Transmission</label>
            <input
              id="line-material-transmission"
              type="number"
              title="Transparency transmission for ribbon material."
              min="0"
              max="1"
              step="0.05"
              value={lineMaterialTransmission}
              onChange={onMaterialNumberChange('lineMaterialTransmission', lineMaterialTransmission, {
                min: 0,
                max: 1,
              })}
              disabled={threeLineRenderMode !== 'fat-lines'}
            />
          </div>
          <div className="field">
            <label htmlFor="line-material-thickness">Line Thickness</label>
            <input
              id="line-material-thickness"
              type="number"
              title="Optical thickness used by physical transmission."
              min="0"
              step="0.05"
              value={lineMaterialThickness}
              onChange={onMaterialNumberChange('lineMaterialThickness', lineMaterialThickness, { min: 0 })}
              disabled={threeLineRenderMode !== 'fat-lines'}
            />
          </div>
          <div className="field">
            <label htmlFor="line-material-ior">Line IOR</label>
            <input
              id="line-material-ior"
              type="number"
              title="Index of refraction for ribbon material."
              min="1"
              max="2.333"
              step="0.01"
              value={lineMaterialIor}
              onChange={onMaterialNumberChange('lineMaterialIor', lineMaterialIor, { min: 1, max: 2.333 })}
              disabled={threeLineRenderMode !== 'fat-lines'}
            />
          </div>
        </div>
      </section>
    </section>
  )
}
