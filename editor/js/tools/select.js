/**
 * VectorCutter - Select & Transform Tool
 * Handles element selection, dragging, 8-point handle manipulation, rotation,
 * marquee drag-selection, and keyboard navigation.
 */

import { translationMatrix, rotationMatrix, scaleMatrix, multiplyMatrix, transformPoint } from '../model/matrix.js';
import { TransformElementsCommand, DeleteElementsCommand, AddElementCommand, UpdateElementPropsCommand } from '../core/commands.js';
import { getElementLocalBounds } from '../model/bounds.js';
import { events } from '../core/events.js';

export class SelectTool {
    constructor(camera, store) {
        this.camera = camera;
        this.store = store;

        this.isDragging = false;
        this.isTransforming = false;
        this.isMarquee = false;
        this.activeHandle = null;

        this.dragStart = { x: 0, y: 0 };
        this.marqueeStart = { sx: 0, sy: 0, wx: 0, wy: 0 };
        this.marqueeEl = null;

        this.initialTransforms = new Map();
        this.initialGeometries = new Map();
        this.initialLocalBox = null;
        this.initialAngle = 0;
        this.initialCenter = { x: 0, y: 0 };

        this.bindKeyboardShortcuts();
    }

    bindKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea, select')) return;

            const selected = this.store.getSelectedElements();

