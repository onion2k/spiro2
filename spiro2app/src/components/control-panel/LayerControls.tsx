import { EQUATION_EXAMPLES, PRESETS } from '@/spiro/constants'
import type { ColorMode, CustomPreset, LayerConfig, MultiLineMotionMode, PaletteId } from '@/spiro/types'
import { Button } from '@/components/ui/button'

export type LayerControlsProps = {
  uiMode: 'basic' | 'advanced'
  selectedPresetId: string
  customPresets: CustomPreset[]
  customPresetName: string
  activeCustomPreset: CustomPreset | null
  layers: LayerConfig[]
  activeLayerId: string
  activeLayer: LayerConfig | undefined
  equationExampleId: string
  activeEquation: 'x' | 'y' | 'z'
  setCustomPresetName: (value: string) => void
  setActiveLayerId: (value: string) => void
  setActiveEquation: (value: 'x' | 'y' | 'z') => void
  onPresetSelect: (value: string) => void
  updateActiveLayer: (patch: Partial<LayerConfig>) => void
  saveNewCustomPreset: () => void
  updateCurrentCustomPreset: () => void
  renameCurrentCustomPreset: () => void
  deleteCurrentCustomPreset: () => void
  exportCustomPresets: () => void
  importCustomPresets: () => void
  addLayer: () => void
  duplicateLayer: () => void
  removeLayer: () => void
  applyEquationExample: (id: string) => void
  insertSnippet: (snippet: string) => void
  parseNumber: (value: string, fallback: number) => number
}

