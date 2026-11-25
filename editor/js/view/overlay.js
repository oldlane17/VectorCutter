/**
 * VectorCutter - Screen-Space Selection Overlay
 * Renders selection boxes, handles, rotation knobs, and dimension badges in pure screen pixels.
 * Zero scaling distortion with zoom.
 */

import { getElementLocalBounds, getTransformedCorners, getRotationCentre } from '../model/bounds.js';
import { scaleMatrix, multiplyMatrix } from '../model/matrix.js';
import { TransformElementsCommand } from '../core/commands.js';
import { fromMm, toMm } from '../model/units.js';
import { requestRender } from '../core/scheduler.js';
import { getRotatedResizeCursor } from './cursors.js';

export class OverlayRenderer {
    constructor(overlaySvg, camera, store) {
        this.svg = overlaySvg;
        this.camera = camera;
        this.store = store;
        this.handleElements = [];
        this.activeAction = null;
    }

    clear() {
        Array.from(this.svg.children).forEach(child => {
            if (child.id !== 'vcMarquee') {
                child.remove();
            }
        });
        this.handleElements = [];
    }

    render() {
        this.clear();
        const selected = this.store.getSelectedElements();
        if (selected.length === 0) return;

        const ns = "http://www.w3.org/2000/svg";

        // 1. Single element oriented bounding box
        if (selected.length === 1) {
            const el = selected[0];
            const localBox = getElementLocalBounds(el);
            const cornersWorld = getTransformedCorners(localBox, el.transform);
            const cornersScreen = cornersWorld.map(pt => this.camera.toScreen(pt.x, pt.y));

            // Extract element rotation angle
            const m = el.transform;
            const rotRad = Math.atan2(m[1], m[0]);
            const rotDeg = (rotRad * 180) / Math.PI;

            // Draw light blue dashed oriented bounding polygon
            const poly = document.createElementNS(ns, 'polygon');
            poly.setAttribute('points', cornersScreen.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
            poly.setAttribute('fill', 'none');
            poly.setAttribute('stroke', '#38bdf8');
            poly.setAttribute('stroke-width', '1.5');
            poly.setAttribute('stroke-dasharray', '6 4');
            this.svg.appendChild(poly);

            // Compute side midpoints and center in screen space
            const pNW = cornersScreen[0];
            const pNE = cornersScreen[1];
            const pSE = cornersScreen[2];
            const pSW = cornersScreen[3];

            const pN = { x: (pNW.x + pNE.x) / 2, y: (pNW.y + pNE.y) / 2 };
            const pE = { x: (pNE.x + pSE.x) / 2, y: (pNE.y + pSE.y) / 2 };
            const pS = { x: (pSE.x + pSW.x) / 2, y: (pSE.y + pSW.y) / 2 };
            const pW = { x: (pSW.x + pNW.x) / 2, y: (pSW.y + pNW.y) / 2 };

            // Base direction angles for 8 handles
            const handles = [
                { type: 'nw', pt: pNW, baseAngle: 225 },
                { type: 'n',  pt: pN,  baseAngle: 270 },
                { type: 'ne', pt: pNE, baseAngle: 315 },
                { type: 'e',  pt: pE,  baseAngle: 0 },
                { type: 'se', pt: pSE, baseAngle: 45 },
                { type: 's',  pt: pS,  baseAngle: 90 },
                { type: 'sw', pt: pSW, baseAngle: 135 },
                { type: 'w',  pt: pW,  baseAngle: 180 }
            ];

            // Only render handles if element is not locked (§4)
            if (!el.locked) {
                // Render 8 resize handles (constant 9x9 px squares)
                const handleSize = 9;
                handles.forEach(h => {
                    const rect = document.createElementNS(ns, 'rect');
                    rect.setAttribute('x', h.pt.x - handleSize / 2);
                    rect.setAttribute('y', h.pt.y - handleSize / 2);
                    rect.setAttribute('width', handleSize);
                    rect.setAttribute('height', handleSize);
                    rect.setAttribute('fill', '#ffffff');
                    rect.setAttribute('stroke', '#007acc');
                    rect.setAttribute('stroke-width', '1.5');
                    rect.dataset.handle = h.type;

                    // Rotated resize cursor
                    const effAngle = (h.baseAngle + rotDeg + 360) % 360;
                    rect.style.cursor = getRotatedResizeCursor(effAngle);
                    rect.style.pointerEvents = 'auto';

                    this.svg.appendChild(rect);
                    this.handleElements.push(rect);
                });

                // Rotation Handle (24px directly outward from top center edge)
                const dirX = pN.x - pS.x;
                const dirY = pN.y - pS.y;
                const dirLen = Math.hypot(dirX, dirY) || 1;
                const rotPt = {
                    x: pN.x + (dirX / dirLen) * 24,
                    y: pN.y + (dirY / dirLen) * 24
                };

                // Stalk line
                const stalk = document.createElementNS(ns, 'line');
                stalk.setAttribute('x1', pN.x);
                stalk.setAttribute('y1', pN.y);
                stalk.setAttribute('x2', rotPt.x);
                stalk.setAttribute('y2', rotPt.y);
                stalk.setAttribute('stroke', '#007acc');
                stalk.setAttribute('stroke-width', '1');
                this.svg.appendChild(stalk);

                // Rotation knob
                const rotKnob = document.createElementNS(ns, 'circle');
                rotKnob.setAttribute('cx', rotPt.x);
                rotKnob.setAttribute('cy', rotPt.y);
                rotKnob.setAttribute('r', 4.5);
                rotKnob.setAttribute('fill', '#007acc');
                rotKnob.setAttribute('stroke', '#ffffff');
                rotKnob.setAttribute('stroke-width', '1.5');
                rotKnob.style.cursor = 'grab';
                rotKnob.style.pointerEvents = 'auto';
                rotKnob.dataset.handle = 'rot';
                this.svg.appendChild(rotKnob);
                this.handleElements.push(rotKnob);
            }

            // Custom Rotation Centre Crosshair Indicator (if configured)
            if (el.rotationCenter) {
                const rotWorld = getRotationCentre(el);
                const rotScreen = this.camera.toScreen(rotWorld.x, rotWorld.y);
                const gCross = document.createElementNS(ns, 'g');
                gCross.setAttribute('stroke', '#ff9900');
                gCross.setAttribute('stroke-width', '1.5');

                const circle = document.createElementNS(ns, 'circle');
                circle.setAttribute('cx', rotScreen.x);
                circle.setAttribute('cy', rotScreen.y);
                circle.setAttribute('r', 6);
                circle.setAttribute('fill', 'none');

                const lH = document.createElementNS(ns, 'line');
                lH.setAttribute('x1', rotScreen.x - 9);
                lH.setAttribute('y1', rotScreen.y);
                lH.setAttribute('x2', rotScreen.x + 9);
                lH.setAttribute('y2', rotScreen.y);

                const lV = document.createElementNS(ns, 'line');
                lV.setAttribute('x1', rotScreen.x);
                lV.setAttribute('y1', rotScreen.y - 9);
                lV.setAttribute('x2', rotScreen.x);
                lV.setAttribute('y2', rotScreen.y + 9);

                gCross.appendChild(circle);
                gCross.appendChild(lH);
                gCross.appendChild(lV);
                this.svg.appendChild(gCross);
            }

            // Effective (transformed) dimensions in current unit
            const unit = this.store.doc.units || window.__vcDefaultUnit || 'mm';
            const effW = localBox.width * Math.hypot(m[0], m[1]);
            const effH = localBox.height * Math.hypot(m[2], m[3]);
            const dispW = fromMm(effW, unit);
            const dispH = fromMm(effH, unit);

            // Width Label (bottom center, clickable)
            const wLabel = document.createElementNS(ns, 'text');
            wLabel.setAttribute('x', pS.x);
            wLabel.setAttribute('y', pS.y + 18);
            wLabel.setAttribute('text-anchor', 'middle');
            wLabel.setAttribute('fill', el.locked ? '#888888' : '#38bdf8');
            wLabel.setAttribute('font-size', '11');
            wLabel.setAttribute('font-family', 'sans-serif');
            wLabel.setAttribute('font-weight', 'bold');
            wLabel.textContent = `${dispW.toFixed(1)} ${unit}`;
            if (!el.locked) {
                wLabel.style.cursor = 'pointer';
                wLabel.style.pointerEvents = 'auto';
                wLabel.addEventListener('pointerdown', (ev) => ev.stopPropagation());
                wLabel.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    this.openInlineDimEditor('width', pS.x, pS.y + 12, dispW, unit, el, localBox, effW);
                });
            }
            this.svg.appendChild(wLabel);

            // Height Label (right side, without ×, clickable)
            const hLabel = document.createElementNS(ns, 'text');
            hLabel.setAttribute('x', pE.x + 12);
            hLabel.setAttribute('y', pE.y + 4);
            hLabel.setAttribute('text-anchor', 'start');
            hLabel.setAttribute('fill', el.locked ? '#888888' : '#38bdf8');
            hLabel.setAttribute('font-size', '11');
            hLabel.setAttribute('font-family', 'sans-serif');
            hLabel.setAttribute('font-weight', 'bold');
            hLabel.textContent = `${dispH.toFixed(1)} ${unit}${el.locked ? ' 🔒' : ''}`;
            if (!el.locked) {
                hLabel.style.cursor = 'pointer';
                hLabel.style.pointerEvents = 'auto';
                hLabel.addEventListener('pointerdown', (ev) => ev.stopPropagation());
                hLabel.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    this.openInlineDimEditor('height', pE.x + 32, pE.y, dispH, unit, el, localBox, effH);
                });
            }
            this.svg.appendChild(hLabel);

            this.renderSnapIndicator(ns);
            return;
        }

        // 2. Multi-selection combined bounding box
        if (selected.length > 1) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            selected.forEach(el => {
                const box = getElementLocalBounds(el);
                const cornersWorld = getTransformedCorners(box, el.transform);
                cornersWorld.forEach(pt => {
                    minX = Math.min(minX, pt.x);
                    maxX = Math.max(maxX, pt.x);
                    minY = Math.min(minY, pt.y);
                    maxY = Math.max(maxY, pt.y);
                });
            });

            if (minX !== Infinity) {
                const sTopLeft = this.camera.toScreen(minX, minY);
                const sBotRight = this.camera.toScreen(maxX, maxY);
                const w = sBotRight.x - sTopLeft.x;
                const h = sBotRight.y - sTopLeft.y;

                const rect = document.createElementNS(ns, 'rect');
                rect.setAttribute('x', sTopLeft.x);
                rect.setAttribute('y', sTopLeft.y);
                rect.setAttribute('width', w);
                rect.setAttribute('height', h);
                rect.setAttribute('fill', 'none');
                rect.setAttribute('stroke', '#38bdf8');
                rect.setAttribute('stroke-width', '1.5');
                rect.setAttribute('stroke-dasharray', '6 4');
                this.svg.appendChild(rect);

                const unit = this.store.doc.units || window.__vcDefaultUnit || 'mm';
                const dispW = fromMm(maxX - minX, unit).toFixed(1);
                const dispH = fromMm(maxY - minY, unit).toFixed(1);

                // Width label at bottom
                const wLabel = document.createElementNS(ns, 'text');
                wLabel.setAttribute('x', sTopLeft.x + w / 2);
                wLabel.setAttribute('y', sTopLeft.y + h + 18);
                wLabel.setAttribute('text-anchor', 'middle');
                wLabel.setAttribute('fill', '#38bdf8');
                wLabel.setAttribute('font-size', '11');
                wLabel.setAttribute('font-family', 'sans-serif');
                wLabel.setAttribute('font-weight', 'bold');
                wLabel.textContent = `${dispW} ${unit} (${selected.length} items)`;
                this.svg.appendChild(wLabel);

                // Height label on right
                const hLabel = document.createElementNS(ns, 'text');
                hLabel.setAttribute('x', sTopLeft.x + w + 12);
                hLabel.setAttribute('y', sTopLeft.y + h / 2 + 4);
                hLabel.setAttribute('text-anchor', 'start');
                hLabel.setAttribute('fill', '#38bdf8');
                hLabel.setAttribute('font-size', '11');
                hLabel.setAttribute('font-family', 'sans-serif');
                hLabel.setAttribute('font-weight', 'bold');
                hLabel.textContent = `${dispH} ${unit}`;
                this.svg.appendChild(hLabel);
            }
        }

        this.renderSnapIndicator(ns);
    }

    renderSnapIndicator(ns) {
        const snapPt = window.__vcActiveSnapPoint;
        if (!snapPt) return;
        const s = this.camera.toScreen(snapPt.x, snapPt.y);
        const diamond = document.createElementNS(ns, 'polygon');
        const r = 6;
        diamond.setAttribute('points', `${s.x},${s.y - r} ${s.x + r},${s.y} ${s.x},${s.y + r} ${s.x - r},${s.y}`);
        diamond.setAttribute('fill', 'rgba(244, 63, 94, 0.25)');
        diamond.setAttribute('stroke', '#f43f5e');
        diamond.setAttribute('stroke-width', '2');
        this.svg.appendChild(diamond);
    }

    openInlineDimEditor(axis, screenX, screenY, currentDispVal, unit, el, localBox, currentEffMm) {
        const existing = document.getElementById('vcInlineDimInput');
        if (existing) existing.remove();

        const container = document.getElementById('canvasContainer');
        if (!container) return;

        const inp = document.createElement('input');
        inp.id = 'vcInlineDimInput';
        inp.type = 'number';
        inp.step = '0.1';
        inp.min = '0.1';
        inp.value = currentDispVal.toFixed(1);
        inp.style.cssText = `
            position: absolute;
            left: ${Math.max(8, screenX - 34)}px;
            top: ${Math.max(8, screenY - 12)}px;
            width: 72px;
            height: 24px;
            background: var(--vc-bg-surface-2, #1e1e1e);
            color: var(--vc-text-primary, #ffffff);
            border: 1.5px solid #38bdf8;
            border-radius: 4px;
            padding: 0 6px;
            font-size: 11px;
            font-weight: 600;
            text-align: center;
            z-index: 200;
            outline: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        `;

        ['pointerdown', 'mousedown', 'click'].forEach(evt => {
            inp.addEventListener(evt, (e) => e.stopPropagation());
        });

        let committed = false;
        const commit = () => {
            if (committed) return;
            committed = true;
            const parsed = parseFloat(inp.value);
            inp.remove();
            if (!isNaN(parsed) && parsed > 0 && currentEffMm > 0) {
                const newMm = toMm(parsed, unit);
                const factor = newMm / currentEffMm;
                const cx = localBox.x + localBox.width / 2;
                const cy = localBox.y + localBox.height / 2;
                const sMat = axis === 'width'
                    ? scaleMatrix(factor, 1, cx, cy)
                    : scaleMatrix(1, factor, cx, cy);
                const before = [...el.transform];
                const after = multiplyMatrix(before, sMat);
                this.store.dispatch(new TransformElementsCommand([{ id: el.id, before, after }]));
                requestRender();
            }
        };

        inp.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
                committed = true;
                inp.remove();
            }
        });
        inp.addEventListener('blur', commit);

        container.appendChild(inp);
        inp.focus();
        inp.select();
    }
}
