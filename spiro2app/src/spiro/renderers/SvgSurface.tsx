import { useRef } from 'react'

import { useSvgRenderer } from './useSvgRenderer'
import type { SpiroRendererConfig } from './types'

type SvgSurfaceProps = SpiroRendererConfig & {
  className?: string
}

export default function SvgSurface({ className = 'plot-canvas', ...config }: SvgSurfaceProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  useSvgRenderer({
    ...config,
    svgRef,
    enabled: true,
  })
  return <svg ref={svgRef} className={className} />
}
