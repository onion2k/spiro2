export function buildRendererConfig(input) {
    const { layers, compiledLayers, isPaused, resetTick, settings } = input;
    return {
        layers,
        compiledLayers,
        isPaused,
        resetTick,
        ...settings,
    };
}
