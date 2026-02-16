export function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
export function interpolateHue(palette, ratio) {
    const t = clamp01(ratio);
    const scaled = t * (palette.length - 1);
    const left = Math.floor(scaled);
    const right = Math.min(palette.length - 1, left + 1);
    const mix = scaled - left;
    return palette[left] + (palette[right] - palette[left]) * mix;
}
export function rotatePoint(point, center, angle) {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return {
        x: center.x + dx * c - dy * s,
        y: center.y + dx * s + dy * c,
    };
}
