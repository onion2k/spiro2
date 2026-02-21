import { OrthographicCamera, PerspectiveCamera, } from 'three';
export function createThreeCamera(mode) {
    return mode === 'perspective' ? new PerspectiveCamera(48, 1, 0.1, 10000) : new OrthographicCamera();
}
export function resizeThreeCamera(options) {
    const { camera, mode, width, height, userInteracted, setTarget } = options;
    const maxDimension = Math.max(width, height);
    if (mode === 'orthographic' && camera instanceof OrthographicCamera) {
        camera.left = -width / 2;
        camera.right = width / 2;
        camera.top = height / 2;
        camera.bottom = -height / 2;
        camera.near = 0.1;
        camera.far = maxDimension * 20;
        if (!userInteracted) {
            camera.position.set(0, 0, maxDimension * 1.25);
            setTarget(0, 0, 0);
        }
    }
    else if (mode === 'perspective' && camera instanceof PerspectiveCamera) {
        camera.aspect = width / height;
        camera.near = 0.1;
        camera.far = maxDimension * 40;
        if (!userInteracted) {
            camera.position.set(0, 0, maxDimension * 2.2);
            setTarget(0, 0, 0);
        }
    }
    camera.updateProjectionMatrix();
}
