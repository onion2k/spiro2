import { useRef, useState } from 'react'

import { useThreeRenderer } from './useThreeRenderer'
import type { RendererHudStats, SpiroRendererConfig } from './types'

type ThreeSurfaceProps = SpiroRendererConfig & {
  className?: string
}

export default function ThreeSurface({ className = 'plot-canvas', ...config }: ThreeSurfaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hudStats, setHudStats] = useState<RendererHudStats | null>(null)
  useThreeRenderer({
    ...config,
    containerRef,
    enabled: true,
    onHudStats: setHudStats,
  })
  return (
    <section className={`${className} three-surface-shell`}>
      <div ref={containerRef} className="three-surface-canvas" />
      {hudStats ? (
        <aside className="renderer-hud" aria-label="Renderer performance">
          <div className="renderer-hud-row">
            <span>FPS</span>
            <strong>{hudStats.fps.toFixed(1)}</strong>
          </div>
          <div className="renderer-hud-row">
            <span>Frame</span>
            <strong>{hudStats.frameMs.toFixed(1)} ms</strong>
          </div>
          <div className="renderer-hud-row">
            <span>Draw Calls</span>
            <strong>{hudStats.drawCalls}</strong>
          </div>
          <div className="renderer-hud-row">
            <span>Objects</span>
            <strong>{hudStats.renderedObjects}</strong>
          </div>
          <div className="renderer-hud-row">
            <span>Trail Points</span>
            <strong>{hudStats.trailPoints}</strong>
          </div>
          <div className="renderer-hud-row">
            <span>Point Vertices</span>
            <strong>{hudStats.pointVertices}</strong>
          </div>
          <div className="renderer-hud-row">
            <span>Sprite Instances</span>
            <strong>{hudStats.instancedSprites}</strong>
          </div>
          <div className="renderer-hud-row">
            <span>Line Objects</span>
            <strong>{hudStats.lineObjects}</strong>
          </div>
          <div className="renderer-hud-row">
            <span>Camera</span>
            <strong>{hudStats.threeCameraMode}</strong>
          </div>
          <div className="renderer-hud-row">
            <span>Line Mode</span>
            <strong>{hudStats.threeLineRenderMode}</strong>
          </div>
        </aside>
      ) : null}
    </section>
  )
}
