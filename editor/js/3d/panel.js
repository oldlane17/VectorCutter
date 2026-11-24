/**
 * VectorCutter - 3D Preparation Panel Controller (§7.8)
 * Connects 2D elements to 3D pipeline, live Three.js preview, and multi-format exports.
 */

import { extractElementRings } from './geometry.js';
import { build3DMesh } from './modes.js';
import { Preview3D } from './preview.js';
import { exportBinarySTL, exportAsciiSTL, exportOBJ, exportHeightMapPNG, exportLayerSVGSlices } from './export.js';
import { events } from '../core/events.js';

export class Panel3D {
    constructor(containerEl, store) {
        this.container = containerEl;
        this.store = store;
        this.preview = null;
        this.currentMesh = null;

        // Active 3D settings
        this.settings = {
            mode: 'straight', // straight, taper, flare, point, chamfer, rounded, stepped, twist, inflate, revolve
            height: 5.0,
            base: 0.0,
            baseMargin: 2.0,
            direction: 'up',
            profile: 'linear',
            taperAngle: 15,
            chamferSize: 1.0,
            filletRadius: 1.5,
            layers: 5,
            stepInset: 0.8,
            twistAngle: 45,
            materialDensity: 1.24 // PLA default (g/cm³)
        };
    }

    render() {
        if (!this.container) return;

        const selected = this.store.getSelectedElements();
        if (selected.length === 0) {
            this.container.innerHTML = `
                <div style="padding:40px 16px;text-align:center;color:var(--vc-text-muted);font-size:12px;">
                    <div style="font-size:28px;margin-bottom:8px;">📦</div>
                    <div style="font-weight:600;color:var(--vc-text-primary);margin-bottom:4px;">No Selection for 3D Prep</div>
                    <div>Select one or more objects on the canvas to prepare 3D models for printing or CNC milling.</div>
                </div>
            `;
            return;
        }

        const firstEl = selected[0];
        if (firstEl.threeD) {
            Object.assign(this.settings, firstEl.threeD);
        }

        const nameLabel = selected.length === 1 ? (firstEl.name || firstEl.type) : `${selected.length} objects`;

        this.container.innerHTML = `
            <div class="vc-3d-panel">
                <!-- Header -->
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--vc-bg-surface-2);border-bottom:1px solid var(--vc-border-subtle);font-size:11px;">
                    <span>TARGET: <strong>${nameLabel}</strong></span>
                    <button class="vc-btn" id="btn3DBack" style="padding:2px 6px;font-size:10px;">← Back to 2D</button>
                </div>

                <!-- 3D Preview Viewport -->
                <div class="vc-3d-viewport-wrap" id="vc3DPreviewWrap">
                    <div class="vc-3d-view-controls">
                        <button data-view="iso">Iso</button>
                        <button data-view="top">Top</button>
                        <button data-view="front">Front</button>
                        <button data-view="side">Side</button>
                        <button id="btnToggleWireframe">Wireframe</button>
                    </div>
                </div>

                <!-- 10 Mode Selector Cards (§7.4) -->
                <div style="padding:8px 12px 2px 12px;font-size:11px;font-weight:700;color:var(--vc-text-muted);">EXTRUSION &amp; 3D MODE</div>
                <div class="vc-3d-mode-grid">
                    <div class="vc-3d-mode-card ${this.settings.mode === 'straight' ? 'active' : ''}" data-mode="straight">
                        <span class="vc-3d-mode-icon">❚</span> Straight Extrude
                    </div>
                    <div class="vc-3d-mode-card ${this.settings.mode === 'taper' ? 'active' : ''}" data-mode="taper">
                        <span class="vc-3d-mode-icon">▲</span> Taper In
                    </div>
                    <div class="vc-3d-mode-card ${this.settings.mode === 'flare' ? 'active' : ''}" data-mode="flare">
                        <span class="vc-3d-mode-icon">▼</span> Flare Out
                    </div>
                    <div class="vc-3d-mode-card ${this.settings.mode === 'point' ? 'active' : ''}" data-mode="point">
                        <span class="vc-3d-mode-icon">▲</span> To Point
                    </div>
                    <div class="vc-3d-mode-card ${this.settings.mode === 'chamfer' ? 'active' : ''}" data-mode="chamfer">
                        <span class="vc-3d-mode-icon">◤</span> Chamfer / Bevel
                    </div>
                    <div class="vc-3d-mode-card ${this.settings.mode === 'rounded' ? 'active' : ''}" data-mode="rounded">
                        <span class="vc-3d-mode-icon">⌒</span> Rounded Fillet
                    </div>
                    <div class="vc-3d-mode-card ${this.settings.mode === 'stepped' ? 'active' : ''}" data-mode="stepped">
                        <span class="vc-3d-mode-icon">🪜</span> Stepped / Layers
                    </div>
                    <div class="vc-3d-mode-card ${this.settings.mode === 'twist' ? 'active' : ''}" data-mode="twist">
                        <span class="vc-3d-mode-icon">🌀</span> Twist Extrude
                    </div>
                    <div class="vc-3d-mode-card ${this.settings.mode === 'inflate' ? 'active' : ''}" data-mode="inflate">
                        <span class="vc-3d-mode-icon">☁</span> Inflate / Pillow
                    </div>
                    <div class="vc-3d-mode-card ${this.settings.mode === 'revolve' ? 'active' : ''}" data-mode="revolve">
                        <span class="vc-3d-mode-icon">↺</span> Revolve Lathe
                    </div>
                </div>

                <!-- Parameters Block (Strict §6 Grid) -->
                <div class="vc-panel-section">
                    <div class="vc-panel-title">PARAMETERS</div>

                    <div class="prop-row">
                        <label for="p3dHeight">Height (H)</label>
                        <div class="control">
                            <input type="number" id="p3dHeight" value="${this.settings.height}" min="0.1" max="500" step="0.5">
                        </div>
                        <div class="unit">mm</div>
                    </div>

                    <div class="prop-row">
                        <label for="p3dBase">Base Plate (B)</label>
                        <div class="control">
                            <input type="number" id="p3dBase" value="${this.settings.base}" min="0" max="100" step="0.5">
                        </div>
                        <div class="unit">mm</div>
                    </div>

                    <div class="prop-row">
                        <label for="p3dDirection">Direction</label>
                        <div class="control">
                            <select id="p3dDirection">
                                <option value="up" ${this.settings.direction === 'up' ? 'selected' : ''}>Up (+Z)</option>
                                <option value="down" ${this.settings.direction === 'down' ? 'selected' : ''}>Down (-Z)</option>
                                <option value="both" ${this.settings.direction === 'both' ? 'selected' : ''}>Both (±H/2)</option>
                            </select>
                        </div>
                        <div class="unit"></div>
                    </div>

                    ${this.renderModeSpecificParams()}
                </div>

                <!-- Info Block (§7.5) -->
                <div class="vc-3d-info-block" id="vc3DInfoBlock">
                    <div>Size: <strong id="info3DSize">-</strong></div>
                    <div>Volume: <strong id="info3DVol">-</strong></div>
                    <div>Triangles: <strong id="info3DTris">-</strong></div>
                    <div>Manifold: <strong id="info3DManifold">-</strong></div>
                </div>

                <!-- Material Density Selector -->
                <div class="prop-row">
                    <label for="p3dMaterial">Material</label>
                    <div class="control">
                        <select id="p3dMaterial">
                            <option value="1.24" ${this.settings.materialDensity === 1.24 ? 'selected' : ''}>PLA (1.24 g/cm³)</option>
                            <option value="1.27" ${this.settings.materialDensity === 1.27 ? 'selected' : ''}>PETG (1.27 g/cm³)</option>
                            <option value="1.04" ${this.settings.materialDensity === 1.04 ? 'selected' : ''}>ABS (1.04 g/cm³)</option>
                            <option value="1.1" ${this.settings.materialDensity === 1.1 ? 'selected' : ''}>Resin (1.10 g/cm³)</option>
                            <option value="0.7" ${this.settings.materialDensity === 0.7 ? 'selected' : ''}>Wood / MDF (0.70 g/cm³)</option>
                            <option value="2.7" ${this.settings.materialDensity === 2.7 ? 'selected' : ''}>Aluminium (2.70 g/cm³)</option>
                        </select>
                    </div>
                    <div class="unit" id="info3DMass">-</div>
                </div>

                <!-- Export Action Buttons (§7.7) -->
                <div class="vc-3d-export-actions">
                    <button class="vc-btn" id="btnExportBinarySTL" style="background:var(--vc-accent-blue);color:#fff;justify-content:center;padding:8px;font-weight:600;">
                        ⬇ Export STL (Binary - Recommended)
                    </button>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                        <button class="vc-btn" id="btnExportAsciiSTL" style="justify-content:center;">STL (ASCII)</button>
                        <button class="vc-btn" id="btnExportOBJ" style="justify-content:center;">Wavefront OBJ</button>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                        <button class="vc-btn" id="btnExportHeightMap" style="justify-content:center;">CNC Heightmap</button>
                        <button class="vc-btn" id="btnExportLayers" style="justify-content:center;">Layer SVG Slices</button>
                    </div>
                </div>
            </div>
        `;

        this.initPreview();
        this.bindEvents();
        this.rebuildMesh();
    }

