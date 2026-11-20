/**
 * VectorCutter - Star Drawing Tool (5-pointed star)
 */

import { createElement } from '../model/elements.js';
import { AddElementCommand } from '../core/commands.js';
import { translationMatrix } from '../model/matrix.js';
import { events } from '../core/events.js';

export class StarTool {
    constructor(camera, store) {
        this.camera = camera;
        this.store = store;
        this.isDrawing = false;
        this.center = { x: 0, y: 0 };
        this.previewEl = null;
    }

    onPointerDown(pt) {
        this.isDrawing = true;
        this.center = { x: pt.x, y: pt.y };
        this.previewEl = createElement('star', {
            cx: 0,
            cy: 0,
            points: 5,
            outerRadius: 1,
            innerRadius: 0.5,
            transform: translationMatrix(pt.x, pt.y)
        });
        this.store.doc.elements[this.previewEl.id] = this.previewEl;
        this.store.doc.order.push(this.previewEl.id);
        this.store.setSelection([this.previewEl.id]);
        events.emit('document:changed', { action: 'draw-start' });
    }

    onPointerMove(pt) {
        if (!this.isDrawing || !this.previewEl) return;
        const radius = Math.hypot(pt.x - this.center.x, pt.y - this.center.y);
        this.previewEl.geometry.outerRadius = Math.max(1, radius);
        this.previewEl.geometry.innerRadius = Math.max(0.5, radius * 0.45);

        events.emit('document:changed', { action: 'draw-move' });
        events.emit('selection:changed', { selection: [this.previewEl.id] });
    }

    onPointerUp() {
        if (!this.isDrawing || !this.previewEl) return;
        this.isDrawing = false;

        if (this.previewEl.geometry.outerRadius < 3) {
            this.previewEl.geometry.outerRadius = 25; // 50mm diameter default star
            this.previewEl.geometry.innerRadius = 12.5;
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
