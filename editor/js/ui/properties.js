/**
 * VectorCutter - Properties, Objects, Laser & 3D Tab Controller (§6 & §2)
 * Full 3-column CSS Grid alignment, live shape generators, and unified tab coordinator.
 */

import { events } from '../core/events.js';
import { getElementLocalBounds } from '../model/bounds.js';
import { translationMatrix, rotationMatrix, scaleMatrix, multiplyMatrix } from '../model/matrix.js';
import { LaserPanel } from '../laser/panel.js';
import { ObjectsPanel } from './objects-panel.js';
import { CodeEditorPanel } from './code-editor.js';
import { Panel3D } from '../3d/panel.js';
import { requestRender } from '../core/scheduler.js';

export class PropertiesController {
    constructor(panelEl, store) {
        this.panel = panelEl;
        this.store = store;
        this.currentTab = 'properties'; // 'properties' | 'laser' | 'code' | '3d'

        // Sub-panels
        this.objectsPanel = new ObjectsPanel(null, store);
        this.laserPanel = new LaserPanel(null, store);
        this.codePanel = new CodeEditorPanel(null, store);
        this.panel3D = new Panel3D(null, store);

        this.bindEvents();
        this.render();
    }

    bindEvents() {
        events.on('open:tab', (tabName) => {
            this.setTab(tabName);
        });

        // Listen for SVG Code toolbar toggle button
        document.getElementById('toolSvgCode')?.addEventListener('click', () => {
            this.setTab(this.currentTab === 'code' ? 'properties' : 'code');
        });

        document.getElementById('menuToggleSvgCode')?.addEventListener('click', () => {
            this.setTab(this.currentTab === 'code' ? 'properties' : 'code');
        });

        document.getElementById('menuPrepare3D')?.addEventListener('click', () => {
            this.setTab('3d');
        });

        // Global shortcut Ctrl+Shift+E for SVG Code
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.code === 'KeyE' || e.key === 'E')) {
                e.preventDefault();
                this.setTab(this.currentTab === 'code' ? 'properties' : 'code');
            }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.code === 'Digit3' || e.key === '3')) {
                e.preventDefault();
                this.setTab('3d');
            }
        });
    }

    setTab(tab) {
        this.currentTab = tab;
        this.render();
    }

    render() {
        if (!this.panel) return;

        // 4 Tabs Strip (§6.9)
        const tabsHtml = `
            <div class="vc-panel-tabs">
                <button class="vc-tab-btn ${this.currentTab === 'properties' ? 'active' : ''}" data-tab="properties">PROPERTIES</button>
                <button class="vc-tab-btn ${this.currentTab === 'laser' ? 'active' : ''}" data-tab="laser">LASER PREP</button>
                <button class="vc-tab-btn ${this.currentTab === 'code' ? 'active' : ''}" data-tab="code">SVG CODE</button>
                <button class="vc-tab-btn ${this.currentTab === '3d' ? 'active' : ''}" data-tab="3d">3D PREP</button>
            </div>
            <div id="vcTabContentContainer" style="flex:1;overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable;"></div>
        `;

        this.panel.innerHTML = tabsHtml;

        // Wire tabs
        this.panel.querySelectorAll('.vc-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTab(btn.dataset.tab);
            });
        });

        const content = this.panel.querySelector('#vcTabContentContainer');
        if (!content) return;

        // 1. LASER TAB
        if (this.currentTab === 'laser') {
            this.laserPanel.container = content;
            this.laserPanel.render();
            return;
        }

        // 2. CODE TAB
        if (this.currentTab === 'code') {
            this.codePanel.container = content;
            this.codePanel.render();
            return;
        }

        // 3. 3D PREP TAB
        if (this.currentTab === '3d') {
            this.panel3D.container = content;
            this.panel3D.render();
            return;
        }

        // 4. PROPERTIES TAB
        this.renderPropertiesTab(content);
    }

    renderPropertiesTab(content) {
        // Embed Objects Tree at top (§2)
        const objectsWrap = document.createElement('div');
        content.appendChild(objectsWrap);
        this.objectsPanel.container = objectsWrap;
        this.objectsPanel.render();

        const selected = this.store.getSelectedElements();

        if (selected.length === 0) {
            const emptyNotice = document.createElement('div');
            emptyNotice.innerHTML = `
                <div class="vc-panel-section">
                    <div class="vc-panel-title">DOCUMENT SETTINGS</div>
                    <div class="prop-row">
                        <label>Units</label>
                        <div class="control">
                            <select id="propDocUnits">
                                <option value="mm" selected>Millimetres (mm)</option>
                                <option value="in">Inches (in)</option>
                            </select>
                        </div>
                        <div class="unit"></div>
                    </div>
                    <div class="prop-row">
                        <label>Bed Size</label>
                        <div class="control">
                            <input type="text" value="${this.store.doc.settings?.bed?.w || 600} × ${this.store.doc.settings?.bed?.h || 400}" readonly>
                        </div>
                        <div class="unit">mm</div>
                    </div>
                </div>
                <div style="padding: 24px 12px; text-align: center; color: var(--vc-text-muted); font-size: 11px;">
                    Select an element on canvas to edit transform, appearance, laser settings, or 3D prep.
                </div>
            `;
            content.appendChild(emptyNotice);
            return;
        }

        const el = selected[0];
        const box = getElementLocalBounds(el);
        const posX = el.transform[4];
        const posY = el.transform[5];
        const rotRad = Math.atan2(el.transform[1], el.transform[0]);
        const rotDeg = Math.round((rotRad * 180) / Math.PI);

        const isFillNone = !el.style?.fill || el.style.fill === 'none';
        const isStrokeNone = !el.style?.stroke || el.style.stroke === 'none';

        const formWrap = document.createElement('div');
        formWrap.innerHTML = `
            <!-- TRANSFORM SECTION (§6) -->
            <div class="vc-panel-section">
                <div class="vc-panel-title">TRANSFORM</div>
                <div class="prop-row">
                    <label for="propX">X</label>
                    <div class="control"><input type="number" id="propX" value="${posX.toFixed(1)}" step="1"></div>
                    <div class="unit">mm</div>
                </div>
                <div class="prop-row">
                    <label for="propY">Y</label>
                    <div class="control"><input type="number" id="propY" value="${posY.toFixed(1)}" step="1"></div>
                    <div class="unit">mm</div>
                </div>
                <div class="prop-row">
                    <label for="propW">Width</label>
                    <div class="control"><input type="number" id="propW" value="${box.width.toFixed(1)}" min="0.5" step="1"></div>
                    <div class="unit">mm</div>
                </div>
                <div class="prop-row">
                    <label for="propH">Height</label>
                    <div class="control"><input type="number" id="propH" value="${box.height.toFixed(1)}" min="0.5" step="1"></div>
                    <div class="unit">mm</div>
                </div>
                <div class="prop-row">
                    <label for="propRot">Rotation</label>
                    <div class="control"><input type="number" id="propRot" value="${rotDeg}" min="-360" max="360" step="5"></div>
                    <div class="unit">°</div>
                </div>
            </div>

            <!-- SHAPE GENERATOR SECTION (§4) -->
            ${this.renderGeneratorSection(el)}

            <!-- APPEARANCE SECTION (§6) -->
            <div class="vc-panel-section">
                <div class="vc-panel-title">APPEARANCE</div>
                <div class="prop-row">
                    <label>Fill</label>
                    <div class="control">
                        <div class="vc-color-swatch-wrap" style="background:${isFillNone ? 'transparent' : (el.style?.fill || '#007acc')};">
                            <input type="color" id="propFillPicker" value="${isFillNone ? '#007acc' : el.style.fill}">
                        </div>
                    </div>
                    <div class="unit" title="Toggle None">
                        <label style="cursor:pointer;font-size:10px;"><input type="checkbox" id="chkFillNone" ${isFillNone ? 'checked' : ''}> None</label>
                    </div>
                </div>
                <div class="prop-row">
                    <label>Stroke</label>
                    <div class="control">
                        <div class="vc-color-swatch-wrap" style="background:${isStrokeNone ? 'transparent' : (el.style?.stroke || '#007acc')};">
                            <input type="color" id="propStrokePicker" value="${isStrokeNone ? '#007acc' : el.style.stroke}">
                        </div>
                    </div>
                    <div class="unit" title="Toggle None">
                        <label style="cursor:pointer;font-size:10px;"><input type="checkbox" id="chkStrokeNone" ${isStrokeNone ? 'checked' : ''}> None</label>
                    </div>
                </div>
                <div class="prop-row">
                    <label for="propStrokeWidth">Stroke W</label>
                    <div class="control"><input type="number" id="propStrokeWidth" value="${el.style?.strokeWidth || '0.5'}" min="0.05" max="50" step="0.1"></div>
                    <div class="unit">mm</div>
                </div>
                <div class="prop-row">
                    <label for="propOpacity">Opacity</label>
                    <div class="control">
                        <input type="range" class="vc-slider-ctrl" id="propOpacity" min="0" max="1" step="0.05" value="${el.style?.opacity !== undefined ? el.style.opacity : 1}">
                    </div>
                    <div class="unit" id="propOpacityVal">${Math.round((el.style?.opacity !== undefined ? el.style.opacity : 1) * 100)}%</div>
                </div>
            </div>

            <!-- LASER OPERATION SECTION -->
            <div class="vc-panel-section">
                <div class="vc-panel-title">LASER OPERATION</div>
                <div class="prop-row">
                    <label for="propLaserOp">Mode</label>
                    <div class="control">
                        <select id="propLaserOp">
                            <option value="cut" ${el.laser?.op === 'cut' ? 'selected' : ''}>🔴 Cut (Vector)</option>
                            <option value="score" ${el.laser?.op === 'score' ? 'selected' : ''}>🔵 Score (Vector)</option>
                            <option value="engrave" ${el.laser?.op === 'engrave' ? 'selected' : ''}>⬛ Engrave (Raster)</option>
                            <option value="guide" ${el.laser?.op === 'guide' ? 'selected' : ''}>🟢 Guide (Non-cutting)</option>
                        </select>
                    </div>
                    <div class="unit"></div>
                </div>
                <div class="prop-row">
                    <label for="propLaserPower">Power</label>
                    <div class="control"><input type="number" id="propLaserPower" value="${el.laser?.power || 100}" min="1" max="100"></div>
                    <div class="unit">%</div>
                </div>
                <div class="prop-row">
                    <label for="propLaserSpeed">Speed</label>
                    <div class="control"><input type="number" id="propLaserSpeed" value="${el.laser?.speed || 20}" min="1" max="500"></div>
                    <div class="unit">mm/s</div>
                </div>
                <div class="prop-row">
                    <label for="propLaserPasses">Passes</label>
                    <div class="control"><input type="number" id="propLaserPasses" value="${el.laser?.passes || 1}" min="1" max="20"></div>
                    <div class="unit"></div>
                </div>
            </div>

            <!-- 3D PREP BUTTON ENTRY POINT (§7.2) -->
            <div style="padding: 12px;">
                <button class="vc-btn" id="btnPrepare3DEntry" style="width:100%;justify-content:center;background:var(--vc-accent-blue);color:#fff;padding:8px;font-weight:600;">
                    📦 Prepare for 3D...
                </button>
            </div>
        `;

        content.appendChild(formWrap);
        this.wirePropertiesEvents(content, el);
    }

    renderGeneratorSection(el) {
        if (el.type === 'star') {
            const p = el.params || {
                points: el.geometry?.points || 5,
                outerRadius: el.geometry?.outerRadius || 25,
                innerRatio: (el.geometry?.innerRadius && el.geometry?.outerRadius) ? (el.geometry.innerRadius / el.geometry.outerRadius) : 0.382,
                rotation: el.geometry?.rotation || 0,
                cornerRadius: el.geometry?.cornerRadius || 0
            };
            return `
                <div class="vc-panel-section">
                    <div class="vc-panel-title">SHAPE GENERATOR (STAR)</div>
                    <div class="prop-row">
                        <label for="genStarPoints">Points</label>
                        <div class="control"><input type="number" id="genStarPoints" value="${p.points}" min="3" max="64"></div>
                        <div class="unit"></div>
                    </div>
                    <div class="prop-row">
                        <label for="genStarOuterR">Radius</label>
                        <div class="control"><input type="number" id="genStarOuterR" value="${p.outerRadius.toFixed(1)}" min="1" step="1"></div>
                        <div class="unit">mm</div>
                    </div>
                    <div class="prop-row">
                        <label for="genStarRatio">Inner Ratio</label>
                        <div class="control"><input type="number" id="genStarRatio" value="${p.innerRatio.toFixed(3)}" min="0.05" max="0.95" step="0.05"></div>
                        <div class="unit"></div>
                    </div>
                    <div class="prop-row">
                        <label for="genStarRot">Rotation</label>
                        <div class="control"><input type="number" id="genStarRot" value="${Math.round(p.rotation || 0)}" min="-360" max="360" step="5"></div>
                        <div class="unit">°</div>
                    </div>
                    <div class="prop-row">
                        <label for="genStarCorner">Corner</label>
                        <div class="control"><input type="number" id="genStarCorner" value="${(p.cornerRadius || 0).toFixed(1)}" min="0" step="0.5"></div>
                        <div class="unit">mm</div>
                    </div>
                </div>
            `;
        }

        if (el.type === 'polygon') {
            const p = el.params || {
                sides: el.geometry?.sides || 6,
                radius: el.geometry?.radius || 25,
                sizeMode: 'circumradius',
                rotation: el.geometry?.rotation || 0,
                cornerRadius: el.geometry?.cornerRadius || 0
            };
            return `
                <div class="vc-panel-section">
                    <div class="vc-panel-title">SHAPE GENERATOR (N-GON)</div>
                    <div class="prop-row">
                        <label for="genPolySides">Sides</label>
                        <div class="control"><input type="number" id="genPolySides" value="${p.sides}" min="3" max="128"></div>
                        <div class="unit"></div>
                    </div>
                    <div class="prop-row">
                        <label for="genPolyRadius">Radius</label>
                        <div class="control"><input type="number" id="genPolyRadius" value="${p.radius.toFixed(1)}" min="1" step="1"></div>
                        <div class="unit">mm</div>
                    </div>
                    <div class="prop-row">
                        <label for="genPolyMode">Mode</label>
                        <div class="control">
                            <select id="genPolyMode">
                                <option value="circumradius" ${p.sizeMode === 'circumradius' ? 'selected' : ''}>Circumradius</option>
                                <option value="inradius" ${p.sizeMode === 'inradius' ? 'selected' : ''}>Inradius</option>
                                <option value="sideLength" ${p.sizeMode === 'sideLength' ? 'selected' : ''}>Side Length</option>
                            </select>
                        </div>
                        <div class="unit"></div>
                    </div>
                    <div class="prop-row">
                        <label for="genPolyRot">Rotation</label>
                        <div class="control"><input type="number" id="genPolyRot" value="${Math.round(p.rotation || 0)}" min="-360" max="360" step="5"></div>
                        <div class="unit">°</div>
                    </div>
                    <div class="prop-row">
                        <label for="genPolyCorner">Corner</label>
                        <div class="control"><input type="number" id="genPolyCorner" value="${(p.cornerRadius || 0).toFixed(1)}" min="0" step="0.5"></div>
                        <div class="unit">mm</div>
                    </div>
                </div>
            `;
        }

        return '';
    }

    wirePropertiesEvents(content, el) {
        // Prepare for 3D button
        content.querySelector('#btnPrepare3DEntry')?.addEventListener('click', () => {
            this.setTab('3d');
        });

        // Numeric live input helper
        const bindInputLive = (id, onChange) => {
            const input = content.querySelector(`#${id}`);
            if (!input) return;
            input.addEventListener('focus', () => input.select());
            input.addEventListener('input', () => {
                onChange(parseFloat(input.value) || 0);
                requestRender();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    const step = e.shiftKey ? 10 : (e.altKey ? 0.1 : 1);
                    const cur = parseFloat(input.value) || 0;
                    input.value = e.key === 'ArrowUp' ? (cur + step).toFixed(1) : (cur - step).toFixed(1);
                    onChange(parseFloat(input.value));
                    requestRender();
                }
            });
        };

        // Transform live inputs
        bindInputLive('propX', (val) => {
            this.store.commit('Change X', (doc) => {
                if (doc.elements[el.id]) doc.elements[el.id].transform[4] = val;
            });
        });
        bindInputLive('propY', (val) => {
            this.store.commit('Change Y', (doc) => {
                if (doc.elements[el.id]) doc.elements[el.id].transform[5] = val;
            });
        });
        bindInputLive('propW', (val) => {
            this.store.commit('Change Width', (doc) => {
                const target = doc.elements[el.id];
                if (!target) return;
                const oldBox = getElementLocalBounds(target);
                if (oldBox.width > 0) {
                    const sx = Math.max(0.01, val / oldBox.width);
                    target.transform = multiplyMatrix(target.transform, scaleMatrix(sx, 1));
                }
            });
        });
        bindInputLive('propH', (val) => {
            this.store.commit('Change Height', (doc) => {
                const target = doc.elements[el.id];
                if (!target) return;
                const oldBox = getElementLocalBounds(target);
                if (oldBox.height > 0) {
                    const sy = Math.max(0.01, val / oldBox.height);
                    target.transform = multiplyMatrix(target.transform, scaleMatrix(1, sy));
                }
            });
        });
        bindInputLive('propRot', (val) => {
            this.store.commit('Change Rotation', (doc) => {
                const target = doc.elements[el.id];
                if (!target) return;
                const rad = (val * Math.PI) / 180;
                const tx = target.transform[4];
                const ty = target.transform[5];
                target.transform = [Math.cos(rad), Math.sin(rad), -Math.sin(rad), Math.cos(rad), tx, ty];
            });
        });

        // Appearance
        content.querySelector('#propFillPicker')?.addEventListener('input', (e) => {
            this.store.commit('Change Fill Color', (doc) => {
                const target = doc.elements[el.id];
                if (target) {
                    if (!target.style) target.style = {};
                    target.style.fill = e.target.value;
                }
            });
        });
        content.querySelector('#chkFillNone')?.addEventListener('change', (e) => {
            this.store.commit('Toggle Fill None', (doc) => {
                const target = doc.elements[el.id];
                if (target) {
                    if (!target.style) target.style = {};
                    target.style.fill = e.target.checked ? 'none' : '#007acc';
                }
            });
            this.render();
        });

        content.querySelector('#propStrokePicker')?.addEventListener('input', (e) => {
            this.store.commit('Change Stroke Color', (doc) => {
                const target = doc.elements[el.id];
                if (target) {
                    if (!target.style) target.style = {};
                    target.style.stroke = e.target.value;
                }
            });
        });
        content.querySelector('#chkStrokeNone')?.addEventListener('change', (e) => {
            this.store.commit('Toggle Stroke None', (doc) => {
                const target = doc.elements[el.id];
                if (target) {
                    if (!target.style) target.style = {};
                    target.style.stroke = e.target.checked ? 'none' : '#007acc';
                }
            });
            this.render();
        });

        bindInputLive('propStrokeWidth', (val) => {
            this.store.commit('Change Stroke Width', (doc) => {
                const target = doc.elements[el.id];
                if (target) {
                    if (!target.style) target.style = {};
                    target.style.strokeWidth = val;
                }
            });
        });

        const opSlider = content.querySelector('#propOpacity');
        opSlider?.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            content.querySelector('#propOpacityVal').textContent = `${Math.round(val * 100)}%`;
            this.store.commit('Change Opacity', (doc) => {
                const target = doc.elements[el.id];
                if (target) {
                    if (!target.style) target.style = {};
                    target.style.opacity = val;
                }
            });
        });

        // Laser Op
        content.querySelector('#propLaserOp')?.addEventListener('change', (e) => {
            this.store.commit('Change Laser Mode', (doc) => {
                const target = doc.elements[el.id];
                if (target) {
                    if (!target.laser) target.laser = {};
                    target.laser.op = e.target.value;
                }
            });
        });

        // Shape Generators Live Wire
        if (el.type === 'star') {
            const updateStar = () => {
                this.store.commit('Update Star Generator', (doc) => {
                    const target = doc.elements[el.id];
                    if (!target) return;
                    if (!target.params) target.params = {};
                    target.params.points = parseInt(content.querySelector('#genStarPoints')?.value, 10) || 5;
                    target.params.outerRadius = parseFloat(content.querySelector('#genStarOuterR')?.value) || 25;
                    target.params.innerRatio = parseFloat(content.querySelector('#genStarRatio')?.value) || 0.382;
                    target.params.rotation = parseFloat(content.querySelector('#genStarRot')?.value) || 0;
                    target.params.cornerRadius = parseFloat(content.querySelector('#genStarCorner')?.value) || 0;
                    target.geometry.points = target.params.points;
                    target.geometry.outerRadius = target.params.outerRadius;
                    target.geometry.innerRadius = target.params.outerRadius * target.params.innerRatio;
                    target.geometry.rotation = target.params.rotation;
                    target.geometry.cornerRadius = target.params.cornerRadius;
                });
            };
            content.querySelectorAll('[id^="genStar"]').forEach(input => {
                input.addEventListener('input', updateStar);
            });
        }

        if (el.type === 'polygon') {
            const updatePoly = () => {
                this.store.commit('Update Polygon Generator', (doc) => {
                    const target = doc.elements[el.id];
                    if (!target) return;
                    if (!target.params) target.params = {};
                    target.params.sides = parseInt(content.querySelector('#genPolySides')?.value, 10) || 6;
                    target.params.radius = parseFloat(content.querySelector('#genPolyRadius')?.value) || 25;
                    target.params.sizeMode = content.querySelector('#genPolyMode')?.value || 'circumradius';
                    target.params.rotation = parseFloat(content.querySelector('#genPolyRot')?.value) || 0;
                    target.params.cornerRadius = parseFloat(content.querySelector('#genPolyCorner')?.value) || 0;
                    target.geometry.sides = target.params.sides;
                    target.geometry.radius = target.params.radius;
                    target.geometry.sizeMode = target.params.sizeMode;
                    target.geometry.rotation = target.params.rotation;
                    target.geometry.cornerRadius = target.params.cornerRadius;
                });
            };
            content.querySelectorAll('[id^="genPoly"]').forEach(input => {
                input.addEventListener('input', updatePoly);
                input.addEventListener('change', updatePoly);
            });
        }
    }
}
