import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GlobalControls, type GlobalControlsProps } from './GlobalControls'
import { LayerControls, type LayerControlsProps } from './LayerControls'

type ControlPanelProps = {
  uiMinimized: boolean
  uiMode: 'basic' | 'advanced'
  isPaused: boolean
  controlTab: 'layer' | 'global'
  activeLayerError: string
  setUiMinimized: (value: boolean | ((value: boolean) => boolean)) => void
  setUiMode: (value: 'basic' | 'advanced') => void
  setIsPaused: (value: boolean | ((value: boolean) => boolean)) => void
  setControlTab: (value: 'layer' | 'global') => void
  onReset: () => void
  layerProps: LayerControlsProps
  globalProps: GlobalControlsProps
}

export function ControlPanel({
  uiMinimized,
  uiMode,
  isPaused,
  controlTab,
  activeLayerError,
  setUiMinimized,
  setUiMode,
  setIsPaused,
  setControlTab,
  onReset,
  layerProps,
  globalProps,
}: ControlPanelProps) {
  return (
    <Card className={`ui-overlay !gap-0 !py-0${uiMinimized ? ' minimized' : ''}`}>
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
            title="Collapse or expand the full control panel."
            onClick={() => setUiMinimized((value) => !value)}
          >
            {uiMinimized ? 'Expand UI' : 'Minimize UI'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={uiMode === 'basic' ? 'default' : 'secondary'}
            title="Show simplified controls."
            onClick={() => setUiMode('basic')}
          >
            Basic
          </Button>
          <Button
            type="button"
            size="sm"
            variant={uiMode === 'advanced' ? 'default' : 'secondary'}
            title="Show full controls."
            onClick={() => setUiMode('advanced')}
          >
            Advanced
          </Button>
        </div>

        {!uiMinimized && (
          <Tabs value={controlTab} onValueChange={(value) => setControlTab(value as 'layer' | 'global')} className="control-group">
            <TabsList className="control-tabs" aria-label="Control Categories">
              <TabsTrigger value="layer" title="Controls for presets, equations, and per-layer styling.">
                Layer
              </TabsTrigger>
              <TabsTrigger value="global" title="Controls that affect all layers and renderer behavior.">
                Global
              </TabsTrigger>
            </TabsList>

            <TabsContent value="layer" className="control-tab-content">
              <LayerControls {...layerProps} />
            </TabsContent>

            <TabsContent value="global" className="control-tab-content">
              <GlobalControls {...globalProps} />
            </TabsContent>
          </Tabs>
        )}

        {activeLayerError ? <p className="error">{activeLayerError}</p> : null}
        <p className="hint">
          Equation helpers: sin, cos, tan, sqrt, pow, PI, E, clamp(v,lo,hi), mix(a,b,p), saw(v), triangle(v), pulse(v,w). Time terms: t and u. Define x, y, and z equations per layer. Noise: Off, Grain, Flow.
        </p>
      </CardContent>
    </Card>
  )
}