    renderModeSpecificParams() {
        if (this.settings.mode === 'taper' || this.settings.mode === 'flare') {
            return `
                <div class="prop-row">
                    <label for="p3dTaperAngle">Angle</label>
                    <div class="control">
                        <input type="number" id="p3dTaperAngle" value="${this.settings.taperAngle}" min="1" max="85" step="1">
                    </div>
                    <div class="unit">°</div>
                </div>
            `;
        }
        if (this.settings.mode === 'chamfer') {
            return `
                <div class="prop-row">
                    <label for="p3dChamfer">Size</label>
                    <div class="control">
                        <input type="number" id="p3dChamfer" value="${this.settings.chamferSize}" min="0.1" max="50" step="0.5">
                    </div>
                    <div class="unit">mm</div>
                </div>
            `;
        }
        if (this.settings.mode === 'rounded') {
            return `
                <div class="prop-row">
                    <label for="p3dFillet">Radius</label>
                    <div class="control">
                        <input type="number" id="p3dFillet" value="${this.settings.filletRadius}" min="0.2" max="50" step="0.5">
                    </div>
                    <div class="unit">mm</div>
                </div>
            `;
        }
        if (this.settings.mode === 'stepped') {
            return `
                <div class="prop-row">
                    <label for="p3dLayers">Layers</label>
                    <div class="control">
                        <input type="number" id="p3dLayers" value="${this.settings.layers}" min="2" max="50" step="1">
                    </div>
                    <div class="unit"></div>
                </div>
                <div class="prop-row">
                    <label for="p3dStepInset">Step Inset</label>
                    <div class="control">
                        <input type="number" id="p3dStepInset" value="${this.settings.stepInset}" min="0.1" max="20" step="0.2">
                    </div>
                    <div class="unit">mm</div>
                </div>
            `;
        }
        if (this.settings.mode === 'twist') {
            return `
                <div class="prop-row">
                    <label for="p3dTwist">Twist Angle</label>
                    <div class="control">
                        <input type="number" id="p3dTwist" value="${this.settings.twistAngle}" min="-720" max="720" step="5">
                    </div>
                    <div class="unit">°</div>
                </div>
            `;
        }
        return '';
    }

