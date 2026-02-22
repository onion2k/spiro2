import type { ChangeEvent } from 'react'

import type { NoiseMode, StrokeWidthMode } from '@/spiro/types'
import type { GlobalSettings } from '@/spiro/renderers/defaults'
import type { LineMaterialPresetId, ThreeCameraMode, ThreeLineRenderMode } from '@/spiro/renderers/types'
import { MATERIAL_PRESETS } from '@/spiro/renderers/materialPresets'
import { STYLE_PRESETS } from '@/spiro/stylePresets'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

export type GlobalControlsProps = {
  uiMode: 'basic' | 'advanced'
  scope?: 'pattern' | 'pattern-basic' | 'pattern-style' | 'pattern-symmetry' | 'rendering' | 'all'
  settings: GlobalSettings
  selectedStylePresetId: string
  onStylePresetSelect: (presetId: string) => void
  updateSetting: <K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]) => void
  onRecenterCamera: () => void
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

export function GlobalControls({
  uiMode,
  scope = 'all',
  settings,
  selectedStylePresetId,
  onStylePresetSelect,
  updateSetting,
  onRecenterCamera,
  parseNumber,
}: GlobalControlsProps) {
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
    trailSmoothing,
    dashedLines,
    dashLength,
    dashGap,
    threeSpriteSize,
    threeSpriteSoftness,
    autoRotateScene,
    autoRotateSpeed,
    showDebugGeometry,
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

  const showPatternSections = scope === 'pattern' || scope === 'all'
  const showStyleSection = scope === 'pattern-basic' || scope === 'pattern-style' || scope === 'all'
  const showRenderingSections = scope === 'rendering' || scope === 'all'
  const showSymmetrySection =
    scope === 'pattern-basic' || scope === 'pattern-symmetry' || (scope === 'all' && uiMode === 'advanced')

  return (
    <section className="control-group" aria-label="Global Controls">
      {showStyleSection ? <section className="panel-section">
        <h3 className="panel-section-title">Style</h3>
        <p className="section-help">Apply a bundled style that updates line copies, motion behavior, and color direction.</p>
        <div className="field-grid">
          <div className="field field-span-2">
            <label htmlFor="style-preset">Style Preset</label>
            <Select value={selectedStylePresetId} onValueChange={onStylePresetSelect}>
              <SelectTrigger id="style-preset" title="Apply a bundled style for line copies, motion, and colors across all layers." className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No style</SelectItem>
                {STYLE_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section> : null}

      {showRenderingSections ? <section className="panel-section">
        <h3 className="panel-section-title">Renderer</h3>
        <p className="section-help">Configure three.js camera projection and line rendering backend.</p>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="three-camera-mode">three.js Camera</label>
            <Select value={threeCameraMode} onValueChange={(value) => updateSetting('threeCameraMode', value as ThreeCameraMode)}>
              <SelectTrigger id="three-camera-mode" title="Switch between orthographic and perspective camera projection." className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orthographic">Orthographic</SelectItem>
                <SelectItem value="perspective">Perspective</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="field checkbox-field">
            <label htmlFor="show-debug-geometry">Show Debug Geometry</label>
            <input
              id="show-debug-geometry"
              type="checkbox"
              title="Display debug ring, axis, and origin markers."
              checked={showDebugGeometry}
              onChange={(event) => updateSetting('showDebugGeometry', event.target.checked)}
            />
          </div>
          {uiMode === 'advanced' ? (
            <>
              <div className="field">
                <label htmlFor="three-line-render-mode">three.js Line Mode</label>
                <Select
                  value={threeLineRenderMode}
                  onValueChange={(value) => updateSetting('threeLineRenderMode', value as ThreeLineRenderMode)}
                >
                  <SelectTrigger id="three-line-render-mode" title="Choose how line mode is rendered in three.js." className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fat-lines">Fat Lines</SelectItem>
                    <SelectItem value="instanced-sprites">Instanced Point Sprites</SelectItem>
                  </SelectContent>
                </Select>
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
            </>
          ) : null}
        </div>
      </section> : null}

      {showRenderingSections ? <section className="panel-section">
        <h3 className="panel-section-title">Camera Motion</h3>
        <p className="section-help">Adjust camera animation and recenter the camera on the origin.</p>
        <div className="field-grid">
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
        <div className="action-row">
          <Button type="button" size="sm" title="Recenter camera on the pattern origin." onClick={onRecenterCamera}>
            Recenter
          </Button>
        </div>
      </section> : null}

      {showSymmetrySection ? <section className="panel-section">
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
      </section> : null}

      {showPatternSections && uiMode === 'advanced' ? <section className="panel-section">
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
            <Select value={noiseMode} onValueChange={(value) => updateSetting('noiseMode', value as NoiseMode)}>
              <SelectTrigger id="noise-mode" title="Select noise algorithm or disable noise." className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="grain">Grain</SelectItem>
                <SelectItem value="flow">Flow</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="field">
            <label htmlFor="noise-amt">Noise Amount ({noiseAmount.toFixed(2)})</label>
            <Slider
              id="noise-amt"
              min={0}
              max={Math.max(1, noiseAmount)}
              step={0.05}
              value={[noiseAmount]}
              onValueChange={(value) => updateSetting('noiseAmount', value[0] ?? noiseAmount)}
              disabled={noiseMode === 'off'}
              aria-label="Noise Amount"
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
      </section> : null}

      {showRenderingSections && uiMode === 'advanced' ? <section className="panel-section">
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
      </section> : null}

      {showRenderingSections && uiMode === 'advanced' ? <section className="panel-section">
        <h3 className="panel-section-title">Stroke Geometry</h3>
        <p className="section-help">Configure line thickness behavior and dash patterns.</p>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="stroke-width-mode">Stroke Width Mode</label>
            <Select value={strokeWidthMode} onValueChange={(value) => updateSetting('strokeWidthMode', value as StrokeWidthMode)}>
              <SelectTrigger id="stroke-width-mode" title="Set how stroke width is computed along the path." className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed Width</SelectItem>
                <SelectItem value="speed">Width by Speed</SelectItem>
                <SelectItem value="curvature">Width by Curvature</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="field">
            <label htmlFor="base-line-width">Base Width ({baseLineWidth.toFixed(1)})</label>
            <Slider
              id="base-line-width"
              min={0.2}
              max={Math.max(8, baseLineWidth)}
              step={0.1}
              value={[baseLineWidth]}
              onValueChange={(value) => updateSetting('baseLineWidth', value[0] ?? baseLineWidth)}
              aria-label="Base Width"
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
          <div className="field">
            <label htmlFor="trail-smoothing">Trail Smoothing ({trailSmoothing.toFixed(2)})</label>
            <Slider
              id="trail-smoothing"
              min={0}
              max={1}
              step={0.05}
              value={[trailSmoothing]}
              onValueChange={(value) => updateSetting('trailSmoothing', value[0] ?? trailSmoothing)}
              aria-label="Trail Smoothing"
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
        </div>
      </section> : null}

      {showRenderingSections && uiMode === 'advanced' ? <section className="panel-section">
        <h3 className="panel-section-title">Line Material</h3>
        <p className="section-help">Configure physical material properties for fat-line rendering.</p>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="line-material-preset">Material Preset</label>
            <Select
              value={lineMaterialPreset}
              onValueChange={(value) => {
                const presetId = value as LineMaterialPresetId
                if (presetId === 'custom') {
                  updateSetting('lineMaterialPreset', 'custom')
                } else {
                  applyMaterialPreset(presetId)
                }
              }}
              disabled={threeLineRenderMode !== 'fat-lines'}
            >
              <SelectTrigger id="line-material-preset" title="Apply a bundled physical material setup for ribbon lines." className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="matte-ribbon">Matte Ribbon</SelectItem>
                <SelectItem value="satin-plastic">Satin Plastic</SelectItem>
                <SelectItem value="brushed-metal">Brushed Metal</SelectItem>
                <SelectItem value="chrome">Chrome</SelectItem>
                <SelectItem value="frosted-glass">Frosted Glass</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
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
      </section> : null}
    </section>
  )
}
