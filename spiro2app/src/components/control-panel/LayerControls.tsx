import { EQUATION_EXAMPLES, PRESETS } from '@/spiro/constants'
import type { ColorMode, CustomPreset, DrawMode, LayerConfig, PaletteId } from '@/spiro/types'
import { Button } from '@/components/ui/button'

export type LayerControlsProps = {
  selectedPresetId: string
  customPresets: CustomPreset[]
  customPresetName: string
  activeCustomPreset: CustomPreset | null
  layers: LayerConfig[]
  activeLayerId: string
  activeLayer: LayerConfig | undefined
  equationExampleId: string
  activeEquation: 'x' | 'y'
  setCustomPresetName: (value: string) => void
  setActiveLayerId: (value: string) => void
  setActiveEquation: (value: 'x' | 'y') => void
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
        <h3 className="panel-section-title">Presets And Layers</h3>
        <p className="section-help">Choose a starting preset, manage saved custom presets, and control which layer you are editing.</p>

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

      <section className="panel-section">
        <h3 className="panel-section-title">Equations</h3>
        <p className="section-help">Define parametric formulas for x and y. These formulas run continuously over time variables t and u.</p>

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

          <div className="field">
            <label htmlFor="equation-example">Example</label>
            <select id="equation-example" title="Apply a predefined equation pair." value={equationExampleId} onChange={(event) => applyEquationExample(event.target.value)}>
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
              title="Choose whether snippet buttons append to x(t,u) or y(t,u)."
              value={activeEquation}
              onChange={(event) => setActiveEquation(event.target.value as 'x' | 'y')}
            >
              <option value="x">x(t,u)</option>
              <option value="y">y(t,u)</option>
            </select>
          </div>
        </div>

        <div className="action-row">
          <Button type="button" size="sm" variant="secondary" title="Append a sine-wave term to the active equation." onClick={() => insertSnippet(' + 0.4 * sin(u)')}>+sin(u)</Button>
          <Button type="button" size="sm" variant="secondary" title="Append a triangle-wave term to the active equation." onClick={() => insertSnippet(' + 0.3 * triangle(u)')}>+triangle(u)</Button>
          <Button type="button" size="sm" variant="secondary" title="Append a saw-wave term to the active equation." onClick={() => insertSnippet(' + 0.25 * saw(u)')}>+saw(u)</Button>
          <Button type="button" size="sm" variant="secondary" title="Append a pulse-wave term to the active equation." onClick={() => insertSnippet(' + pulse(u, 0.2)')}>+pulse</Button>
        </div>
      </section>

      <section className="panel-section">
        <h3 className="panel-section-title">Curve</h3>
        <p className="section-help">Shape and timing controls for the selected layer’s trajectory and trail rendering mode.</p>
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
          <div className="field">
            <label htmlFor="draw-mode">Draw Mode</label>
            <select
              id="draw-mode"
              title="Choose whether to render lines, points, or both."
              value={activeLayer?.drawMode ?? 'lines'}
              onChange={(event) => updateActiveLayer({ drawMode: event.target.value as DrawMode })}
            >
              <option value="lines">Lines</option>
              <option value="points">Points</option>
              <option value="lines-points">Lines + Points</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="point-size">Point Size</label>
            <input
              id="point-size"
              type="number"
              title="Point radius when draw mode includes points."
              min="0.5"
              step="0.1"
              value={activeLayer?.pointSize ?? 0.5}
              onChange={(event) =>
                updateActiveLayer({ pointSize: Math.max(0.5, parseNumber(event.target.value, activeLayer?.pointSize ?? 0.5)) })
              }
            />
          </div>
        </div>
      </section>

      <section className="panel-section">
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
      </section>
    </section>
  )
}
