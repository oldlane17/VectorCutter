/**
 * VectorCutter - Rectangle Drawing Tool
 */

import { createElement } from '../model/elements.js';
import { AddElementCommand } from '../core/commands.js';
import { translationMatrix } from '../model/matrix.js';
import { requestRender } from '../core/scheduler.js';

export class RectTool {
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
        this.previewEl = createElement('rect', {
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            transform: translationMatrix(pt.x, pt.y)
        });
        this.store.doc.elements[this.previewEl.id] = this.previewEl;
        this.store.doc.order.push(this.previewEl.id);
        this.store.setSelection([this.previewEl.id]);
        requestRender();
    }

    onPointerMove(pt, e) {
        if (!this.isDrawing || !this.previewEl) return;
        let w = pt.x - this.start.x;
        let h = pt.y - this.start.y;

        // Shift key locks 1:1 square
        if (e && e.shiftKey) {
            const side = Math.max(Math.abs(w), Math.abs(h));
            w = (w < 0 ? -1 : 1) * side;
            h = (h < 0 ? -1 : 1) * side;
        }

        const left = Math.min(this.start.x, this.start.x + w);
        const top = Math.min(this.start.y, this.start.y + h);
        const width = Math.max(0.5, Math.abs(w));
        const height = Math.max(0.5, Math.abs(h));

        this.previewEl.transform = translationMatrix(left, top);
        this.previewEl.geometry.width = width;
        this.previewEl.geometry.height = height;

        requestRender();
    }

    onPointerUp() {
        if (!this.isDrawing || !this.previewEl) return;
        this.isDrawing = false;

        if (this.previewEl.geometry.width < 3 && this.previewEl.geometry.height < 3) {
            const defW = 60;
            const defH = 40;
            this.previewEl.transform = translationMatrix(this.start.x - defW / 2, this.start.y - defH / 2);
            this.previewEl.geometry.width = defW;
            this.previewEl.geometry.height = defH;
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
