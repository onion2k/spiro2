import type { ChangeEvent } from 'react'

import type { NoiseMode, StrokeWidthMode } from '@/spiro/types'
import type { GlobalSettings } from '@/spiro/renderers/defaults'
import type { ThreeCameraMode, ThreeLineRenderMode } from '@/spiro/renderers/types'

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
    glowAmount,
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
        <p className="section-help">Configure line thickness behavior, dash style, and glow rendering.</p>
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
            <label htmlFor="glow-amount">Glow Amount</label>
            <input
              id="glow-amount"
              type="number"
              title="Blur strength for glow around strokes."
              min="0"
              step="1"
              value={glowAmount}
              onChange={onNumberChange('glowAmount', glowAmount, { min: 0 })}
            />
          </div>
        </div>
      </section>
    </section>
  )
}
