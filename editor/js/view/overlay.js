/**
 * VectorCutter - Screen-Space Selection Overlay
 * Renders selection boxes, handles, rotation knobs, and dimension badges in pure screen pixels.
 * Zero scaling distortion with zoom.
 */

import { getElementLocalBounds, getTransformedCorners, getRotationCentre } from '../model/bounds.js';
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
        while (this.svg.firstChild) {
            this.svg.removeChild(this.svg.firstChild);
        }
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

            // Draw oriented bounding polygon
            const poly = document.createElementNS(ns, 'polygon');
            poly.setAttribute('points', cornersScreen.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
            poly.setAttribute('fill', 'none');
            poly.setAttribute('stroke', '#007acc');
            poly.setAttribute('stroke-width', '1');
            poly.setAttribute('stroke-dasharray', '4 3');
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

                // Rotation Handle (24px out from top center)
                const upNorm = {
                    x: -Math.sin(rotRad),
                    y: -Math.cos(rotRad)
                };
                const rotPt = {
                    x: pN.x + upNorm.x * 24,
                    y: pN.y + upNorm.y * 24
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

            // Measurement Label (e.g. "60.0 mm x 40.0 mm")
            const dimLabel = document.createElementNS(ns, 'text');
            dimLabel.setAttribute('x', pS.x);
            dimLabel.setAttribute('y', pS.y + 16);
            dimLabel.setAttribute('text-anchor', 'middle');
            dimLabel.setAttribute('fill', el.locked ? '#888888' : '#007acc');
            dimLabel.setAttribute('font-size', '11');
            dimLabel.setAttribute('font-family', 'sans-serif');
            dimLabel.setAttribute('font-weight', 'bold');
            dimLabel.textContent = `${localBox.width.toFixed(1)} × ${localBox.height.toFixed(1)} mm${el.locked ? ' 🔒' : ''}`;
            this.svg.appendChild(dimLabel);
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
                rect.setAttribute('stroke', '#007acc');
                rect.setAttribute('stroke-width', '1');
                rect.setAttribute('stroke-dasharray', '4 3');
                this.svg.appendChild(rect);

                // Multi-selection dimensions badge
                const dimLabel = document.createElementNS(ns, 'text');
                dimLabel.setAttribute('x', sTopLeft.x + w / 2);
                dimLabel.setAttribute('y', sTopLeft.y + h + 16);
                dimLabel.setAttribute('text-anchor', 'middle');
                dimLabel.setAttribute('fill', '#007acc');
                dimLabel.setAttribute('font-size', '11');
                dimLabel.setAttribute('font-family', 'sans-serif');
                dimLabel.setAttribute('font-weight', 'bold');
                dimLabel.textContent = `${(maxX - minX).toFixed(1)} × ${(maxY - minY).toFixed(1)} mm (${selected.length} items)`;
                this.svg.appendChild(dimLabel);
            }
        }
    }
}
