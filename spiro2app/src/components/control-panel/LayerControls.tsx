import { EQUATION_EXAMPLES, PRESETS } from '@/spiro/constants'
import type { ColorMode, CustomPreset, LayerConfig, MultiLineMotionMode, PaletteId } from '@/spiro/types'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

export type LayerControlsProps = {
  uiMode: 'basic' | 'advanced'
  curveScope?: 'all' | 'basic-only' | 'advanced-only'
  showPresetLibrary?: boolean
  presetMode?: 'full' | 'picker-only' | 'manage-only'
  showNonPresetSections?: boolean
  sectionScope?: 'all' | 'non-color' | 'color-only'
  selectedPresetId: string
  customPresets: CustomPreset[]
  customPresetName: string
  activeCustomPreset: CustomPreset | null
  activeLayer: LayerConfig | undefined
  equationExampleId: string
  activeEquation: 'x' | 'y' | 'z'
  setCustomPresetName: (value: string) => void
  setActiveEquation: (value: 'x' | 'y' | 'z') => void
  onPresetSelect: (value: string) => void
  updateActiveLayer: (patch: Partial<LayerConfig>) => void
  saveNewCustomPreset: () => void
  updateCurrentCustomPreset: () => void
  renameCurrentCustomPreset: () => void
  deleteCurrentCustomPreset: () => void
  exportCustomPresets: () => void
  importCustomPresets: () => void
  applyEquationExample: (id: string) => void
  insertSnippet: (snippet: string) => void
}

