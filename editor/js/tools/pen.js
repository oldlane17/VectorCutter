/**
 * VectorCutter - Pen & Freehand Path Tool
 */

import { createElement } from '../model/elements.js';
import { AddElementCommand } from '../core/commands.js';
import { translationMatrix } from '../model/matrix.js';
import { events } from '../core/events.js';

export class PenTool {
    constructor(camera, store) {
        this.camera = camera;
        this.store = store;
        this.isDrawing = false;
        this.points = [];
        this.previewEl = null;
        this.origin = { x: 0, y: 0 };
    }

    onPointerDown(pt) {
        this.isDrawing = true;
        this.points = [{ x: 0, y: 0 }];
        this.origin = { x: pt.x, y: pt.y };

        this.previewEl = createElement('path', {
            d: 'M 0 0',
            style: { fill: 'none', stroke: '#007acc', strokeWidth: 0.5 },
            transform: translationMatrix(pt.x, pt.y)
        });

        this.store.doc.elements[this.previewEl.id] = this.previewEl;
        this.store.doc.order.push(this.previewEl.id);
        this.store.setSelection([this.previewEl.id]);
        events.emit('document:changed', { action: 'draw-start' });
    }

    onPointerMove(pt) {
        if (!this.isDrawing || !this.previewEl) return;
        const relX = pt.x - this.origin.x;
        const relY = pt.y - this.origin.y;
        this.points.push({ x: relX, y: relY });

        // Build path data
        let d = `M ${this.points[0].x.toFixed(2)} ${this.points[0].y.toFixed(2)}`;
        for (let i = 1; i < this.points.length; i++) {
            d += ` L ${this.points[i].x.toFixed(2)} ${this.points[i].y.toFixed(2)}`;
        }
        this.previewEl.geometry.d = d;

        events.emit('document:changed', { action: 'draw-move' });
        events.emit('selection:changed', { selection: [this.previewEl.id] });
    }

    onPointerUp() {
        if (!this.isDrawing || !this.previewEl) return;
        this.isDrawing = false;

        if (this.points.length <= 2) {
            // Default 50mm smooth wavy curve
            this.previewEl.geometry.d = 'M 0 0 Q 25 -20 50 0';
        }

        const finalEl = { ...this.previewEl };
        delete this.store.doc.elements[this.previewEl.id];
        const idx = this.store.doc.order.indexOf(this.previewEl.id);
        if (idx !== -1) this.store.doc.order.splice(idx, 1);

        this.store.dispatch(new AddElementCommand(finalEl));
        this.store.setSelection([finalEl.id]);
        this.previewEl = null;
        this.points = [];
    }
}