            // Arrow keys nudging
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code) && selected.length > 0) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1; // mm
                let dx = 0, dy = 0;
                if (e.code === 'ArrowLeft') dx = -step;
                if (e.code === 'ArrowRight') dx = step;
                if (e.code === 'ArrowUp') dy = -step;
                if (e.code === 'ArrowDown') dy = step;

                const transforms = [];
                selected.forEach(el => {
                    const before = [...el.transform];
                    el.transform = multiplyMatrix(translationMatrix(dx, dy), el.transform);
                    transforms.push({ id: el.id, before, after: [...el.transform] });
                });

                this.store.dispatch(new TransformElementsCommand(transforms));
                return;
            }

            // Delete / Backspace
            if ((e.code === 'Delete' || e.code === 'Backspace') && selected.length > 0) {
                e.preventDefault();
                this.store.dispatch(new DeleteElementsCommand(selected.map(s => s.id), this.store.doc));
                this.store.clearSelection();
                return;
            }

            // Escape: Clear selection
            if (e.code === 'Escape') {
                this.store.clearSelection();
                return;
            }

            // Ctrl+A: Select All
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA') {
                e.preventDefault();
                this.store.setSelection([...this.store.doc.order]);
                return;
            }

            // Ctrl+D: Duplicate
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD' && selected.length > 0) {
                e.preventDefault();
                this.duplicateSelected();
                return;
            }
        });
    }

    duplicateSelected() {
        const selected = this.store.getSelectedElements();
        if (selected.length === 0) return;

        this.store.beginBatch();
        const newIds = [];
        selected.forEach(el => {
            const clone = JSON.parse(JSON.stringify(el));
            clone.id = 'el_' + Math.random().toString(36).substr(2, 9);
            // Offset clone by 10mm
            clone.transform = multiplyMatrix(translationMatrix(10, 10), clone.transform);
            this.store.dispatch(new AddElementCommand(clone));
            newIds.push(clone.id);
        });
        this.store.endBatch('Duplicate Elements');
        this.store.setSelection(newIds);
    }

    onPointerDown(pt, e) {
        const handle = e.target.dataset?.handle;

        // 1. Clicked a handle (resize or rotate)
        if (handle) {
            this.isTransforming = true;
            this.activeHandle = handle;
            this.dragStart = { x: pt.x, y: pt.y };
            this.captureInitialState();
            e.stopPropagation();
            return;
        }

        // 2. Hit-test world elements
        const hitId = this.hitTest(pt.screenX, pt.screenY, e.target);
        if (hitId) {
            if (e.shiftKey) {
                const sel = new Set(this.store.doc.selection);
                if (sel.has(hitId)) sel.delete(hitId);
                else sel.add(hitId);
                this.store.setSelection(Array.from(sel));
            } else {
                if (!this.store.doc.selection.includes(hitId)) {
                    this.store.setSelection([hitId]);
                }
            }

            this.isDragging = true;
            this.dragStart = { x: pt.x, y: pt.y };
            this.captureInitialState();
            return;
        }

        // 3. Clicked empty canvas -> Start Marquee Box Selection
        if (!e.shiftKey) {
            this.store.clearSelection();
        }

        this.isMarquee = true;
        this.marqueeStart = {
            sx: pt.screenX,
            sy: pt.screenY,
            wx: pt.x,
            wy: pt.y
        };
        this.createMarqueeElement();
    }

    onPointerMove(pt, e) {
        if (this.isTransforming && this.activeHandle) {
            this.applyHandleTransform(pt, e);
            return;
        }

        if (this.isDragging) {
            const dx = pt.x - this.dragStart.x;
            const dy = pt.y - this.dragStart.y;

            this.initialTransforms.forEach((initM, id) => {
                const el = this.store.getElement(id);
                if (el) {
                    el.transform = multiplyMatrix(translationMatrix(dx, dy), initM);
                }
            });

            events.emit('document:changed', { action: 'drag-move' });
            events.emit('selection:changed', { selection: [...this.store.doc.selection] });
            return;
        }

        if (this.isMarquee && this.marqueeEl) {
            const left = Math.min(this.marqueeStart.sx, pt.screenX);
            const top = Math.min(this.marqueeStart.sy, pt.screenY);
            const w = Math.abs(pt.screenX - this.marqueeStart.sx);
            const h = Math.abs(pt.screenY - this.marqueeStart.sy);

            this.marqueeEl.setAttribute('x', left);
            this.marqueeEl.setAttribute('y', top);
            this.marqueeEl.setAttribute('width', Math.max(1, w));
            this.marqueeEl.setAttribute('height', Math.max(1, h));
        }
    }

    onPointerUp(pt, e) {
        if (this.isTransforming) {
            this.isTransforming = false;
            this.activeHandle = null;
            this.commitTransformHistory();
            return;
        }

        if (this.isDragging) {
            this.isDragging = false;
            this.commitTransformHistory();
            return;
        }

        if (this.isMarquee) {
            this.isMarquee = false;
            if (this.marqueeEl) {
                this.marqueeEl.remove();
                this.marqueeEl = null;
            }

            const minX = Math.min(this.marqueeStart.wx, pt.x);
            const maxX = Math.max(this.marqueeStart.wx, pt.x);
            const minY = Math.min(this.marqueeStart.wy, pt.y);
            const maxY = Math.max(this.marqueeStart.wy, pt.y);

            if (maxX - minX > 2 || maxY - minY > 2) {
                const matchedIds = [];
                for (const id of this.store.doc.order) {
                    const el = this.store.doc.elements[id];
                    if (!el) continue;
                    const box = getElementLocalBounds(el);
                    const elX = el.transform[4] + box.x;
                    const elY = el.transform[5] + box.y;
                    const elR = elX + box.width;
                    const elB = elY + box.height;

                    // AABB intersection check
                    if (elX <= maxX && elR >= minX && elY <= maxY && elB >= minY) {
                        matchedIds.push(id);
                    }
                }
                this.store.setSelection(matchedIds);
            }
        }
    }

    createMarqueeElement() {
        const overlaySvg = document.getElementById('overlaySvg');
        if (!overlaySvg) return;

        const ns = "http://www.w3.org/2000/svg";
        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', this.marqueeStart.sx);
        rect.setAttribute('y', this.marqueeStart.sy);
        rect.setAttribute('width', '1');
        rect.setAttribute('height', '1');
        rect.setAttribute('fill', 'rgba(0, 122, 204, 0.12)');
        rect.setAttribute('stroke', '#007acc');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('stroke-dasharray', '4 3');
        rect.style.pointerEvents = 'none';

        overlaySvg.appendChild(rect);
        this.marqueeEl = rect;
    }

    captureInitialState() {
        this.initialTransforms.clear();
        this.initialGeometries.clear();

        const selected = this.store.getSelectedElements();
        selected.forEach(el => {
            this.initialTransforms.set(el.id, [...el.transform]);
            this.initialGeometries.set(el.id, JSON.parse(JSON.stringify(el.geometry || {})));
        });

        if (selected.length === 1) {
            const el = selected[0];
            this.initialLocalBox = getElementLocalBounds(el);
            const m = el.transform;
            this.initialAngle = Math.atan2(m[1], m[0]);
            const cx = this.initialLocalBox.x + this.initialLocalBox.width / 2;
            const cy = this.initialLocalBox.y + this.initialLocalBox.height / 2;
            this.initialCenter = transformPoint(m, { x: cx, y: cy });
        }
    }

    applyHandleTransform(pt, e) {
        const selected = this.store.getSelectedElements();
        if (selected.length !== 1) return;

        const el = selected[0];
        const initM = this.initialTransforms.get(el.id);
        const initG = this.initialGeometries.get(el.id);
        if (!initM || !initG || !this.initialLocalBox) return;

        if (this.activeHandle === 'rotate') {
            const angleRad = Math.atan2(pt.y - this.initialCenter.y, pt.x - this.initialCenter.x);
            let deg = (angleRad * 180) / Math.PI + 90;

            if (e && e.shiftKey) {
                deg = Math.round(deg / 15) * 15;
            }

            const mRot = rotationMatrix(deg, this.initialCenter.x, this.initialCenter.y);
            // Translate to center, apply rotation
            el.transform = multiplyMatrix(mRot, translationMatrix(this.initialCenter.x - initM[4], this.initialCenter.y - initM[5]));
            el.transform[4] = this.initialCenter.x - (this.initialLocalBox.width / 2) * Math.cos(deg * Math.PI / 180);
            el.transform[5] = this.initialCenter.y - (this.initialLocalBox.height / 2) * Math.sin(deg * Math.PI / 180);

            events.emit('document:changed', { action: 'rotate' });
            events.emit('selection:changed', { selection: [el.id] });
            return;
        }

        // 8-point resize handles
        const dxWorld = pt.x - this.dragStart.x;
        const dyWorld = pt.y - this.dragStart.y;

        // Transform world delta into element's local coordinate system
        const cos = Math.cos(-this.initialAngle);
        const sin = Math.sin(-this.initialAngle);
        const localDx = dxWorld * cos - dyWorld * sin;
        const localDy = dxWorld * sin + dyWorld * cos;

        const w0 = this.initialLocalBox.width;
        const h0 = this.initialLocalBox.height;

        let dw = 0, dh = 0;
        let shiftLocalX = 0, shiftLocalY = 0;

        const h = this.activeHandle;
        if (h.includes('e')) { dw = localDx; }
        if (h.includes('w')) { dw = -localDx; shiftLocalX = localDx; }
        if (h.includes('s')) { dh = localDy; }
        if (h.includes('n')) { dh = -localDy; shiftLocalY = localDy; }

        // Shift key: lock aspect ratio
        if (e && e.shiftKey && w0 > 0 && h0 > 0 && (h.length === 2)) {
            const aspect = w0 / h0;
            if (Math.abs(dw) > Math.abs(dh)) {
                dh = dw / aspect;
                if (h.includes('n')) shiftLocalY = -dh;
            } else {
                dw = dh * aspect;
                if (h.includes('w')) shiftLocalX = -dw;
            }
        }

        const newW = Math.max(1, w0 + dw);
        const newH = Math.max(1, h0 + dh);

        // Apply new geometry
        if (el.type === 'rect') {
            el.geometry.width = newW;
            el.geometry.height = newH;
        } else if (el.type === 'circle') {
            el.geometry.r = Math.max(0.5, newW / 2);
        } else if (el.type === 'ellipse') {
            el.geometry.rx = Math.max(0.5, newW / 2);
            el.geometry.ry = Math.max(0.5, newH / 2);
        } else if (el.type === 'polygon') {
            el.geometry.radius = Math.max(1, newW / 2);
        } else if (el.type === 'star') {
            el.geometry.outerRadius = Math.max(1, newW / 2);
            el.geometry.innerRadius = Math.max(0.5, newW * 0.25);
        }

        // Shift origin in world coordinates
        const worldShiftX = shiftLocalX * Math.cos(this.initialAngle) - shiftLocalY * Math.sin(this.initialAngle);
        const worldShiftY = shiftLocalX * Math.sin(this.initialAngle) + shiftLocalY * Math.cos(this.initialAngle);

        el.transform[4] = initM[4] + worldShiftX;
        el.transform[5] = initM[5] + worldShiftY;

        events.emit('document:changed', { action: 'resize' });
        events.emit('selection:changed', { selection: [el.id] });
    }

    commitTransformHistory() {
        const transforms = [];
        this.initialTransforms.forEach((before, id) => {
            const el = this.store.getElement(id);
            if (el) {
                transforms.push({ id, before, after: [...el.transform] });
            }
        });
        if (transforms.length > 0) {
            this.store.dispatch(new TransformElementsCommand(transforms));
        }
    }

    hitTest(sx, sy, target) {
        if (target && target.dataset?.elementId) {
            return target.dataset.elementId;
        }
        let curr = target;
        while (curr && curr !== document.body) {
            if (curr.dataset?.elementId) return curr.dataset.elementId;
            curr = curr.parentElement;
        }
        return null;
    }
}
