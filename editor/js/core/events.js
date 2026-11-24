/**
 * VectorCutter - Event Bus
 * Light, fast pub/sub for decoupling view, model, and UI layers.
 * Uses globalThis singleton to ensure a single event bus across any module graph.
 */

export class EventEmitter {
    constructor() {
        this.listeners = new Map();
    }

    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(handler);
        return () => this.off(event, handler);
    }

    off(event, handler) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(handler);
        }
    }

    emit(event, payload) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(handler => {
                try {
                    handler(payload);
                } catch (e) {
                    console.error(`[EventBus] Error in handler for event "${event}":`, e);
                }
            });
        }
    }
}

if (!globalThis.__vc_events) {
    globalThis.__vc_events = new EventEmitter();
}
export const events = globalThis.__vc_events;
if (typeof window !== 'undefined') {
    window.vcEvents = events;
}
