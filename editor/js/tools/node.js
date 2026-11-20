/**
 * VectorCutter - Curve / Node Edit Tool
 */

import { createElement } from '../model/elements.js';
import { AddElementCommand } from '../core/commands.js';
import { translationMatrix } from '../model/matrix.js';
import { events } from '../core/events.js';

export class NodeTool {
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

        this.previewEl = createElement('path', {
            d: 'M 0 0 Q 0 0 0 0',
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
        const dx = pt.x - this.start.x;
        const dy = pt.y - this.start.y;
        const cx = dx / 2;
        const cy = dy - 20; // curve arch

        this.previewEl.geometry.d = `M 0 0 Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${dx.toFixed(2)} ${dy.toFixed(2)}`;

        events.emit('document:changed', { action: 'draw-move' });
        events.emit('selection:changed', { selection: [this.previewEl.id] });
    }

    onPointerUp() {
        if (!this.isDrawing || !this.previewEl) return;
        this.isDrawing = false;

        const d = this.previewEl.geometry.d || '';
        if (d.includes('M 0 0 Q 0 0 0 0')) {
            // Default 60mm arched curve
            this.previewEl.geometry.d = 'M 0 0 Q 30 -25 60 0';
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
