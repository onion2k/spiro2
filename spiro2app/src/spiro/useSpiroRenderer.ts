import { useCanvas2DRenderer } from './renderers/useCanvas2DRenderer'
import { useSvgRenderer } from './renderers/useSvgRenderer'
import { useThreeRenderer } from './renderers/useThreeRenderer'
import type { SpiroRendererOptions } from './renderers/types'

export function useSpiroRenderer(options: SpiroRendererOptions) {
  const { rendererType, canvasRef, svgRef, threeContainerRef, ...sharedConfig } = options

  useCanvas2DRenderer({
    ...sharedConfig,
    canvasRef,
    enabled: rendererType === 'canvas2d',
  })

  useSvgRenderer({
    ...sharedConfig,
    svgRef,
    enabled: rendererType === 'svg',
  })

  useThreeRenderer({
    ...sharedConfig,
    containerRef: threeContainerRef,
    enabled: rendererType === 'three',
  })
}
