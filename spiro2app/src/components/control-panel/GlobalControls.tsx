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
}

export function GlobalControls({
  uiMode,
  scope = 'all',
  settings,
  selectedStylePresetId,
  onStylePresetSelect,
  updateSetting,
  onRecenterCamera,
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
    maxTrailPointsPerLayer,
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

  const updateMaterialSetting = <
    K extends
      | 'lineMaterialColor'
      | 'lineMaterialMetalness'
      | 'lineMaterialRoughness'
      | 'lineMaterialClearcoat'
      | 'lineMaterialClearcoatRoughness'
      | 'lineMaterialTransmission'
      | 'lineMaterialThickness'
      | 'lineMaterialIor',
  >(
    key: K,
    value: GlobalSettings[K]
  ) => {
    if (lineMaterialPreset !== 'custom') {
      updateSetting('lineMaterialPreset', 'custom')
    }
    updateSetting(key, value)
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
                    <SelectItem value="tube-mesh">Tube Mesh (Static)</SelectItem>
                    <SelectItem value="instanced-sprites">Instanced Point Sprites</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="field">
                <label htmlFor="three-sprite-size">Sprite Size ({threeSpriteSize.toFixed(2)})</label>
                <Slider
                  id="three-sprite-size"
                  min={0.2}
                  max={4}
                  step={0.1}
                  value={[threeSpriteSize]}
                  onValueChange={(value) => updateSetting('threeSpriteSize', value[0] ?? threeSpriteSize)}
                  disabled={threeLineRenderMode !== 'instanced-sprites'}
                  aria-label="Sprite Size"
                />
              </div>
              <div className="field">
                <label htmlFor="three-sprite-softness">Sprite Softness ({threeSpriteSoftness.toFixed(2)})</label>
                <Slider
                  id="three-sprite-softness"
                  min={0}
                  max={1}
                  step={0.05}
                  value={[threeSpriteSoftness]}
                  onValueChange={(value) => updateSetting('threeSpriteSoftness', value[0] ?? threeSpriteSoftness)}
                  disabled={threeLineRenderMode !== 'instanced-sprites'}
                  aria-label="Sprite Softness"
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
            <label htmlFor="auto-rotate-speed">Auto Rotate Speed ({autoRotateSpeed.toFixed(1)})</label>
            <Slider
              id="auto-rotate-speed"
              min={-10}
              max={10}
              step={0.1}
              value={[autoRotateSpeed]}
              onValueChange={(value) => updateSetting('autoRotateSpeed', value[0] ?? autoRotateSpeed)}
              disabled={!autoRotateScene}
              aria-label="Auto Rotate Speed"
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
            <label htmlFor="repeat">Rotational Repeats ({rotationalRepeats})</label>
            <Slider
              id="repeat"
              min={1}
              max={16}
              step={1}
              value={[rotationalRepeats]}
              onValueChange={(value) => updateSetting('rotationalRepeats', Math.round(value[0] ?? rotationalRepeats))}
              aria-label="Rotational Repeats"
            />
          </div>
          <div className="field">
            <label htmlFor="repeat-offset">Rotation Offset (deg) ({rotationOffsetDeg.toFixed(0)})</label>
            <Slider
              id="repeat-offset"
              min={Math.min(-180, rotationOffsetDeg)}
              max={Math.max(180, rotationOffsetDeg)}
              step={1}
              value={[rotationOffsetDeg]}
              onValueChange={(value) => updateSetting('rotationOffsetDeg', value[0] ?? rotationOffsetDeg)}
              aria-label="Rotation Offset"
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
            <label htmlFor="phase-mod">Phase Mod ({phaseMod.toFixed(2)})</label>
            <Slider
              id="phase-mod"
              min={Math.min(-2, phaseMod)}
              max={Math.max(2, phaseMod)}
              step={0.05}
              value={[phaseMod]}
              onValueChange={(value) => updateSetting('phaseMod', value[0] ?? phaseMod)}
              aria-label="Phase Mod"
            />
          </div>
          <div className="field">
            <label htmlFor="freq-mod">Frequency Mod ({frequencyMod.toFixed(2)})</label>
            <Slider
              id="freq-mod"
              min={Math.min(-2, frequencyMod)}
              max={Math.max(2, frequencyMod)}
              step={0.05}
              value={[frequencyMod]}
              onValueChange={(value) => updateSetting('frequencyMod', value[0] ?? frequencyMod)}
              aria-label="Frequency Mod"
            />
          </div>
          <div className="field">
            <label htmlFor="amp-mod">Amplitude Mod ({amplitudeMod.toFixed(2)})</label>
            <Slider
              id="amp-mod"
              min={Math.min(-2, amplitudeMod)}
              max={Math.max(2, amplitudeMod)}
              step={0.05}
              value={[amplitudeMod]}
              onValueChange={(value) => updateSetting('amplitudeMod', value[0] ?? amplitudeMod)}
              aria-label="Amplitude Mod"
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
            <label htmlFor="noise-freq">Noise Frequency ({noiseFrequency.toFixed(2)})</label>
            <Slider
              id="noise-freq"
              min={0.1}
              max={Math.max(10, noiseFrequency)}
              step={0.1}
              value={[noiseFrequency]}
              onValueChange={(value) => updateSetting('noiseFrequency', value[0] ?? noiseFrequency)}
              disabled={noiseMode === 'off'}
              aria-label="Noise Frequency"
            />
          </div>
          <div className="field">
            <label htmlFor="noise-speed">Noise Speed ({noiseSpeed.toFixed(2)})</label>
            <Slider
              id="noise-speed"
              min={0}
              max={Math.max(5, noiseSpeed)}
              step={0.05}
              value={[noiseSpeed]}
              onValueChange={(value) => updateSetting('noiseSpeed', value[0] ?? noiseSpeed)}
              disabled={noiseMode === 'off'}
              aria-label="Noise Speed"
            />
          </div>
          <div className="field">
            <label htmlFor="noise-oct">Noise Octaves ({noiseOctaves})</label>
            <Slider
              id="noise-oct"
              min={1}
              max={6}
              step={1}
              value={[noiseOctaves]}
              onValueChange={(value) => updateSetting('noiseOctaves', Math.round(value[0] ?? noiseOctaves))}
              disabled={noiseMode !== 'flow'}
              aria-label="Noise Octaves"
            />
          </div>
          <div className="field">
            <label htmlFor="noise-seed">Noise Seed ({noiseSeed.toFixed(1)})</label>
            <Slider
              id="noise-seed"
              min={Math.min(-100, noiseSeed)}
              max={Math.max(100, noiseSeed)}
              step={0.1}
              value={[noiseSeed]}
              onValueChange={(value) => updateSetting('noiseSeed', value[0] ?? noiseSeed)}
              disabled={noiseMode === 'off'}
              aria-label="Noise Seed"
            />
          </div>
        </div>
      </section> : null}

      {showRenderingSections && uiMode === 'advanced' ? <section className="panel-section">
        <h3 className="panel-section-title">Performance</h3>
        <p className="section-help">Balance smoothness and frame rate by constraining trail size.</p>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="max-trail">Max Trail Points ({maxTrailPointsPerLayer})</label>
            <Slider
              id="max-trail"
              min={1000}
              max={Math.max(50000, maxTrailPointsPerLayer)}
              step={500}
              value={[maxTrailPointsPerLayer]}
              onValueChange={(value) => updateSetting('maxTrailPointsPerLayer', Math.round(value[0] ?? maxTrailPointsPerLayer))}
              aria-label="Max Trail Points"
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
              max={50}
              step={0.1}
              value={[baseLineWidth]}
              onValueChange={(value) => updateSetting('baseLineWidth', value[0] ?? baseLineWidth)}
              aria-label="Base Width"
            />
          </div>
          <div className="field">
            <label htmlFor="line-width-boost">Width Boost ({lineWidthBoost.toFixed(1)})</label>
            <Slider
              id="line-width-boost"
              min={0}
              max={Math.max(20, lineWidthBoost)}
              step={0.1}
              value={[lineWidthBoost]}
              onValueChange={(value) => updateSetting('lineWidthBoost', value[0] ?? lineWidthBoost)}
              aria-label="Width Boost"
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
            <label htmlFor="dash-length">Dash Length ({dashLength.toFixed(0)})</label>
            <Slider
              id="dash-length"
              min={1}
              max={Math.max(100, dashLength)}
              step={1}
              value={[dashLength]}
              onValueChange={(value) => updateSetting('dashLength', Math.round(value[0] ?? dashLength))}
              disabled={!dashedLines}
              aria-label="Dash Length"
            />
          </div>
          <div className="field">
            <label htmlFor="dash-gap">Dash Gap ({dashGap.toFixed(0)})</label>
            <Slider
              id="dash-gap"
              min={0}
              max={Math.max(100, dashGap)}
              step={1}
              value={[dashGap]}
              onValueChange={(value) => updateSetting('dashGap', Math.round(value[0] ?? dashGap))}
              disabled={!dashedLines}
              aria-label="Dash Gap"
            />
          </div>
        </div>
      </section> : null}

      {showRenderingSections && uiMode === 'advanced' ? <section className="panel-section">
        <h3 className="panel-section-title">Line Material</h3>
        <p className="section-help">Choose a bundled physical material setup for ribbon and tube rendering.</p>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="line-material-preset">Material Preset</label>
            <Select
              value={lineMaterialPreset === 'custom' ? 'matte-ribbon' : lineMaterialPreset}
              onValueChange={(value) => {
                const presetId = value as Exclude<LineMaterialPresetId, 'custom'>
                applyMaterialPreset(presetId)
              }}
              disabled={threeLineRenderMode === 'instanced-sprites'}
            >
              <SelectTrigger id="line-material-preset" title="Apply a bundled physical material setup for ribbon and tube lines." className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="matte-ribbon">Matte Ribbon</SelectItem>
                <SelectItem value="satin-plastic">Satin Plastic</SelectItem>
                <SelectItem value="brushed-metal">Brushed Metal</SelectItem>
                <SelectItem value="chrome">Chrome</SelectItem>
                <SelectItem value="frosted-glass">Frosted Glass</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section> : null}

      {showRenderingSections && uiMode === 'advanced' ? <section className="panel-section">
        <h3 className="panel-section-title">Material Settings</h3>
        <p className="section-help">Fine-tune physically based material properties for the rendered line geometry.</p>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="line-material-color">Base Color</label>
            <input
              id="line-material-color"
              type="color"
              title="Set the base material color."
              value={lineMaterialColor}
              onChange={(event) => updateMaterialSetting('lineMaterialColor', event.target.value)}
              disabled={threeLineRenderMode === 'instanced-sprites'}
            />
          </div>
          <div className="field">
            <label htmlFor="line-material-metalness">Metalness ({lineMaterialMetalness.toFixed(2)})</label>
            <Slider
              id="line-material-metalness"
              min={0}
              max={1}
              step={0.01}
              value={[lineMaterialMetalness]}
              onValueChange={(value) => updateMaterialSetting('lineMaterialMetalness', value[0] ?? lineMaterialMetalness)}
              disabled={threeLineRenderMode === 'instanced-sprites'}
              aria-label="Material Metalness"
            />
          </div>
          <div className="field">
            <label htmlFor="line-material-roughness">Roughness ({lineMaterialRoughness.toFixed(2)})</label>
            <Slider
              id="line-material-roughness"
              min={0}
              max={1}
              step={0.01}
              value={[lineMaterialRoughness]}
              onValueChange={(value) => updateMaterialSetting('lineMaterialRoughness', value[0] ?? lineMaterialRoughness)}
              disabled={threeLineRenderMode === 'instanced-sprites'}
              aria-label="Material Roughness"
            />
          </div>
          <div className="field">
            <label htmlFor="line-material-clearcoat">Clearcoat ({lineMaterialClearcoat.toFixed(2)})</label>
            <Slider
              id="line-material-clearcoat"
              min={0}
              max={1}
              step={0.01}
              value={[lineMaterialClearcoat]}
              onValueChange={(value) => updateMaterialSetting('lineMaterialClearcoat', value[0] ?? lineMaterialClearcoat)}
              disabled={threeLineRenderMode === 'instanced-sprites'}
              aria-label="Material Clearcoat"
            />
          </div>
          <div className="field">
            <label htmlFor="line-material-clearcoat-roughness">Clearcoat Roughness ({lineMaterialClearcoatRoughness.toFixed(2)})</label>
            <Slider
              id="line-material-clearcoat-roughness"
              min={0}
              max={1}
              step={0.01}
              value={[lineMaterialClearcoatRoughness]}
              onValueChange={(value) =>
                updateMaterialSetting('lineMaterialClearcoatRoughness', value[0] ?? lineMaterialClearcoatRoughness)
              }
              disabled={threeLineRenderMode === 'instanced-sprites'}
              aria-label="Material Clearcoat Roughness"
            />
          </div>
          <div className="field">
            <label htmlFor="line-material-transmission">Transmission ({lineMaterialTransmission.toFixed(2)})</label>
            <Slider
              id="line-material-transmission"
              min={0}
              max={1}
              step={0.01}
              value={[lineMaterialTransmission]}
              onValueChange={(value) => updateMaterialSetting('lineMaterialTransmission', value[0] ?? lineMaterialTransmission)}
              disabled={threeLineRenderMode === 'instanced-sprites'}
              aria-label="Material Transmission"
            />
          </div>
          <div className="field">
            <label htmlFor="line-material-thickness">Thickness ({lineMaterialThickness.toFixed(2)})</label>
            <Slider
              id="line-material-thickness"
              min={0}
              max={4}
              step={0.01}
              value={[lineMaterialThickness]}
              onValueChange={(value) => updateMaterialSetting('lineMaterialThickness', value[0] ?? lineMaterialThickness)}
              disabled={threeLineRenderMode === 'instanced-sprites'}
              aria-label="Material Thickness"
            />
          </div>
          <div className="field">
            <label htmlFor="line-material-ior">IOR ({lineMaterialIor.toFixed(2)})</label>
            <Slider
              id="line-material-ior"
              min={1}
              max={2.33}
              step={0.01}
              value={[lineMaterialIor]}
              onValueChange={(value) => updateMaterialSetting('lineMaterialIor', value[0] ?? lineMaterialIor)}
              disabled={threeLineRenderMode === 'instanced-sprites'}
              aria-label="Material IOR"
            />
          </div>
        </div>
      </section> : null}

    </section>
  )
}
