/**
 * VectorCutter - Select & Transform Tool
 * Handles element selection, dragging, 8-point handle manipulation, rotation,
 * marquee drag-selection, and keyboard navigation.
 */

import { translationMatrix, rotationMatrix, scaleMatrix, multiplyMatrix, transformPoint } from '../model/matrix.js';
import { TransformElementsCommand, DeleteElementsCommand, AddElementCommand, UpdateElementPropsCommand } from '../core/commands.js';
import { getElementLocalBounds, getTransformedCorners, pointInPolygon, getRotationCentre, getElementSnapPoints, getAdaptiveGridStep } from '../model/bounds.js';
import { fromMm } from '../model/units.js';
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
        this.lassoPoints = [];

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
                    if (el.locked) return;
                    const before = [...el.transform];
                    el.transform = multiplyMatrix(translationMatrix(dx, dy), el.transform);
                    transforms.push({ id: el.id, before, after: [...el.transform] });
                });

                if (transforms.length > 0) {
                    this.store.dispatch(new TransformElementsCommand(transforms));
                    requestRender();
                }
                return;
            }

            // Delete / Backspace
            if ((e.code === 'Delete' || e.code === 'Backspace') && selected.length > 0) {
                e.preventDefault();
                const unlocked = selected.filter(s => !s.locked);
                if (unlocked.length > 0) {
                    this.store.dispatch(new DeleteElementsCommand(unlocked.map(s => s.id), this.store.doc));
                    this.store.clearSelection();
                    requestRender();
                }
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
        let handle = e.target.dataset?.handle;
        if (!handle) {
            handle = this.hitTestHandle(pt.screenX, pt.screenY);
        }

        // 1. Clicked a handle (resize or rotate)
        if (handle) {
            const selectedEls = this.store.getSelectedElements();
            if (selectedEls.some(el => el.locked)) return; // Locked objects cannot be transformed

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
            this.dragStart = { x: pt.rawX ?? pt.x, y: pt.rawY ?? pt.y };
            this.captureInitialState();
            return;
        }

        // 3. Clicked empty canvas -> Start Marquee Box or Lasso Selection
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
        this.lassoPoints = [{ x: pt.screenX, y: pt.screenY, wx: pt.x, wy: pt.y }];
        this.createMarqueeElement();
    }

    onPointerMove(pt, e) {
        if (this.isTransforming && this.activeHandle) {
            this.applyHandleTransform(pt, e);
            this.syncPropertiesInputs();
            requestRender();
            return;
        }

        if (this.isDragging) {
            let dx = (pt.rawX ?? pt.x) - this.dragStart.x;
            let dy = (pt.rawY ?? pt.y) - this.dragStart.y;

            const snapMode = window.__vcSnapMode || 'none';
            window.__vcActiveSnapPoint = null;

            if (snapMode === 'grid') {
                const step = getAdaptiveGridStep(this.camera.scale);
                const firstEntry = this.initialTransforms.entries().next().value;
                if (firstEntry) {
                    const [firstId, initM] = firstEntry;
                    const firstEl = this.store.getElement(firstId);
                    if (firstEl) {
                        const b = getElementLocalBounds(firstEl);
                        const tl = transformPoint(initM, { x: b.x, y: b.y });
                        const snappedX = Math.round((tl.x + dx) / step) * step;
                        const snappedY = Math.round((tl.y + dy) / step) * step;
                        dx = snappedX - tl.x;
                        dy = snappedY - tl.y;
                    }
                }
            } else if (snapMode === 'geometry') {
                const threshold = 16 / this.camera.scale;
                let bestDist = threshold;
                let snapOffset = null;
                let snapTargetPt = null;

                // Collect target snap points from all non-selected visible elements
                const selection = this.store.doc.selection || [];
                const targetPts = [];
                const elements = this.store.doc.elements || {};
                for (const id in elements) {
                    if (selection.includes(id)) continue;
                    const other = elements[id];
                    if (other && other.visible !== false) {
                        targetPts.push(...getElementSnapPoints(other));
                    }
                }

                // Test each selected element's snap points against targetPts
                if (targetPts.length > 0) {
                    for (const [id, initM] of this.initialTransforms.entries()) {
                        const el = this.store.getElement(id);
                        if (!el || el.locked) continue;
                        const prevM = el.transform;
                        el.transform = multiplyMatrix(translationMatrix(dx, dy), initM);
                        const movedPts = getElementSnapPoints(el);
                        el.transform = prevM;

                        for (const mp of movedPts) {
                            for (const tp of targetPts) {
                                const dist = Math.hypot(tp.x - mp.x, tp.y - mp.y);
                                if (dist < bestDist) {
                                    bestDist = dist;
                                    snapOffset = { x: tp.x - mp.x, y: tp.y - mp.y };
                                    snapTargetPt = tp;
                                }
                            }
                        }
                    }
                }

                if (snapOffset) {
                    dx += snapOffset.x;
                    dy += snapOffset.y;
                    window.__vcActiveSnapPoint = snapTargetPt;
                }
            }

            this.initialTransforms.forEach((initM, id) => {
                const el = this.store.getElement(id);
                if (el && !el.locked) {
                    el.transform = multiplyMatrix(translationMatrix(dx, dy), initM);
                }
            });

            this.syncPropertiesInputs();
            requestRender();
            return;
        }

        if (this.isMarquee && this.marqueeEl) {
            const mode = window.__vcSelectionMode || 'rect';
            if (mode === 'lasso') {
                this.lassoPoints.push({ x: pt.screenX, y: pt.screenY, wx: pt.x, wy: pt.y });
                const ptsStr = this.lassoPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                this.marqueeEl.setAttribute('points', ptsStr);
            } else {
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
    }

    onPointerUp(pt, e) {
        window.__vcActiveSnapPoint = null;
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
            this.initialCenter = getRotationCentre(el);
            this.initialAngle = Math.atan2(this.dragStart.y - this.initialCenter.y, this.dragStart.x - this.initialCenter.x);
        } else if (selected.length > 1) {
            // Group center
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            selected.forEach(el => {
                const b = getElementLocalBounds(el);
                const corners = getTransformedCorners(b, el.transform);
                corners.forEach(c => {
                    minX = Math.min(minX, c.x);
                    minY = Math.min(minY, c.y);
                    maxX = Math.max(maxX, c.x);
                    maxY = Math.max(maxY, c.y);
                });
            });
            this.initialGroupBox = { x: minX, y: minY, width: Math.max(0.001, maxX - minX), height: Math.max(0.001, maxY - minY) };
            this.initialCenter = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
            this.initialAngle = Math.atan2(this.dragStart.y - this.initialCenter.y, this.dragStart.x - this.initialCenter.x);
        }
    }

    hitTestHandle(sx, sy) {
        const overlay = document.getElementById('overlaySvg');
        if (!overlay) return null;
        const handles = overlay.querySelectorAll('[data-handle]');
        let best = null;
        let bestDist = 12; // 12px grab radius
        handles.forEach(h => {
            let cx, cy;
            if (h.tagName.toLowerCase() === 'circle') {
                cx = parseFloat(h.getAttribute('cx'));
                cy = parseFloat(h.getAttribute('cy'));
            } else {
                cx = parseFloat(h.getAttribute('x')) + parseFloat(h.getAttribute('width')) / 2;
                cy = parseFloat(h.getAttribute('y')) + parseFloat(h.getAttribute('height')) / 2;
            }
            const dist = Math.hypot(cx - sx, cy - sy);
            if (dist <= bestDist) {
                bestDist = dist;
                best = h.dataset.handle;
            }
        });
        return best;
    }

    applyHandleTransform(pt, e) {
        const selected = this.store.getSelectedElements();
        if (selected.length === 0) return;

        // Rotation Handle ('rot' or 'rotate')
        if (this.activeHandle === 'rot' || this.activeHandle === 'rotate') {
            const currentAngle = Math.atan2(pt.y - this.initialCenter.y, pt.x - this.initialCenter.x);
            let dAngle = currentAngle - this.initialAngle;

            // Shift key snaps to 15-degree steps
            if (e && e.shiftKey) {
                const deg = (dAngle * 180) / Math.PI;
                const snappedDeg = Math.round(deg / 15) * 15;
                dAngle = (snappedDeg * Math.PI) / 180;
            }

            selected.forEach(el => {
                if (el.locked) return;
                const initM = this.initialTransforms.get(el.id);
                if (initM) {
                    const toCenter = translationMatrix(-this.initialCenter.x, -this.initialCenter.y);
                    const rot = rotationMatrix((dAngle * 180) / Math.PI);
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
            if (el.locked) return;
            const initM = this.initialTransforms.get(el.id);
            if (!initM) return;

            const [a, b, c, d] = initM;
            const det = a * d - b * c;
            if (Math.abs(det) < 1e-8) return;

            // World displacement
            const dx_w = pt.x - this.dragStart.x;
            const dy_w = pt.y - this.dragStart.y;

            // Project world displacement into element local coordinates
            const dx_loc = (d * dx_w - c * dy_w) / det;
            const dy_loc = (-b * dx_w + a * dy_w) / det;

            const box = this.initialLocalBox;
            const w0 = Math.max(0.001, box.width);
            const h0 = Math.max(0.001, box.height);

            let anchorX = box.x;
            let anchorY = box.y;
            let kx = 1;
            let ky = 1;

            if (this.activeHandle.includes('e')) {
                anchorX = box.x;
                const wPrime = w0 + dx_loc;
                kx = Math.max(0.01, wPrime / w0);
            } else if (this.activeHandle.includes('w')) {
                anchorX = box.x + w0;
                const wPrime = w0 - dx_loc;
                kx = Math.max(0.01, wPrime / w0);
            }

            if (this.activeHandle.includes('s')) {
                anchorY = box.y;
                const hPrime = h0 + dy_loc;
                ky = Math.max(0.01, hPrime / h0);
            } else if (this.activeHandle.includes('n')) {
                anchorY = box.y + h0;
                const hPrime = h0 - dy_loc;
                ky = Math.max(0.01, hPrime / h0);
            }

            // Aspect ratio lock (Keep Ratio toggle, Shift temporarily inverts)
            const keepRatio = (window.__vcKeepRatio !== false) !== !!(e && e.shiftKey);
            if (keepRatio && this.activeHandle.length === 2) { // corner handles (nw, ne, se, sw)
                const uniform = Math.max(kx, ky);
                kx = uniform;
                ky = uniform;
            }

            const sLocal = scaleMatrix(kx, ky, anchorX, anchorY);
            el.transform = multiplyMatrix(initM, sLocal);
        } else if (selected.length > 1 && this.initialGroupBox) {
            const box = this.initialGroupBox;
            const w0 = box.width;
            const h0 = box.height;
            const dx_w = pt.x - this.dragStart.x;
            const dy_w = pt.y - this.dragStart.y;

            let anchorX = box.x;
            let anchorY = box.y;
            let kx = 1;
            let ky = 1;

            if (this.activeHandle.includes('e')) {
                anchorX = box.x;
                kx = Math.max(0.01, (w0 + dx_w) / w0);
            } else if (this.activeHandle.includes('w')) {
                anchorX = box.x + w0;
                kx = Math.max(0.01, (w0 - dx_w) / w0);
            }

            if (this.activeHandle.includes('s')) {
                anchorY = box.y;
                ky = Math.max(0.01, (h0 + dy_w) / h0);
            } else if (this.activeHandle.includes('n')) {
                anchorY = box.y + h0;
                ky = Math.max(0.01, (h0 - dy_w) / h0);
            }

            const keepRatio = (window.__vcKeepRatio !== false) !== !!(e && e.shiftKey);
            if (keepRatio && this.activeHandle.length === 2) {
                const uniform = Math.max(kx, ky);
                kx = uniform;
                ky = uniform;
            }

            const sWorld = scaleMatrix(kx, ky, anchorX, anchorY);
            selected.forEach(el => {
                if (el.locked) return;
                const initM = this.initialTransforms.get(el.id);
                if (initM) {
                    el.transform = multiplyMatrix(sWorld, initM);
                }
            });
        }
    }

    syncPropertiesInputs() {
        const selected = this.store.getSelectedElements();
        if (selected.length !== 1) return;
        const el = selected[0];
        const box = getElementLocalBounds(el);
        const m = el.transform || [1, 0, 0, 1, 0, 0];
        const unit = this.store.doc.units || window.__vcDefaultUnit || 'mm';
        const effW = box.width * Math.hypot(m[0], m[1]);
        const effH = box.height * Math.hypot(m[2], m[3]);
        const rotDeg = Math.round((Math.atan2(m[1], m[0]) * 180) / Math.PI);

        const setVal = (id, v) => {
            const inp = document.getElementById(id);
            if (inp && document.activeElement !== inp) inp.value = v;
        };
        setVal('propX', fromMm(m[4], unit).toFixed(1));
        setVal('propY', fromMm(m[5], unit).toFixed(1));
        setVal('propW', fromMm(effW, unit).toFixed(1));
        setVal('propH', fromMm(effH, unit).toFixed(1));
        setVal('propRot', rotDeg);
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

        const worldPt = this.camera.toWorld(screenX, screenY);
        const order = [...this.store.doc.order].reverse();

        for (const id of order) {
            const item = this.store.getElement(id);
            if (!item || item.visible === false || item.locked) continue;
            if (!item.transform || !Array.isArray(item.transform)) continue;
            const b = getElementLocalBounds(item);
            const corners = getTransformedCorners(b, item.transform);
            if (pointInPolygon(worldPt.x, worldPt.y, corners)) {
                return id;
            }
        }

        return null;
    }

    createMarqueeElement() {
        const overlay = document.getElementById('overlaySvg');
        if (!overlay) return;
        const existing = document.getElementById('vcMarquee');
        if (existing) existing.remove();

        const mode = window.__vcSelectionMode || 'rect';
        if (mode === 'lasso') {
            this.marqueeEl = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            this.marqueeEl.id = 'vcMarquee';
            this.marqueeEl.setAttribute('fill', 'rgba(56, 189, 248, 0.14)');
            this.marqueeEl.setAttribute('stroke', '#38bdf8');
            this.marqueeEl.setAttribute('stroke-width', '1.5');
            this.marqueeEl.setAttribute('stroke-dasharray', '6 4');
            overlay.appendChild(this.marqueeEl);
        } else {
            this.marqueeEl = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            this.marqueeEl.id = 'vcMarquee';
            this.marqueeEl.setAttribute('fill', 'rgba(56, 189, 248, 0.14)');
            this.marqueeEl.setAttribute('stroke', '#38bdf8');
            this.marqueeEl.setAttribute('stroke-width', '1.5');
            this.marqueeEl.setAttribute('stroke-dasharray', '6 4');
            overlay.appendChild(this.marqueeEl);
        }
    }

    finishMarquee(pt) {
        if (this.marqueeEl) {
            this.marqueeEl.remove();
            this.marqueeEl = null;
        }

        const mode = window.__vcSelectionMode || 'rect';
        const hits = [];

        if (mode === 'lasso' && this.lassoPoints.length > 2) {
            const polyWorld = this.lassoPoints.map(p => ({ x: p.wx, y: p.wy }));
            this.store.doc.order.forEach(id => {
                const el = this.store.getElement(id);
                if (!el || el.visible === false || el.locked) return;
                const b = getElementLocalBounds(el);
                const corners = getTransformedCorners(b, el.transform || [1, 0, 0, 1, 0, 0]);
                // If any corner is inside lasso or center is inside
                const center = getRotationCentre(el);
                if (pointInPolygon(center.x, center.y, polyWorld) || corners.some(c => pointInPolygon(c.x, c.y, polyWorld))) {
                    hits.push(id);
                }
            });
        } else {
            const left = Math.min(this.marqueeStart.wx, pt.x);
            const top = Math.min(this.marqueeStart.wy, pt.y);
            const right = Math.max(this.marqueeStart.wx, pt.x);
            const bottom = Math.max(this.marqueeStart.wy, pt.y);

            this.store.doc.order.forEach(id => {
                const el = this.store.getElement(id);
                if (!el || el.visible === false || el.locked) return;
                const b = getElementLocalBounds(el);
                const corners = getTransformedCorners(b, el.transform || [1, 0, 0, 1, 0, 0]);
                const elL = Math.min(...corners.map(c => c.x));
                const elR = Math.max(...corners.map(c => c.x));
                const elT = Math.min(...corners.map(c => c.y));
                const elB = Math.max(...corners.map(c => c.y));

                // Box overlap test
                if (elL < right && elR > left && elT < bottom && elB > top) {
                    hits.push(id);
                }
            });
        }

        this.lassoPoints = [];
        this.store.setSelection(hits);
    }
}
