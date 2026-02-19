import type { NoiseMode, StrokeWidthMode } from '@/spiro/types'

export type GlobalControlsProps = {
  rotationalRepeats: number
  rotationOffsetDeg: number
  mirrorX: boolean
  mirrorY: boolean
  phaseMod: number
  frequencyMod: number
  amplitudeMod: number
  noiseMode: NoiseMode
  noiseAmount: number
  noiseFrequency: number
  noiseSpeed: number
  noiseOctaves: number
  noiseSeed: number
  adaptiveQuality: boolean
  maxTrailPointsPerLayer: number
  maxAdaptiveStep: number
  strokeWidthMode: StrokeWidthMode
  baseLineWidth: number
  lineWidthBoost: number
  dashedLines: boolean
  dashLength: number
  dashGap: number
  glowAmount: number
  setRotationalRepeats: (value: number) => void
  setRotationOffsetDeg: (value: number) => void
  setMirrorX: (value: boolean) => void
  setMirrorY: (value: boolean) => void
  setPhaseMod: (value: number) => void
  setFrequencyMod: (value: number) => void
  setAmplitudeMod: (value: number) => void
  setNoiseMode: (value: NoiseMode) => void
  setNoiseAmount: (value: number) => void
  setNoiseFrequency: (value: number) => void
  setNoiseSpeed: (value: number) => void
  setNoiseOctaves: (value: number) => void
  setNoiseSeed: (value: number) => void
  setAdaptiveQuality: (value: boolean) => void
  setMaxTrailPointsPerLayer: (value: number) => void
  setMaxAdaptiveStep: (value: number) => void
  setStrokeWidthMode: (value: StrokeWidthMode) => void
  setBaseLineWidth: (value: number) => void
  setLineWidthBoost: (value: number) => void
  setDashedLines: (value: boolean) => void
  setDashLength: (value: number) => void
  setDashGap: (value: number) => void
  setGlowAmount: (value: number) => void
  parseNumber: (value: string, fallback: number) => number
}

export function GlobalControls({
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
}: GlobalControlsProps) {
  return (
    <section className="control-group" aria-label="Global Controls">
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
              onChange={(event) =>
                setRotationalRepeats(Math.max(1, Math.min(16, Math.round(parseNumber(event.target.value, rotationalRepeats)))))
              }
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
              onChange={(event) => setRotationOffsetDeg(parseNumber(event.target.value, rotationOffsetDeg))}
            />
          </div>
          <div className="field checkbox-field">
            <label htmlFor="mirror-x">Mirror X</label>
            <input id="mirror-x" type="checkbox" title="Mirror output across the X axis." checked={mirrorX} onChange={(event) => setMirrorX(event.target.checked)} />
          </div>
          <div className="field checkbox-field">
            <label htmlFor="mirror-y">Mirror Y</label>
            <input id="mirror-y" type="checkbox" title="Mirror output across the Y axis." checked={mirrorY} onChange={(event) => setMirrorY(event.target.checked)} />
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
              onChange={(event) => setPhaseMod(parseNumber(event.target.value, phaseMod))}
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
              onChange={(event) => setFrequencyMod(parseNumber(event.target.value, frequencyMod))}
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
              onChange={(event) => setAmplitudeMod(parseNumber(event.target.value, amplitudeMod))}
            />
          </div>
          <div className="field">
            <label htmlFor="noise-mode">Noise Mode</label>
            <select id="noise-mode" title="Select noise algorithm or disable noise." value={noiseMode} onChange={(event) => setNoiseMode(event.target.value as NoiseMode)}>
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
              onChange={(event) => setNoiseAmount(Math.max(0, parseNumber(event.target.value, noiseAmount)))}
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
              onChange={(event) => setNoiseFrequency(Math.max(0.1, parseNumber(event.target.value, noiseFrequency)))}
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
              onChange={(event) => setNoiseSpeed(Math.max(0, parseNumber(event.target.value, noiseSpeed)))}
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
              onChange={(event) => setNoiseOctaves(Math.max(1, Math.min(6, Math.round(parseNumber(event.target.value, noiseOctaves)))))}
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
              onChange={(event) => setNoiseSeed(parseNumber(event.target.value, noiseSeed))}
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
              onChange={(event) => setAdaptiveQuality(event.target.checked)}
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
              onChange={(event) =>
                setMaxTrailPointsPerLayer(Math.max(1000, Math.round(parseNumber(event.target.value, maxTrailPointsPerLayer))))
              }
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
              onChange={(event) => setMaxAdaptiveStep(Math.max(1, Math.min(8, Math.round(parseNumber(event.target.value, maxAdaptiveStep)))))}
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
              onChange={(event) => setStrokeWidthMode(event.target.value as StrokeWidthMode)}
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
              onChange={(event) => setBaseLineWidth(Math.max(0.2, parseNumber(event.target.value, baseLineWidth)))}
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
              onChange={(event) => setLineWidthBoost(Math.max(0, parseNumber(event.target.value, lineWidthBoost)))}
            />
          </div>
          <div className="field checkbox-field">
            <label htmlFor="dashed-lines">Dashed Lines</label>
            <input
              id="dashed-lines"
              type="checkbox"
              title="Render paths as dashed lines."
              checked={dashedLines}
              onChange={(event) => setDashedLines(event.target.checked)}
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
              onChange={(event) => setDashLength(Math.max(1, parseNumber(event.target.value, dashLength)))}
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
              onChange={(event) => setDashGap(Math.max(0, parseNumber(event.target.value, dashGap)))}
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
              onChange={(event) => setGlowAmount(Math.max(0, parseNumber(event.target.value, glowAmount)))}
            />
          </div>
        </div>
      </section>
    </section>
  )
}
