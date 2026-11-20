/**
 * VectorCutter - Ellipse Drawing Tool
 */

import { createElement } from '../model/elements.js';
import { AddElementCommand } from '../core/commands.js';
import { translationMatrix } from '../model/matrix.js';
import { requestRender } from '../core/scheduler.js';

export class EllipseTool {
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
        this.previewEl = createElement('ellipse', {
            cx: 0,
            cy: 0,
            rx: 1,
            ry: 1,
            transform: translationMatrix(pt.x, pt.y)
        });
        this.store.doc.elements[this.previewEl.id] = this.previewEl;
        this.store.doc.order.push(this.previewEl.id);
        this.store.setSelection([this.previewEl.id]);
        requestRender();
    }

    onPointerMove(pt, e) {
        if (!this.isDrawing || !this.previewEl) return;
        let rx = Math.abs(pt.x - this.center.x);
        let ry = Math.abs(pt.y - this.center.y);

        if (e && e.shiftKey) {
            const r = Math.max(rx, ry);
            rx = r;
            ry = r;
        }

        this.previewEl.geometry.rx = Math.max(0.5, rx);
        this.previewEl.geometry.ry = Math.max(0.5, ry);
        requestRender();
    }

    onPointerUp() {
        if (!this.isDrawing || !this.previewEl) return;
        this.isDrawing = false;

        if (this.previewEl.geometry.rx < 3 && this.previewEl.geometry.ry < 3) {
            this.previewEl.geometry.rx = 35;
            this.previewEl.geometry.ry = 20;
        }

        const finalEl = { ...this.previewEl };
        delete this.store.doc.elements[this.previewEl.id];
        const idx = this.store.doc.order.indexOf(this.previewEl.id);
        if (idx !== -1) this.store.doc.order.splice(idx, 1);

        this.store.dispatch(new AddElementCommand(finalEl));
        this.store.setSelection([finalEl.id]);
        this.previewEl = null;
        requestRender();
    }
}
