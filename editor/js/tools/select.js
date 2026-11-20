/**
 * VectorCutter - Select & Transform Tool
 * Handles element selection, dragging, 8-point handle manipulation, rotation,
 * marquee drag-selection, and keyboard navigation.
 */

import { translationMatrix, rotationMatrix, scaleMatrix, multiplyMatrix, transformPoint } from '../model/matrix.js';
import { TransformElementsCommand, DeleteElementsCommand, AddElementCommand, UpdateElementPropsCommand } from '../core/commands.js';
import { getElementLocalBounds } from '../model/bounds.js';
import { events } from '../core/events.js';
import { requestRender } from '../core/scheduler.js';

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
                const step = e.shiftKey ? 10 : (e.altKey ? 0.1 : 1); // mm
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
                requestRender();
                return;
            }

            // Delete / Backspace
            if ((e.code === 'Delete' || e.code === 'Backspace') && selected.length > 0) {
                e.preventDefault();
                this.store.dispatch(new DeleteElementsCommand(selected.map(s => s.id), this.store.doc));
                this.store.clearSelection();
                requestRender();
                return;
            }

            // Escape: Clear selection
            if (e.code === 'Escape') {
                this.store.clearSelection();
                requestRender();
                return;
            }

            // Ctrl+A: Select All
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA') {
                e.preventDefault();
                this.store.setSelection([...this.store.doc.order]);
                requestRender();
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
            clone.transform = multiplyMatrix(translationMatrix(10, 10), clone.transform);
            this.store.dispatch(new AddElementCommand(clone));
            newIds.push(clone.id);
        });
        this.store.endBatch('Duplicate Elements');
        this.store.setSelection(newIds);
        requestRender();
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
            const hitEl = this.store.getElement(hitId);
            if (hitEl && hitEl.locked) return; // Locked objects cannot be selected on canvas (§2)

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
            requestRender();
            return;
        }

        if (this.isDragging) {
            const dx = pt.x - this.dragStart.x;
            const dy = pt.y - this.dragStart.y;

            this.initialTransforms.forEach((initM, id) => {
                const el = this.store.getElement(id);
                if (el && !el.locked) {
                    el.transform = multiplyMatrix(translationMatrix(dx, dy), initM);
                }
            });

            requestRender();
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
            requestRender();
            return;
        }

        if (this.isDragging) {
            this.isDragging = false;
            this.commitDragHistory();
            requestRender();
            return;
        }

        if (this.isMarquee) {
            this.isMarquee = false;
            this.finishMarquee(pt);
            requestRender();
            return;
        }
    }

    captureInitialState() {
        this.initialTransforms.clear();
        this.initialGeometries.clear();
        const selected = this.store.getSelectedElements();

        selected.forEach(el => {
            this.initialTransforms.set(el.id, [...el.transform]);
            this.initialGeometries.set(el.id, JSON.parse(JSON.stringify(el.geometry)));
        });

        if (selected.length === 1) {
            const el = selected[0];
            this.initialLocalBox = getElementLocalBounds(el);
            const cx = this.initialLocalBox.x + this.initialLocalBox.width / 2;
            const cy = this.initialLocalBox.y + this.initialLocalBox.height / 2;
            this.initialCenter = transformPoint(cx, cy, el.transform);
            this.initialAngle = Math.atan2(this.dragStart.y - this.initialCenter.y, this.dragStart.x - this.initialCenter.x);
        }
    }

    applyHandleTransform(pt, e) {
        const selected = this.store.getSelectedElements();
        if (selected.length === 0) return;

        // Rotation Handle
        if (this.activeHandle === 'rot') {
            const currentAngle = Math.atan2(pt.y - this.initialCenter.y, pt.x - this.initialCenter.x);
            let dAngle = currentAngle - this.initialAngle;

            // Shift key snaps to 15-degree steps
            if (e && e.shiftKey) {
                const deg = (dAngle * 180) / Math.PI;
                const snappedDeg = Math.round(deg / 15) * 15;
                dAngle = (snappedDeg * Math.PI) / 180;
            }

            selected.forEach(el => {
                const initM = this.initialTransforms.get(el.id);
                if (initM) {
                    const toCenter = translationMatrix(-this.initialCenter.x, -this.initialCenter.y);
                    const rot = rotationMatrix(dAngle);
                    const fromCenter = translationMatrix(this.initialCenter.x, this.initialCenter.y);
                    const t = multiplyMatrix(fromCenter, multiplyMatrix(rot, toCenter));
                    el.transform = multiplyMatrix(t, initM);
                }
            });
            return;
        }

        // Resize handles (nw, n, ne, e, se, s, sw, w)
        if (selected.length === 1 && this.initialLocalBox) {
            const el = selected[0];
            const initM = this.initialTransforms.get(el.id);
            if (!initM) return;

            const box = this.initialLocalBox;
            const dx = pt.x - this.dragStart.x;
            const dy = pt.y - this.dragStart.y;

            let scaleX = 1;
            let scaleY = 1;

            if (this.activeHandle.includes('e')) scaleX = (box.width + dx) / box.width;
            if (this.activeHandle.includes('w')) scaleX = (box.width - dx) / box.width;
            if (this.activeHandle.includes('s')) scaleY = (box.height + dy) / box.height;
            if (this.activeHandle.includes('n')) scaleY = (box.height - dy) / box.height;

            // Aspect ratio lock with Shift
            if (e && e.shiftKey) {
                const s = Math.max(Math.abs(scaleX), Math.abs(scaleY));
                scaleX = (scaleX < 0 ? -1 : 1) * s;
                scaleY = (scaleY < 0 ? -1 : 1) * s;
            }

            scaleX = Math.max(0.01, scaleX);
            scaleY = Math.max(0.01, scaleY);

            el.transform = multiplyMatrix(initM, scaleMatrix(scaleX, scaleY));
        }
    }

    commitDragHistory() {
        const transforms = [];
        this.store.getSelectedElements().forEach(el => {
            const before = this.initialTransforms.get(el.id);
            if (before) {
                transforms.push({ id: el.id, before, after: [...el.transform] });
            }
        });
        if (transforms.length > 0) {
            this.store.dispatch(new TransformElementsCommand(transforms));
        }
    }

    commitTransformHistory() {
        const transforms = [];
        this.store.getSelectedElements().forEach(el => {
            const before = this.initialTransforms.get(el.id);
            if (before) {
                transforms.push({ id: el.id, before, after: [...el.transform] });
            }
        });
        if (transforms.length > 0) {
            this.store.dispatch(new TransformElementsCommand(transforms));
        }
    }

    hitTest(screenX, screenY, target) {
        let el = target;
        while (el && el !== document.body) {
            if (el.dataset?.elementId) {
                return el.dataset.elementId;
            }
            el = el.parentElement;
        }

        // Point-in-polygon bounding hit-test
        const worldPt = this.camera.toWorld(screenX, screenY);
        const order = [...this.store.doc.order].reverse();

        for (const id of order) {
            const item = this.store.getElement(id);
            if (!item || item.visible === false || item.locked) continue;
            const b = getElementLocalBounds(item);
            const tx = item.transform[4] || 0;
            const ty = item.transform[5] || 0;
            if (worldPt.x >= tx + b.x && worldPt.x <= tx + b.x + b.width &&
                worldPt.y >= ty + b.y && worldPt.y <= ty + b.y + b.height) {
                return id;
            }
        }

        return null;
    }

    createMarqueeElement() {
        const overlay = document.getElementById('overlaySvg');
        if (!overlay) return;

        this.marqueeEl = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        this.marqueeEl.setAttribute('fill', 'rgba(0, 122, 204, 0.1)');
        this.marqueeEl.setAttribute('stroke', '#007acc');
        this.marqueeEl.setAttribute('stroke-width', '1');
        this.marqueeEl.setAttribute('stroke-dasharray', '4 4');
        overlay.appendChild(this.marqueeEl);
    }

    finishMarquee(pt) {
        if (this.marqueeEl) {
            this.marqueeEl.remove();
            this.marqueeEl = null;
        }

        const left = Math.min(this.marqueeStart.wx, pt.x);
        const top = Math.min(this.marqueeStart.wy, pt.y);
        const right = Math.max(this.marqueeStart.wx, pt.x);
        const bottom = Math.max(this.marqueeStart.wy, pt.y);

        const hits = [];
        this.store.doc.order.forEach(id => {
            const el = this.store.getElement(id);
            if (!el || el.visible === false || el.locked) return;
            const b = getElementLocalBounds(el);
            const tx = el.transform[4] || 0;
            const ty = el.transform[5] || 0;

            const elL = tx + b.x;
            const elT = ty + b.y;
            const elR = elL + b.width;
            const elB = elT + b.height;

            // Box overlap test
            if (elL < right && elR > left && elT < bottom && elB > top) {
                hits.push(id);
            }
        });

        this.store.setSelection(hits);
    }
}
