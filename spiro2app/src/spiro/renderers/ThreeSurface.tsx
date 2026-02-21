import { useRef } from 'react'

import { useThreeRenderer } from './useThreeRenderer'
import type { SpiroRendererConfig } from './types'

type ThreeSurfaceProps = SpiroRendererConfig & {
  className?: string
}

export default function ThreeSurface({ className = 'plot-canvas', ...config }: ThreeSurfaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  useThreeRenderer({
    ...config,
    containerRef,
    enabled: true,
  })
  return <div ref={containerRef} className={className} />
}
