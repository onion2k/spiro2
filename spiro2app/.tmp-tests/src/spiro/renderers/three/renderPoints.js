import { BufferAttribute, BufferGeometry, Color, Points, PointsMaterial } from 'three';
import { buildLineOffsets, buildSymmetryVariants3D, colorForPoint, tangentForTrail } from '../runtime';
export function renderPoints(options) {
    const { runtimeLayer, center, nowSec, step, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg } = options;
    const layer = runtimeLayer.layer;
    const pointPositions = [];
    const pointColors = [];
    for (let i = 0; i < runtimeLayer.trail.length; i += step) {
        const point = runtimeLayer.trail[i];
        const tangent = tangentForTrail(runtimeLayer.trail, i, step);
        const offsets = buildLineOffsets(layer, point.index, runtimeLayer.paramU, tangent);
        const style = colorForPoint(point, layer, nowSec);
        const rgb = new Color(`hsl(${style.hue}, 95%, 72%)`);
        for (const offset of offsets) {
            const copies = buildSymmetryVariants3D({ x: point.x + offset.x, y: point.y + offset.y, z: point.z + offset.z }, { x: center.x, y: center.y, z: 0 }, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg);
            for (const copy of copies) {
                pointPositions.push(copy.x - center.x, center.y - copy.y, copy.z);
                pointColors.push(rgb.r, rgb.g, rgb.b);
            }
        }
    }
    if (pointPositions.length === 0) {
        return null;
    }
    const pointGeometry = new BufferGeometry();
    pointGeometry.setAttribute('position', new BufferAttribute(new Float32Array(pointPositions), 3));
    pointGeometry.setAttribute('color', new BufferAttribute(new Float32Array(pointColors), 3));
    const pointMaterial = new PointsMaterial({
        size: Math.max(1, layer.pointSize * 2),
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
    });
    return new Points(pointGeometry, pointMaterial);
}
