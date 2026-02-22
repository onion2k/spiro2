import {
  OrthographicCamera,
  PerspectiveCamera,
  type OrthographicCamera as OrthographicCameraType,
  type PerspectiveCamera as PerspectiveCameraType,
} from 'three'

import type { ThreeCameraMode } from '../types'

export type ThreeCamera = OrthographicCameraType | PerspectiveCameraType

export function createThreeCamera(mode: ThreeCameraMode): ThreeCamera {
  return mode === 'perspective' ? new PerspectiveCamera(48, 1, 0.1, 10000) : new OrthographicCamera()
}

export function resizeThreeCamera(options: {
  camera: ThreeCamera
  mode: ThreeCameraMode
  width: number
  height: number
  userInteracted: boolean
  setTarget: (x: number, y: number, z: number) => void
}) {
  const { camera, mode, width, height, userInteracted, setTarget } = options
  const maxDimension = Math.max(width, height)
  const minDimension = Math.max(1, Math.min(width, height))

  if (mode === 'orthographic' && camera instanceof OrthographicCamera) {
    camera.left = -width / 2
    camera.right = width / 2
    camera.top = height / 2
    camera.bottom = -height / 2
    camera.near = Math.max(0.5, maxDimension * 0.002)
    camera.far = maxDimension * 12
    if (!userInteracted) {
      camera.position.set(0, 0, minDimension * 1.45)
      setTarget(0, 0, 0)
    }
  } else if (mode === 'perspective' && camera instanceof PerspectiveCamera) {
    camera.aspect = width / Math.max(1, height)
    const verticalFovRad = (camera.fov * Math.PI) / 180
    const fitRadius = minDimension * 0.6
    const fitDistance = fitRadius / Math.tan(verticalFovRad / 2)
    const cameraDistance = Math.max(minDimension * 1.1, fitDistance * 1.15)
    camera.near = Math.max(0.1, cameraDistance * 0.01)
    camera.far = Math.max(maxDimension * 12, cameraDistance * 24)
    if (!userInteracted) {
      camera.position.set(0, 0, cameraDistance)
      setTarget(0, 0, 0)
    }
  }
  camera.updateProjectionMatrix()
}
