import { useRef } from 'react'

import { useCanvas2DRenderer } from './useCanvas2DRenderer'
import type { SpiroRendererConfig } from './types'

type CanvasSurfaceProps = SpiroRendererConfig & {
  className?: string
}

export default function CanvasSurface({ className = 'plot-canvas', ...config }: CanvasSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useCanvas2DRenderer({
    ...config,
    canvasRef,
    enabled: true,
  })
  return <canvas ref={canvasRef} className={className} />
}
