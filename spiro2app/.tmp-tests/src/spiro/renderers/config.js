export function buildRendererConfig(input) {
    const { layers, compiledLayers, isPaused, resetTick, recenterTick, settings } = input;
    return {
        layers,
        compiledLayers,
        isPaused,
        resetTick,
        recenterTick,
        ...settings,
    };
}