export function LayerControls({
  uiMode,
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
}: LayerControlsProps) {
  return (
    <section className="control-group" aria-label="Layer Controls">
      <section className="panel-section">
        <h3 className="panel-section-title">Preset Library</h3>
        <p className="section-help">Choose a starting preset and manage saved custom presets.</p>

        <div className="field field-span-2">
          <label htmlFor="preset">Preset</label>
          <select
            id="preset"
            title="Built-in presets are templates. Custom presets are your saved layer settings."
            value={selectedPresetId}
            onChange={(event) => onPresetSelect(event.target.value)}
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

        {uiMode === 'advanced' ? (
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
      </section>

      <section className="panel-section">
        <h3 className="panel-section-title">Layer Stack</h3>
        <p className="section-help">Select which layer you are editing and manage layer visibility and duplicates.</p>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="layer-select">Layer</label>
            <select id="layer-select" title="Select which layer the controls below edit." value={activeLayerId} onChange={(event) => setActiveLayerId(event.target.value)}>
              {layers.map((layer) => (
                <option key={layer.id} value={layer.id}>
                  {layer.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="layer-name">Layer Name</label>
            <input
              id="layer-name"
              title="Friendly layer name shown in the layer selector."
              value={activeLayer?.name ?? ''}
              onChange={(event) => updateActiveLayer({ name: event.target.value || 'Layer' })}
            />
          </div>
          <div className="field checkbox-field">
            <label htmlFor="layer-visible">Visible</label>
            <input
              id="layer-visible"
              type="checkbox"
              title="Toggle whether this layer is rendered."
              checked={activeLayer?.visible ?? true}
              onChange={(event) => updateActiveLayer({ visible: event.target.checked })}
            />
          </div>
        </div>

        <div className="action-row">
          <Button type="button" size="sm" title="Add a new layer using current settings as a base." onClick={addLayer} disabled={layers.length >= 4}>Add Layer</Button>
          <Button type="button" size="sm" title="Create a copy of the selected layer." onClick={duplicateLayer} disabled={layers.length >= 4}>Duplicate</Button>
          <Button type="button" size="sm" variant="secondary" title="Remove the selected layer." onClick={removeLayer} disabled={layers.length <= 1}>Remove</Button>
        </div>
      </section>

      {uiMode === 'advanced' ? <section className="panel-section">
        <h3 className="panel-section-title">Equations</h3>
        <p className="section-help">Define parametric formulas for x, y, and z. These formulas run continuously over time variables t and u.</p>

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
            <select id="equation-example" title="Apply a predefined equation set." value={equationExampleId} onChange={(event) => applyEquationExample(event.target.value)}>
              <option value="">Custom</option>
              {EQUATION_EXAMPLES.map((example) => (
                <option key={example.id} value={example.id}>
                  {example.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="active-equation">Target</label>
            <select
              id="active-equation"
              title="Choose whether snippet buttons append to x(t,u), y(t,u), or z(t,u)."
              value={activeEquation}
              onChange={(event) => setActiveEquation(event.target.value as 'x' | 'y' | 'z')}
            >
              <option value="x">x(t,u)</option>
              <option value="y">y(t,u)</option>
              <option value="z">z(t,u)</option>
            </select>
          </div>
        </div>

        <div className="action-row">
          <Button type="button" size="sm" variant="secondary" title="Append a sine-wave term to the active equation." onClick={() => insertSnippet(' + 0.4 * sin(u)')}>+sin(u)</Button>
          <Button type="button" size="sm" variant="secondary" title="Append a triangle-wave term to the active equation." onClick={() => insertSnippet(' + 0.3 * triangle(u)')}>+triangle(u)</Button>
          <Button type="button" size="sm" variant="secondary" title="Append a saw-wave term to the active equation." onClick={() => insertSnippet(' + 0.25 * saw(u)')}>+saw(u)</Button>
          <Button type="button" size="sm" variant="secondary" title="Append a pulse-wave term to the active equation." onClick={() => insertSnippet(' + pulse(u, 0.2)')}>+pulse</Button>
        </div>
      </section> : null}

      <section className="panel-section">
        <h3 className="panel-section-title">Curve</h3>
        <p className="section-help">Shape and timing controls for the selected layer trajectory and trail behavior.</p>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="r-big">R (Outer Radius)</label>
            <input
              id="r-big"
              type="number"
              title="Main radius in classic spirograph equations."
              step="0.2"
              value={activeLayer?.R ?? 0}
              onChange={(event) => updateActiveLayer({ R: parseNumber(event.target.value, activeLayer?.R ?? 0) })}
            />
          </div>
          <div className="field">
            <label htmlFor="r-small">r (Inner Radius)</label>
            <input
              id="r-small"
              type="number"
              title="Secondary radius; ratio R/r strongly affects pattern repetition."
              value={activeLayer?.r ?? 0}
              onChange={(event) => updateActiveLayer({ r: parseNumber(event.target.value, activeLayer?.r ?? 0) })}
            />
          </div>
          <div className="field">
            <label htmlFor="offset">d (Pen Offset)</label>
            <input
              id="offset"
              type="number"
              title="Distance from the moving center to drawing point."
              value={activeLayer?.d ?? 0}
              onChange={(event) => updateActiveLayer({ d: parseNumber(event.target.value, activeLayer?.d ?? 0) })}
            />
          </div>
          <div className="field">
            <label htmlFor="speed">Speed</label>
            <input
              id="speed"
              type="number"
              title="How fast parameter t advances."
              step="0.1"
              value={activeLayer?.speed ?? 0}
              onChange={(event) => updateActiveLayer({ speed: parseNumber(event.target.value, activeLayer?.speed ?? 0) })}
            />
          </div>
          {uiMode === 'advanced' ? (
            <>
              <div className="field">
                <label htmlFor="u-speed">u Speed</label>
                <input
                  id="u-speed"
                  type="number"
                  title="How fast parameter u advances."
                  step="0.05"
                  value={activeLayer?.uSpeed ?? 0}
                  onChange={(event) => updateActiveLayer({ uSpeed: parseNumber(event.target.value, activeLayer?.uSpeed ?? 0) })}
                />
              </div>
              <div className="field">
                <label htmlFor="z-scale">Z Scale</label>
                <input
                  id="z-scale"
                  type="number"
                  title="Scales z(t,u) depth contribution for 3D renderers."
                  step="0.05"
                  value={activeLayer?.zScale ?? 0.6}
                  onChange={(event) => updateActiveLayer({ zScale: parseNumber(event.target.value, activeLayer?.zScale ?? 0.6) })}
                />
              </div>
              <div className="field">
                <label htmlFor="line-life">Lifetime (s)</label>
                <input
                  id="line-life"
                  type="number"
                  title="Trail duration in seconds when Forever is disabled."
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
          <div className="field">
            <label htmlFor="multi-line-count">Line Copies</label>
            <input
              id="multi-line-count"
              type="number"
              title="Draw several line copies around each sampled particle point."
              min="1"
              max="16"
              step="1"
              value={activeLayer?.multiLineCount ?? 1}
              onChange={(event) =>
                updateActiveLayer({
                  multiLineCount: Math.max(1, Math.min(16, Math.round(parseNumber(event.target.value, activeLayer?.multiLineCount ?? 1)))),
                })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="multi-line-motion">Line Motion</label>
            <select
              id="multi-line-motion"
              title="How line copies move around the particle point."
              value={activeLayer?.multiLineMotion ?? 'fixed'}
              onChange={(event) => updateActiveLayer({ multiLineMotion: event.target.value as MultiLineMotionMode })}
            >
              <option value="fixed">Fixed</option>
              <option value="orbit">Orbit</option>
              <option value="random">Random</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="multi-line-spread">Line Spread (px)</label>
            <input
              id="multi-line-spread"
              type="number"
              title="Distance from the particle point used by line copies."
              min="0"
              step="1"
              value={activeLayer?.multiLineSpread ?? 14}
              onChange={(event) =>
                updateActiveLayer({ multiLineSpread: Math.max(0, parseNumber(event.target.value, activeLayer?.multiLineSpread ?? 14)) })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="multi-line-motion-speed">Motion Speed</label>
            <input
              id="multi-line-motion-speed"
              type="number"
              title="Angular speed for orbit/random motion of line copies."
              step="0.1"
              value={activeLayer?.multiLineMotionSpeed ?? 1}
              onChange={(event) =>
                updateActiveLayer({ multiLineMotionSpeed: parseNumber(event.target.value, activeLayer?.multiLineMotionSpeed ?? 1) })
              }
            />
          </div>
        </div>
      </section>

      {uiMode === 'advanced' ? <section className="panel-section">
        <h3 className="panel-section-title">Color</h3>
        <p className="section-help">Set how color is computed for this layer, including palette-based and fixed-hue options.</p>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="color-mode">Color Mode</label>
            <select
              id="color-mode"
              title="Select color logic source: hue cycle, palette, age, speed, or curvature."
              value={activeLayer?.colorMode ?? 'hue-cycle'}
              onChange={(event) => updateActiveLayer({ colorMode: event.target.value as ColorMode })}
            >
              <option value="hue-cycle">Hue Cycle</option>
              <option value="palette">Palette Sweep</option>
              <option value="age">By Age</option>
              <option value="speed">By Speed</option>
              <option value="curvature">By Curvature</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="palette">Palette</label>
            <select
              id="palette"
              title="Palette used when Color Mode is set to Palette Sweep."
              value={activeLayer?.paletteId ?? 'neon'}
              onChange={(event) => updateActiveLayer({ paletteId: event.target.value as PaletteId })}
            >
              <option value="neon">Neon</option>
              <option value="sunset">Sunset</option>
              <option value="ocean">Ocean</option>
              <option value="forest">Forest</option>
              <option value="candy">Candy</option>
            </select>
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
            <label htmlFor="base-hue">Base Hue</label>
            <input
              id="base-hue"
              type="number"
              title="Hue angle (0-360) applied when Hue Lock is enabled."
              min="0"
              max="360"
              step="1"
              value={activeLayer?.baseHue ?? 210}
              onChange={(event) => updateActiveLayer({ baseHue: parseNumber(event.target.value, activeLayer?.baseHue ?? 210) })}
              disabled={!(activeLayer?.hueLock ?? false)}
            />
          </div>
        </div>
      </section> : null}
    </section>
  )
}
