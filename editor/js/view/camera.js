/**
 * VectorCutter - Camera Engine (Physical mm World Space)
 * Replaces broken viewBox zooming with exact matrix transforms.
 */

import { events } from '../core/events.js';

export class Camera {
    constructor() {
        // x, y = world mm coordinate at viewport top-left
        // scale = screen pixels per mm (~3.7795 default = 96 DPI)
        this.x = -150;
        this.y = -100;
        this.scale = 3.779527559;
        this.min = 0.02;
        this.max = 400;
    }

    toWorld(sx, sy) {
        return {
            x: this.x + sx / this.scale,
            y: this.y + sy / this.scale
        };
    }

    toScreen(wx, wy) {
        return {
            x: (wx - this.x) * this.scale,
            y: (wy - this.y) * this.scale
        };
    }

    zoomAt(sx, sy, factor) {
        const w = this.toWorld(sx, sy);
        const s = Math.min(this.max, Math.max(this.min, this.scale * factor));
        this.scale = s;
        this.x = w.x - sx / s;
        this.y = w.y - sy / s;
        events.emit('camera:changed', this);
    }

    panBy(dxPx, dyPx) {
        this.x -= dxPx / this.scale;
        this.y -= dyPx / this.scale;
        events.emit('camera:changed', this);
    }

    matrix() {
        return `matrix(${this.scale} 0 0 ${this.scale} ${-this.x * this.scale} ${-this.y * this.scale})`;
    }

    resetView(viewportW = 800, viewportH = 600, targetAreaW = 300, targetAreaH = 200) {
        // Center a 300x200mm area in the viewport
        const scaleX = (viewportW * 0.8) / targetAreaW;
        const scaleY = (viewportH * 0.8) / targetAreaH;
        this.scale = Math.min(scaleX, scaleY);
        this.x = -(viewportW / (2 * this.scale));
        this.y = -(viewportH / (2 * this.scale));
        events.emit('camera:changed', this);
    }

    zoomToFit(bounds, viewportW, viewportH) {
        if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
            this.resetView(viewportW, viewportH);
            return;
        }
        const margin = 40; // px
        const availW = Math.max(10, viewportW - margin * 2);
        const availH = Math.max(10, viewportH - margin * 2);
        const s = Math.min(availW / bounds.width, availH / bounds.height);
        this.scale = Math.min(this.max, Math.max(this.min, s));
        this.x = bounds.x + bounds.width / 2 - viewportW / (2 * this.scale);
        this.y = bounds.y + bounds.height / 2 - viewportH / (2 * this.scale);
        events.emit('camera:changed', this);
    }
}
