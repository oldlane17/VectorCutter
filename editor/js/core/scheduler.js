/**
 * VectorCutter - Centralized Render Scheduler (§1)
 * Eliminates out-of-sync bugs by scheduling 60 FPS renders via requestAnimationFrame.
 * Pure model reading; entirely decoupled from window resize events.
 */

let renderQueued = false;
const callbacks = {
    canvas: null,
    objectList: null,
    properties: null,
    codeEditor: null,
    statusBar: null
};

export function registerRenderHook(key, fn) {
    callbacks[key] = fn;
}

export function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
        renderQueued = false;
        renderAll();
    });
}

export function renderAll() {
    try {
        if (callbacks.canvas) callbacks.canvas();
        if (callbacks.objectList) callbacks.objectList();
        if (callbacks.properties) callbacks.properties();
        if (callbacks.codeEditor) callbacks.codeEditor();
        if (callbacks.statusBar) callbacks.statusBar();
    } catch (err) {
        console.error('[RenderScheduler] Error executing renderAll:', err);
    }
}