export function LayerControls({
  uiMode,
  curveScope = 'all',
  showPresetLibrary = true,
  presetMode = 'full',
  showNonPresetSections = true,
  sectionScope = 'all',
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
}: LayerControlsProps) {
  const showBasicCurveFields = curveScope !== 'advanced-only'
  const showAdvancedCurveFields = uiMode === 'advanced' && curveScope !== 'basic-only'
  const showPresetPicker = presetMode !== 'manage-only'
  const showPresetManagement = uiMode === 'advanced' && presetMode !== 'picker-only'
  const showCoreSections = showNonPresetSections && sectionScope !== 'color-only'
  const showColorSection = uiMode === 'advanced' && sectionScope !== 'non-color'
  const layerR = activeLayer?.R ?? 0
  const layerSmallR = activeLayer?.r ?? 0
  const layerD = activeLayer?.d ?? 0
  const layerSpeed = activeLayer?.speed ?? 0
  const layerMultiLineCount = activeLayer?.multiLineCount ?? 1
  const layerMultiLineSpread = activeLayer?.multiLineSpread ?? 14
  const layerMultiLineMotionSpeed = activeLayer?.multiLineMotionSpeed ?? 1
  const layerUSpeed = activeLayer?.uSpeed ?? 0
  const layerLineLifetime = activeLayer?.lineLifetime ?? 0.2
  const layerBaseHue = activeLayer?.baseHue ?? 210

  return (
    <section className="control-group" aria-label="Layer Controls">
      {showPresetLibrary ? <section className="panel-section">
        <h3 className="panel-section-title">Preset Library</h3>
        <p className="section-help">Choose a starting preset and manage saved custom presets.</p>

        {showPresetPicker ? (
          <div className="field field-span-2">
            <label htmlFor="preset">Preset</label>
            <Select value={selectedPresetId} onValueChange={onPresetSelect}>
              <SelectTrigger id="preset" title="Built-in presets are templates. Custom presets are your saved layer settings." className="w-full">
                <SelectValue placeholder="Select preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Built-in</SelectLabel>
                  {PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={`builtin:${preset.id}`}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Custom</SelectLabel>
                  {customPresets.length > 0 ? (
                    customPresets.map((preset) => (
                      <SelectItem key={preset.id} value={`custom:${preset.id}`}>
                        {preset.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="custom:__none__" disabled>
                      No custom presets
                    </SelectItem>
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {showPresetManagement ? (
          <>
            <div className="field-grid">
              <div className="field field-span-2">
                <label htmlFor="custom-preset-name">Custom Preset Name</label>
                <input
                  id="custom-preset-name"
                  title="Name used when saving or renaming a custom preset."
                  value={customPresetName}
                  onChange={(event) => setCustomPresetName(event.target.value)}
                />
              </div>
            </div>

            <div className="action-row">
              <Button type="button" size="sm" title="Save current layer settings as a new custom preset." onClick={saveNewCustomPreset}>Save New</Button>
              <Button type="button" size="sm" title="Overwrite the selected custom preset with current settings." onClick={updateCurrentCustomPreset} disabled={!activeCustomPreset}>Update</Button>
              <Button type="button" size="sm" title="Rename the selected custom preset." onClick={renameCurrentCustomPreset} disabled={!activeCustomPreset}>Rename</Button>
              <Button type="button" size="sm" variant="destructive" title="Delete the selected custom preset permanently." onClick={deleteCurrentCustomPreset} disabled={!activeCustomPreset}>Delete</Button>
              <Button type="button" size="sm" variant="secondary" title="Copy all custom presets as JSON." onClick={exportCustomPresets}>Export JSON</Button>
              <Button type="button" size="sm" variant="secondary" title="Replace current custom presets from pasted JSON." onClick={importCustomPresets}>Import JSON</Button>
            </div>
          </>
        ) : null}
      </section> : null}

      {showCoreSections && uiMode === 'advanced' ? <section className="panel-section">
        <h3 className="panel-section-title">Equations</h3>
        <p className="section-help">Define parametric formulas for x, y, and z. These formulas run continuously over time variables t and u.</p>
        <p className="section-help">
          Equation helpers: sin, cos, tan, sqrt, pow, PI, E, clamp(v,lo,hi), mix(a,b,p), saw(v), triangle(v), pulse(v,w). Time terms: t and u.
        </p>

        <div className="field-grid">
          <div className="field field-span-2">
            <label htmlFor="equation-x">x(t,u)</label>
            <input
              id="equation-x"
              title="Expression for x(t,u). Example: cos(t) * (R - r) + d * cos((R - r) / r * t)"
              value={activeLayer?.exprX ?? ''}
              onChange={(event) => updateActiveLayer({ exprX: event.target.value })}
              onFocus={() => setActiveEquation('x')}
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          <div className="field field-span-2">
            <label htmlFor="equation-y">y(t,u)</label>
            <input
              id="equation-y"
              title="Expression for y(t,u). Use same function library as x(t,u)."
              value={activeLayer?.exprY ?? ''}
              onChange={(event) => updateActiveLayer({ exprY: event.target.value })}
              onFocus={() => setActiveEquation('y')}
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          <div className="field field-span-2">
            <label htmlFor="equation-z">z(t,u)</label>
            <input
              id="equation-z"
              title="Expression for z(t,u). Use 0 for a flat plane."
              value={activeLayer?.exprZ ?? '0'}
              onChange={(event) => updateActiveLayer({ exprZ: event.target.value })}
              onFocus={() => setActiveEquation('z')}
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label htmlFor="equation-example">Example</label>
            <Select
              value={equationExampleId || '__custom__'}
              onValueChange={(value) => applyEquationExample(value === '__custom__' ? '' : value)}
            >
              <SelectTrigger id="equation-example" title="Apply a predefined equation set." className="w-full">
                <SelectValue placeholder="Custom" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__custom__">Custom</SelectItem>
                {EQUATION_EXAMPLES.map((example) => (
                  <SelectItem key={example.id} value={example.id}>
                    {example.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="field">
            <label htmlFor="active-equation">Target</label>
            <Select value={activeEquation} onValueChange={(value) => setActiveEquation(value as 'x' | 'y' | 'z')}>
              <SelectTrigger id="active-equation" title="Choose whether snippet buttons append to x(t,u), y(t,u), or z(t,u)." className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="x">x(t,u)</SelectItem>
                <SelectItem value="y">y(t,u)</SelectItem>
                <SelectItem value="z">z(t,u)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="action-row">
          <Button type="button" size="sm" variant="secondary" title="Append a sine-wave term to the active equation." onClick={() => insertSnippet(' + 0.4 * sin(u)')}>+sin(u)</Button>
          <Button type="button" size="sm" variant="secondary" title="Append a triangle-wave term to the active equation." onClick={() => insertSnippet(' + 0.3 * triangle(u)')}>+triangle(u)</Button>
          <Button type="button" size="sm" variant="secondary" title="Append a saw-wave term to the active equation." onClick={() => insertSnippet(' + 0.25 * saw(u)')}>+saw(u)</Button>
          <Button type="button" size="sm" variant="secondary" title="Append a pulse-wave term to the active equation." onClick={() => insertSnippet(' + pulse(u, 0.2)')}>+pulse</Button>
        </div>
      </section> : null}

      {showCoreSections ? <section className="panel-section">
        <h3 className="panel-section-title">Curve</h3>
        <p className="section-help">Shape and timing controls for the selected layer trajectory and trail behavior.</p>
        <div className="field-grid">
          {showBasicCurveFields ? (
            <>
              <div className="field">
                <label htmlFor="r-big">R (Outer Radius) ({layerR.toFixed(1)})</label>
                <Slider
                  id="r-big"
                  min={Math.min(-20, layerR)}
                  max={Math.max(20, layerR)}
                  step={0.2}
                  value={[layerR]}
                  onValueChange={(value) => updateActiveLayer({ R: value[0] ?? layerR })}
                  aria-label="R (Outer Radius)"
                />
              </div>
              <div className="field">
                <label htmlFor="r-small">r (Inner Radius) ({layerSmallR.toFixed(1)})</label>
                <Slider
                  id="r-small"
                  min={Math.min(-20, layerSmallR)}
                  max={Math.max(20, layerSmallR)}
                  step={0.1}
                  value={[layerSmallR]}
                  onValueChange={(value) => updateActiveLayer({ r: value[0] ?? layerSmallR })}
                  aria-label="r (Inner Radius)"
                />
              </div>
              <div className="field">
                <label htmlFor="offset">d (Pen Offset) ({layerD.toFixed(1)})</label>
                <Slider
                  id="offset"
                  min={Math.min(-20, layerD)}
                  max={Math.max(20, layerD)}
                  step={0.1}
                  value={[layerD]}
                  onValueChange={(value) => updateActiveLayer({ d: value[0] ?? layerD })}
                  aria-label="d (Pen Offset)"
                />
              </div>
              <div className="field">
                <label htmlFor="speed">Speed ({layerSpeed.toFixed(1)})</label>
                <Slider
                  id="speed"
                  min={0}
                  max={Math.max(8, layerSpeed)}
                  step={0.1}
                  value={[layerSpeed]}
                  onValueChange={(value) => updateActiveLayer({ speed: value[0] ?? layerSpeed })}
                  aria-label="Speed"
                />
              </div>
            </>
          ) : null}

          {showAdvancedCurveFields ? (
            <>
              <div className="field">
                <label htmlFor="u-speed">u Speed ({layerUSpeed.toFixed(2)})</label>
                <Slider
                  id="u-speed"
                  min={Math.min(-4, layerUSpeed)}
                  max={Math.max(4, layerUSpeed)}
                  step={0.05}
                  value={[layerUSpeed]}
                  onValueChange={(value) => updateActiveLayer({ uSpeed: value[0] ?? layerUSpeed })}
                  aria-label="u Speed"
                />
              </div>
              <div className="field">
                <label htmlFor="line-life">Lifetime (s) ({layerLineLifetime.toFixed(1)})</label>
                <Slider
                  id="line-life"
                  min={0.2}
                  max={Math.max(60, layerLineLifetime)}
                  step={0.2}
                  value={[layerLineLifetime]}
                  onValueChange={(value) => updateActiveLayer({ lineLifetime: Math.max(0.2, value[0] ?? layerLineLifetime) })}
                  disabled={activeLayer?.lineForever ?? false}
                  aria-label="Lifetime"
                />
              </div>
              <div className="field checkbox-field">
                <label htmlFor="line-forever">Forever</label>
                <input
                  id="line-forever"
                  type="checkbox"
                  title="Keep full trail instead of fading old segments."
                  checked={activeLayer?.lineForever ?? false}
                  onChange={(event) => updateActiveLayer({ lineForever: event.target.checked })}
                />
              </div>
            </>
          ) : null}
          {showBasicCurveFields ? (
            <>
              <div className="field">
                <label htmlFor="multi-line-count">Line Copies ({layerMultiLineCount})</label>
                <Slider
                  id="multi-line-count"
                  min={1}
                  max={16}
                  step={1}
                  value={[layerMultiLineCount]}
                  onValueChange={(value) => updateActiveLayer({ multiLineCount: Math.round(value[0] ?? layerMultiLineCount) })}
                  aria-label="Line Copies"
                />
              </div>
              <div className="field">
                <label htmlFor="multi-line-motion">Line Motion</label>
                <Select
                  value={activeLayer?.multiLineMotion ?? 'fixed'}
                  onValueChange={(value) => updateActiveLayer({ multiLineMotion: value as MultiLineMotionMode })}
                >
                  <SelectTrigger id="multi-line-motion" title="How line copies move around the particle point." className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="orbit">Orbit</SelectItem>
                    <SelectItem value="random">Random</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="field">
                <label htmlFor="multi-line-spread">Line Spread (px) ({layerMultiLineSpread.toFixed(0)})</label>
                <Slider
                  id="multi-line-spread"
                  min={0}
                  max={Math.max(80, layerMultiLineSpread)}
                  step={1}
                  value={[layerMultiLineSpread]}
                  onValueChange={(value) => updateActiveLayer({ multiLineSpread: Math.max(0, value[0] ?? layerMultiLineSpread) })}
                  aria-label="Line Spread"
                />
              </div>
              <div className="field">
                <label htmlFor="multi-line-motion-speed">Motion Speed ({layerMultiLineMotionSpeed.toFixed(1)})</label>
                <Slider
                  id="multi-line-motion-speed"
                  min={0}
                  max={Math.max(6, layerMultiLineMotionSpeed)}
                  step={0.1}
                  value={[layerMultiLineMotionSpeed]}
                  onValueChange={(value) => updateActiveLayer({ multiLineMotionSpeed: value[0] ?? layerMultiLineMotionSpeed })}
                  aria-label="Motion Speed"
                />
              </div>
            </>
          ) : null}
        </div>
      </section> : null}

      {showColorSection ? <section className="panel-section">
        <h3 className="panel-section-title">Color</h3>
        <p className="section-help">Set how color is computed for this layer, including palette-based and fixed-hue options.</p>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="color-mode">Color Mode</label>
            <Select
              value={activeLayer?.colorMode ?? 'hue-cycle'}
              onValueChange={(value) => updateActiveLayer({ colorMode: value as ColorMode })}
            >
              <SelectTrigger id="color-mode" title="Select color logic source: hue cycle, palette, age, speed, or curvature." className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hue-cycle">Hue Cycle</SelectItem>
                <SelectItem value="palette">Palette Sweep</SelectItem>
                <SelectItem value="age">By Age</SelectItem>
                <SelectItem value="speed">By Speed</SelectItem>
                <SelectItem value="curvature">By Curvature</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="field">
            <label htmlFor="palette">Palette</label>
            <Select
              value={activeLayer?.paletteId ?? 'neon'}
              onValueChange={(value) => updateActiveLayer({ paletteId: value as PaletteId })}
            >
              <SelectTrigger id="palette" title="Palette used when Color Mode is set to Palette Sweep." className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="neon">Neon</SelectItem>
                <SelectItem value="sunset">Sunset</SelectItem>
                <SelectItem value="ocean">Ocean</SelectItem>
                <SelectItem value="forest">Forest</SelectItem>
                <SelectItem value="candy">Candy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="field checkbox-field">
            <label htmlFor="hue-lock">Hue Lock</label>
            <input
              id="hue-lock"
              type="checkbox"
              title="Use a fixed hue instead of dynamic hue cycling."
              checked={activeLayer?.hueLock ?? false}
              onChange={(event) => updateActiveLayer({ hueLock: event.target.checked })}
            />
          </div>
          <div className="field">
            <label htmlFor="base-hue">Base Hue ({layerBaseHue.toFixed(0)})</label>
            <Slider
              id="base-hue"
              min={0}
              max={360}
              step={1}
              value={[layerBaseHue]}
              onValueChange={(value) => updateActiveLayer({ baseHue: value[0] ?? layerBaseHue })}
              disabled={!(activeLayer?.hueLock ?? false)}
              aria-label="Base Hue"
            />
          </div>
        </div>
      </section> : null}
    </section>
  )
}
