/**
 * VectorCutter - Centralized Render Scheduler (§1)
 * Eliminates out-of-sync bugs by scheduling 60 FPS renders via requestAnimationFrame.
 * Uses globalThis singleton to prevent module-instance desync across any import path.
 */

if (!globalThis.__vc_scheduler) {
    globalThis.__vc_scheduler = {
        renderQueued: false,
        callbacks: {
            canvas: null,
            objectList: null,
            properties: null,
            codeEditor: null,
            statusBar: null
        }
    };
}
const state = globalThis.__vc_scheduler;

export function registerRenderHook(key, fn) {
    state.callbacks[key] = fn;
}

export function requestRender() {
    if (state.renderQueued) return;
    state.renderQueued = true;
    requestAnimationFrame(() => {
        state.renderQueued = false;
        renderAll();
    });
}

export function renderAll() {
    try {
        if (state.callbacks.canvas) state.callbacks.canvas();
        if (state.callbacks.objectList) state.callbacks.objectList();
        if (state.callbacks.properties) state.callbacks.properties();
        if (state.callbacks.codeEditor) state.callbacks.codeEditor();
        if (state.callbacks.statusBar) state.callbacks.statusBar();
    } catch (err) {
        console.error('[RenderScheduler] Error executing renderAll:', err);
    }
}

// Global hook for direct calling and debugging
if (typeof window !== 'undefined') {
    window.requestRender = requestRender;
    window.renderAll = renderAll;
}
