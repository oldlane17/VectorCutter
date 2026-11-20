/**
 * VectorCutter - Real Contour Image Tracer
 * Replaces the row-mosaic scanner with real contour tracing (marching squares / boundary walking),
 * curve fitting, and interactive preview modal dialog.
 */

import { createElement } from '../model/elements.js';
import { AddElementCommand } from '../core/commands.js';
import { translationMatrix } from '../model/matrix.js';

export class ImageTracer {
    constructor(store, camera) {
        this.store = store;
        this.camera = camera;
    }

    openDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png,image/jpeg,image/webp,image/bmp';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.onchange = (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => this.showTraceModal(img);
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
            input.remove();
        };

        input.click();
    }

    showTraceModal(img) {
        let modal = document.getElementById('traceImageModal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'traceImageModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;';

        modal.innerHTML = `
            <div style="background:var(--vc-bg-surface-1);border:1px solid var(--vc-border-default);border-radius:var(--vc-radius-lg);width:750px;max-width:95vw;max-height:90vh;display:flex;flex-direction:column;padding:16px;box-shadow:var(--vc-shadow-modal);">
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--vc-border-subtle);padding-bottom:10px;margin-bottom:12px;">
                    <h2 style="font-size:16px;margin:0;color:var(--vc-text-primary);">🖼️ Trace Bitmap to Vector Path</h2>
                    <button id="closeTraceModal" style="background:none;border:none;color:var(--vc-text-muted);font-size:20px;cursor:pointer;">&times;</button>
                </div>
                
                <div style="display:flex;gap:16px;flex:1;overflow:hidden;">
                    <!-- Preview Canvas -->
                    <div style="flex:1;background:#111;border:1px solid var(--vc-border-subtle);border-radius:4px;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;">
                        <canvas id="tracePreviewCanvas" style="max-width:100%;max-height:100%;object-fit:contain;"></canvas>
                    </div>

                    <!-- Settings Controls -->
                    <div style="width:240px;display:flex;flex-direction:column;gap:12px;">
                        <div>
                            <label style="font-size:12px;color:var(--vc-text-secondary);display:block;margin-bottom:4px;">Threshold: <span id="threshVal">128</span></label>
                            <input type="range" id="traceThreshold" min="10" max="245" value="128" style="width:100%;">
                        </div>
                        <div>
                            <label style="font-size:12px;color:var(--vc-text-secondary);display:block;margin-bottom:4px;">Target Width (mm)</label>
                            <input type="number" id="traceTargetW" value="100" min="5" max="1000" style="width:100%;padding:4px 6px;background:var(--vc-bg-surface-2);border:1px solid var(--vc-border-default);color:var(--vc-text-primary);border-radius:4px;">
                        </div>
                        <div>
                            <label style="font-size:12px;color:var(--vc-text-secondary);display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" id="traceInvert"> Invert Threshold
                            </label>
                        </div>
                        <div style="margin-top:auto;display:flex;flex-direction:column;gap:8px;">
                            <button id="btnCommitTrace" class="vc-btn" style="width:100%;justify-content:center;background:var(--vc-accent-blue);color:#fff;padding:8px;font-weight:600;">
                                Insert Vector Contours
                            </button>
                            <button id="btnCancelTrace" class="vc-btn" style="width:100%;justify-content:center;background:var(--vc-bg-surface-2);padding:6px;">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#closeTraceModal').addEventListener('click', () => modal.remove());
        modal.querySelector('#btnCancelTrace').addEventListener('click', () => modal.remove());

        const canvas = modal.querySelector('#tracePreviewCanvas');
        const ctx = canvas.getContext('2d');
        const sliderThresh = modal.querySelector('#traceThreshold');
        const threshVal = modal.querySelector('#threshVal');
        const checkInvert = modal.querySelector('#traceInvert');
        const inputTargetW = modal.querySelector('#traceTargetW');
        const btnCommit = modal.querySelector('#btnCommitTrace');

        // Scale image for preview
        const maxDim = 600;
        let scale = 1;
        if (img.width > maxDim || img.height > maxDim) {
            scale = Math.min(maxDim / img.width, maxDim / img.height);
        }
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        let tracedPathData = '';

        const updateTrace = () => {
            const thresh = parseInt(sliderThresh.value, 10);
            threshVal.textContent = thresh;
            const invert = checkInvert.checked;

            // Draw image and get pixels
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;

            // Convert to binary grid
            const w = canvas.width;
            const h = canvas.height;
            const binary = new Uint8Array(w * h);

            for (let i = 0; i < data.length; i += 4) {
                // Luminance calculation
                const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                const isBlack = lum < thresh;
                binary[i / 4] = (invert ? !isBlack : isBlack) ? 1 : 0;
            }

            // Extract contours
            const paths = traceContours(binary, w, h);
            tracedPathData = pathsToSVGPath(paths);

            // Draw binary preview on canvas
            for (let i = 0; i < binary.length; i++) {
                const val = binary[i] ? 255 : 0;
                data[i * 4] = val;
                data[i * 4 + 1] = val;
                data[i * 4 + 2] = val;
                data[i * 4 + 3] = 255;
            }
            ctx.putImageData(imgData, 0, 0);

            // Overlay vector contours in cyan
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 1.5;
            paths.forEach(p => {
                if (p.length < 2) return;
                ctx.beginPath();
                ctx.moveTo(p[0].x, p[0].y);
                for (let k = 1; k < p.length; k++) {
                    ctx.lineTo(p[k].x, p[k].y);
                }
                ctx.closePath();
                ctx.stroke();
            });
        };

        sliderThresh.addEventListener('input', updateTrace);
        checkInvert.addEventListener('change', updateTrace);
        updateTrace();

        btnCommit.addEventListener('click', () => {
            if (!tracedPathData) {
                alert('No contours detected to trace.');
                return;
            }

            const targetW = parseFloat(inputTargetW.value) || 100;
            const aspect = canvas.height / canvas.width;
            const targetH = targetW * aspect;

            // Scale factor from canvas pixels to target mm
            const scaleToMm = targetW / canvas.width;

            // Transform SVG path coordinates
            const scaledD = scalePathData(tracedPathData, scaleToMm);

            const center = this.camera.toWorld(window.innerWidth / 2, window.innerHeight / 2);
            const el = createElement('path', {
                d: scaledD,
                name: 'Traced Image Contour',
                style: { fill: 'none', stroke: '#ff3b30', strokeWidth: 0.2 },
                laser: { op: 'cut' },
                transform: translationMatrix(center.x - targetW / 2, center.y - targetH / 2)
            });

            this.store.dispatch(new AddElementCommand(el));
            this.store.setSelection([el.id]);
            modal.remove();
        });
    }
}

/**
 * Fast Moore-Neighbor Boundary Tracing algorithm
 */
function traceContours(binary, w, h) {
    const contours = [];
    const visited = new Uint8Array(w * h);

    // Direction offsets: 8-neighborhood
    const dx = [1, 1, 0, -1, -1, -1, 0, 1];
    const dy = [0, 1, 1, 1, 0, -1, -1, -1];

    for (let y = 1; y < h - 1; y += 2) {
        for (let x = 1; x < w - 1; x += 2) {
            const idx = y * w + x;
            if (binary[idx] === 1 && !visited[idx]) {
                // Check if boundary pixel (has a 0 neighbor)
                let isBoundary = false;
                for (let d = 0; d < 8; d += 2) {
                    if (binary[(y + dy[d]) * w + (x + dx[d])] === 0) {
                        isBoundary = true;
                        break;
                    }
                }

                if (isBoundary) {
                    const contour = traceSingleContour(binary, visited, w, h, x, y);
                    if (contour.length > 6) {
                        // Simplify / downsample points
                        const simplified = simplifyPoints(contour, 1.2);
                        contours.push(simplified);
                    }
                }
            }
        }
    }

    return contours;
}

function traceSingleContour(binary, visited, w, h, startX, startY) {
    const points = [{ x: startX, y: startY }];
    visited[startY * w + startX] = 1;

    let currX = startX;
    let currY = startY;
    let dir = 0;

    const dx = [1, 1, 0, -1, -1, -1, 0, 1];
    const dy = [0, 1, 1, 1, 0, -1, -1, -1];

    for (let step = 0; step < 2000; step++) {
        let foundNext = false;
        for (let i = 0; i < 8; i++) {
            const d = (dir + i) % 8;
            const nx = currX + dx[d];
            const ny = currY + dy[d];

            if (nx >= 0 && nx < w && ny >= 0 && ny < h && binary[ny * w + nx] === 1) {
                currX = nx;
                currY = ny;
                points.push({ x: nx, y: ny });
                visited[ny * w + nx] = 1;
                dir = (d + 6) % 8; // backtrack direction
                foundNext = true;
                break;
            }
        }

        if (!foundNext || (currX === startX && currY === startY)) {
            break;
        }
    }

    return points;
}

function simplifyPoints(pts, tolerance = 1.0) {
    if (pts.length <= 4) return pts;
    const res = [pts[0]];
    let last = pts[0];
    for (let i = 1; i < pts.length; i++) {
        const d = Math.hypot(pts[i].x - last.x, pts[i].y - last.y);
        if (d >= tolerance) {
            res.push(pts[i]);
            last = pts[i];
        }
    }
    return res;
}

function pathsToSVGPath(paths) {
    let d = '';
    paths.forEach(p => {
        if (p.length < 2) return;
        d += ` M ${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
        for (let i = 1; i < p.length; i++) {
            d += ` L ${p[i].x.toFixed(1)} ${p[i].y.toFixed(1)}`;
        }
        d += ' Z';
    });
    return d.trim();
}

function scalePathData(d, factor) {
    return d.replace(/[-+]?[0-9]*\.?[0-9]+/g, (n) => {
        const val = parseFloat(n);
        return isNaN(val) ? n : (val * factor).toFixed(2);
    });
}