    initPreview() {
        const wrap = this.container.querySelector('#vc3DPreviewWrap');
        if (wrap) {
            if (this.preview) {
                this.preview.dispose();
                this.preview = null;
            }
            this.preview = new Preview3D(wrap);
        }
    }

    bindEvents() {
        const c = this.container;

        c.querySelector('#btn3DBack')?.addEventListener('click', () => {
            events.emit('open:tab', 'properties');
        });

        // Mode cards
        c.querySelectorAll('.vc-3d-mode-card').forEach(card => {
            card.addEventListener('click', () => {
                this.settings.mode = card.dataset.mode;
                this.persistSettings();
                this.render();
            });
        });

        // Inputs
        const bindInput = (id, prop, isFloat = true) => {
            c.querySelector(`#${id}`)?.addEventListener('input', (e) => {
                this.settings[prop] = isFloat ? (parseFloat(e.target.value) || 0) : e.target.value;
                this.persistSettings();
                this.rebuildMesh();
            });
        };

        bindInput('p3dHeight', 'height');
        bindInput('p3dBase', 'base');
        bindInput('p3dTaperAngle', 'taperAngle');
        bindInput('p3dChamfer', 'chamferSize');
        bindInput('p3dFillet', 'filletRadius');
        bindInput('p3dLayers', 'layers', false);
        bindInput('p3dStepInset', 'stepInset');
        bindInput('p3dTwist', 'twistAngle');

        c.querySelector('#p3dDirection')?.addEventListener('change', (e) => {
            this.settings.direction = e.target.value;
            this.persistSettings();
            this.rebuildMesh();
        });

        c.querySelector('#p3dMaterial')?.addEventListener('change', (e) => {
            this.settings.materialDensity = parseFloat(e.target.value);
            this.persistSettings();
            this.updateStatsDisplay();
        });

        // View presets
        c.querySelectorAll('.vc-3d-view-controls button[data-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.preview?.setPresetView(btn.dataset.view);
            });
        });

        c.querySelector('#btnToggleWireframe')?.addEventListener('click', () => {
            this.preview?.toggleWireframe();
        });

        // Export handlers
        c.querySelector('#btnExportBinarySTL')?.addEventListener('click', () => {
            if (this.currentMesh) exportBinarySTL(this.currentMesh, `vectorcutter_${this.settings.mode}.stl`);
        });

        c.querySelector('#btnExportAsciiSTL')?.addEventListener('click', () => {
            if (this.currentMesh) exportAsciiSTL(this.currentMesh, `vectorcutter_${this.settings.mode}_ascii.stl`);
        });

        c.querySelector('#btnExportOBJ')?.addEventListener('click', () => {
            if (this.currentMesh) exportOBJ(this.currentMesh, `vectorcutter_${this.settings.mode}.obj`);
        });

        c.querySelector('#btnExportHeightMap')?.addEventListener('click', () => {
            if (this.currentMesh) exportHeightMapPNG(this.currentMesh, `vectorcutter_heightmap.png`);
        });

        c.querySelector('#btnExportLayers')?.addEventListener('click', () => {
            if (this.currentMesh) exportLayerSVGSlices(this.currentMesh, 1.0, `vectorcutter_slices.svg`);
        });
    }

    async rebuildMesh() {
        const selected = this.store.getSelectedElements();
        if (selected.length === 0) return;

        let allRings = [];
        for (const el of selected) {
            const rings = await extractElementRings(el);
            allRings.push(...rings);
        }

        const mesh = build3DMesh(allRings, this.settings);
        this.currentMesh = mesh;

        const color = selected[0]?.style?.fill && selected[0].style.fill !== 'none' ? 
            selected[0].style.fill : '#007acc';

        if (this.preview) {
            this.preview.updateMesh(mesh, color);
        }

        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        if (!this.currentMesh) return;
        const b = this.currentMesh.bounds;
        const vol = this.currentMesh.volume;
        const massG = (vol * (this.settings.materialDensity || 1.24)).toFixed(1);

        const sizeEl = this.container.querySelector('#info3DSize');
        const volEl = this.container.querySelector('#info3DVol');
        const trisEl = this.container.querySelector('#info3DTris');
        const maniEl = this.container.querySelector('#info3DManifold');
        const massEl = this.container.querySelector('#info3DMass');

        if (sizeEl) sizeEl.textContent = `${b.width.toFixed(1)}×${b.depth.toFixed(1)}×${b.height.toFixed(1)} mm`;
        if (volEl) volEl.textContent = `${vol.toFixed(3)} cm³`;
        if (trisEl) trisEl.textContent = `${this.currentMesh.triangleCount}`;
        if (maniEl) {
            if (this.currentMesh.isManifold) {
                maniEl.innerHTML = `<span style="color:var(--vc-success);">✓ Watertight</span>`;
            } else {
                maniEl.innerHTML = `<span style="color:var(--vc-warning);">⚠ ${this.currentMesh.unmatchedEdges} Open</span>`;
            }
        }
        if (massEl) massEl.textContent = `~${massG} g`;
    }

    persistSettings() {
        const selected = this.store.getSelectedElements();
        if (selected.length === 0) return;
        selected.forEach(el => {
            el.threeD = { ...this.settings, version: 1 };
        });
    }
}
