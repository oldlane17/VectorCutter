/**
 * VectorCutter - Straight Line Drawing Tool
 */

import { createElement } from '../model/elements.js';
import { AddElementCommand } from '../core/commands.js';
import { translationMatrix } from '../model/matrix.js';
import { events } from '../core/events.js';

export class LineTool {
    constructor(camera, store) {
        this.camera = camera;
        this.store = store;
        this.isDrawing = false;
        this.start = { x: 0, y: 0 };
        this.previewEl = null;
    }

    onPointerDown(pt) {
        this.isDrawing = true;
        this.start = { x: pt.x, y: pt.y };
        this.previewEl = createElement('line', {
            x1: 0,
            y1: 0,
            x2: 1,
            y2: 0,
            transform: translationMatrix(pt.x, pt.y)
        });
        this.store.doc.elements[this.previewEl.id] = this.previewEl;
        this.store.doc.order.push(this.previewEl.id);
        this.store.setSelection([this.previewEl.id]);
        events.emit('document:changed', { action: 'draw-start' });
    }

    onPointerMove(pt, e) {
        if (!this.isDrawing || !this.previewEl) return;
        let dx = pt.x - this.start.x;
        let dy = pt.y - this.start.y;

        // Shift key locks 0°, 45°, 90° angles
        if (e && e.shiftKey) {
            const angle = Math.atan2(dy, dx);
            const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
            const dist = Math.hypot(dx, dy);
            dx = dist * Math.cos(snappedAngle);
            dy = dist * Math.sin(snappedAngle);
        }

        this.previewEl.geometry.x2 = dx;
        this.previewEl.geometry.y2 = dy;

        events.emit('document:changed', { action: 'draw-move' });
        events.emit('selection:changed', { selection: [this.previewEl.id] });
    }

    onPointerUp() {
        if (!this.isDrawing || !this.previewEl) return;
        this.isDrawing = false;

        const g = this.previewEl.geometry;
        const len = Math.hypot(g.x2 - g.x1, g.y2 - g.y1);
        if (len < 3) {
            this.previewEl.geometry.x2 = 50; // 50mm horizontal line default
            this.previewEl.geometry.y2 = 0;
        }

        const finalEl = { ...this.previewEl };
        delete this.store.doc.elements[this.previewEl.id];
        const idx = this.store.doc.order.indexOf(this.previewEl.id);
        if (idx !== -1) this.store.doc.order.splice(idx, 1);

        this.store.dispatch(new AddElementCommand(finalEl));
        this.store.setSelection([finalEl.id]);
        this.previewEl = null;
    }
}
