import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GlobalControls, type GlobalControlsProps } from './GlobalControls'
import { LayerControls, type LayerControlsProps } from './LayerControls'

type LayerTabProps = Omit<LayerControlsProps, 'uiMode'>
type GlobalTabProps = Omit<GlobalControlsProps, 'uiMode' | 'scope'>

type ControlPanelProps = {
  uiMinimized: boolean
  isPaused: boolean
  controlTab: 'pattern-basic' | 'pattern-advanced' | 'rendering' | 'presets'
  activeLayerError: string
  mobilePanelOpen: boolean
  setUiMinimized: (value: boolean | ((value: boolean) => boolean)) => void
  setIsPaused: (value: boolean | ((value: boolean) => boolean)) => void
  setControlTab: (value: 'pattern-basic' | 'pattern-advanced' | 'rendering' | 'presets') => void
  setMobilePanelOpen: (value: boolean | ((value: boolean) => boolean)) => void
  onReset: () => void
  layerProps: LayerTabProps
  globalProps: GlobalTabProps
}

export function ControlPanel({
  uiMinimized,
  isPaused,
  controlTab,
  activeLayerError,
  mobilePanelOpen,
  setUiMinimized,
  setIsPaused,
  setControlTab,
  setMobilePanelOpen,
  onReset,
  layerProps,
  globalProps,
}: ControlPanelProps) {
  return (
    <>
      <Button
        type="button"
        size="sm"
        className="mobile-view-toggle"
        onClick={() => setMobilePanelOpen((value) => !value)}
        aria-expanded={mobilePanelOpen}
        aria-controls="spiro-controls-panel"
      >
        {mobilePanelOpen ? 'View Pattern' : 'Show Controls'}
      </Button>

      <button
        type="button"
        className={`mobile-overlay-backdrop${mobilePanelOpen ? ' open' : ''}`}
        aria-hidden={!mobilePanelOpen}
        tabIndex={mobilePanelOpen ? 0 : -1}
        onClick={() => setMobilePanelOpen(false)}
      />

      <Card id="spiro-controls-panel" className={`ui-overlay !gap-0 !py-0${uiMinimized ? ' minimized' : ''}${mobilePanelOpen ? ' mobile-open' : ''}`}>
        <CardContent className="ui-overlay-content !px-3">
          <div className="toolbar-row">
            <Button type="button" size="sm" title="Pause or resume animation updates." onClick={() => setIsPaused((value) => !value)}>
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button type="button" size="sm" title="Clear current trails and restart drawing from t=0." onClick={onReset}>
              Reset
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mobile-hide"
              title="Collapse or expand the full control panel."
              onClick={() => setUiMinimized((value) => !value)}
            >
              {uiMinimized ? 'Expand UI' : 'Minimize UI'}
            </Button>
            <Button type="button" size="sm" variant="secondary" className="mobile-panel-close" onClick={() => setMobilePanelOpen(false)}>
              Pattern
            </Button>
          </div>

          {!uiMinimized && (
            <Tabs
              value={controlTab}
              onValueChange={(value) => setControlTab(value as 'pattern-basic' | 'pattern-advanced' | 'rendering' | 'presets')}
              className="control-group"
            >
              <TabsList className="control-tabs" aria-label="Control Categories">
                <TabsTrigger value="pattern-basic" title="Core controls for shaping the pattern.">
                  Basic Pattern
                </TabsTrigger>
                <TabsTrigger value="pattern-advanced" title="Advanced pattern controls, equations, and modulation.">
                  Advanced Pattern
                </TabsTrigger>
                <TabsTrigger value="rendering" title="Renderer, camera, stroke, and material controls.">
                  Rendering
                </TabsTrigger>
                <TabsTrigger value="presets" title="Save, rename, delete, import, and export custom presets.">
                  Presets
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pattern-basic" className="control-tab-content">
                <LayerControls
                  {...layerProps}
                  uiMode="basic"
                  showPresetLibrary
                  presetMode="picker-only"
                  showNonPresetSections={false}
                />
                <GlobalControls {...globalProps} uiMode="basic" scope="pattern-style" />
                <LayerControls {...layerProps} uiMode="basic" curveScope="basic-only" showPresetLibrary={false} />
                <GlobalControls {...globalProps} uiMode="basic" scope="pattern-symmetry" />
              </TabsContent>

              <TabsContent value="pattern-advanced" className="control-tab-content">
                <LayerControls
                  {...layerProps}
                  uiMode="advanced"
                  curveScope="advanced-only"
                  showPresetLibrary={false}
                  sectionScope="non-color"
                />
                <GlobalControls {...globalProps} uiMode="advanced" scope="pattern" />
              </TabsContent>

              <TabsContent value="rendering" className="control-tab-content">
                <LayerControls
                  {...layerProps}
                  uiMode="advanced"
                  showPresetLibrary={false}
                  showNonPresetSections={false}
                  sectionScope="color-only"
                />
                <GlobalControls {...globalProps} uiMode="advanced" scope="rendering" />
              </TabsContent>

              <TabsContent value="presets" className="control-tab-content">
                <LayerControls
                  {...layerProps}
                  uiMode="advanced"
                  showPresetLibrary
                  presetMode="manage-only"
                  showNonPresetSections={false}
                />
              </TabsContent>
            </Tabs>
          )}

          {activeLayerError ? <p className="error">{activeLayerError}</p> : null}
        </CardContent>
      </Card>
    </>
  )
}
