/**
 * VectorCutter - Properties & Laser Context Panel Controller
 * Two-way live data binding with tabs for element Properties and Laser Pre-flight.
 */

import { events } from '../core/events.js';
import { UpdateElementPropsCommand, TransformElementsCommand } from '../core/commands.js';
import { getElementLocalBounds } from '../model/bounds.js';
import { translationMatrix, rotationMatrix, scaleMatrix, multiplyMatrix } from '../model/matrix.js';
import { LaserPanel } from '../laser/panel.js';
import { fontManager } from '../io/fonts.js';

export class PropertiesController {
    constructor(panelEl, store) {
        this.panel = panelEl;
        this.store = store;
        this.currentTab = 'properties';
        this.laserPanel = new LaserPanel(null, store);

        this.bindEvents();
        this.render();
    }

    render() {
        const selected = this.store.getSelectedElements();

        // Header Tabs
        let html = `
            <div style="display:flex;border-bottom:1px solid var(--vc-border-subtle);background:var(--vc-bg-surface-1);">
                <button id="tabBtnProps" style="flex:1;padding:8px;font-size:11px;font-weight:600;background:none;border:none;border-bottom:2px solid ${this.currentTab === 'properties' ? 'var(--vc-accent-blue)' : 'transparent'};color:${this.currentTab === 'properties' ? 'var(--vc-text-primary)' : 'var(--vc-text-muted)'};cursor:pointer;">PROPERTIES</button>
                <button id="tabBtnLaser" style="flex:1;padding:8px;font-size:11px;font-weight:600;background:none;border:none;border-bottom:2px solid ${this.currentTab === 'laser' ? 'var(--vc-accent-blue)' : 'transparent'};color:${this.currentTab === 'laser' ? 'var(--vc-text-primary)' : 'var(--vc-text-muted)'};cursor:pointer;">⚡ LASER PREP</button>
            </div>
            <div id="contextContent" style="flex:1;overflow-y:auto;"></div>
        `;

        this.panel.innerHTML = html;

        // Wire tabs
        document.getElementById('tabBtnProps')?.addEventListener('click', () => {
            this.currentTab = 'properties';
            this.render();
        });
        document.getElementById('tabBtnLaser')?.addEventListener('click', () => {
            this.currentTab = 'laser';
            this.render();
        });

        const content = document.getElementById('contextContent');

        if (this.currentTab === 'laser') {
            this.laserPanel.container = content;
            this.laserPanel.render();
            return;
        }

        // --- PROPERTIES TAB ---
        if (selected.length === 0) {
            content.innerHTML = `
                <div class="vc-panel-section">
                    <div class="vc-panel-title">DOCUMENT PROPERTIES</div>
                    <div class="vc-form-row">
                        <span>Units</span>
                        <select id="propDocUnits">
                            <option value="mm" selected>Millimetres (mm)</option>
                            <option value="in">Inches (in)</option>
                        </select>
                    </div>
                    <div class="vc-form-row">
                        <span>Bed Size</span>
                        <input type="text" value="${this.store.doc.settings?.bed?.w || 600} × ${this.store.doc.settings?.bed?.h || 400} mm" readonly style="width: 110px;">
                    </div>
                </div>
                <div style="padding: 24px 12px; text-align: center; color: var(--vc-text-muted); font-size: 12px;">
                    Select an element on canvas to edit transform, appearance, and laser settings.
                </div>
            `;
            return;
        }

        const el = selected[0];
        const box = getElementLocalBounds(el);
        const posX = el.transform[4];
        const posY = el.transform[5];
        const rotRad = Math.atan2(el.transform[1], el.transform[0]);
        const rotDeg = Math.round((rotRad * 180) / Math.PI);

        content.innerHTML = `
            <div class="vc-panel-section">
                <div class="vc-panel-title">TRANSFORM</div>
                <div class="vc-form-row">
                    <span>X</span>
                    <input type="number" id="propX" value="${posX.toFixed(1)}" step="1"> mm
                </div>
                <div class="vc-form-row">
                    <span>Y</span>
                    <input type="number" id="propY" value="${posY.toFixed(1)}" step="1"> mm
                </div>
                <div class="vc-form-row">
                    <span>Width</span>
                    <input type="number" id="propW" value="${box.width.toFixed(1)}" min="0.5" step="1"> mm
                </div>
                <div class="vc-form-row">
                    <span>Height</span>
                    <input type="number" id="propH" value="${box.height.toFixed(1)}" min="0.5" step="1"> mm
                </div>
                <div class="vc-form-row">
                    <span>Rotation</span>
                    <input type="number" id="propRot" value="${rotDeg}" step="5"> °
                </div>
            </div>

            <div class="vc-panel-section">
                <div class="vc-panel-title">APPEARANCE</div>
                <div class="vc-form-row">
                    <span>Fill</span>
                    <input type="color" id="propFill" value="${el.style?.fill === 'none' ? '#000000' : (el.style?.fill || '#007acc')}">
                    <button class="vc-btn" id="propFillNone" style="padding: 2px 6px; font-size: 10px;">None</button>
                </div>
                <div class="vc-form-row">
                    <span>Stroke</span>
                    <input type="color" id="propStroke" value="${el.style?.stroke === 'none' ? '#000000' : (el.style?.stroke || '#007acc')}">
                    <button class="vc-btn" id="propStrokeNone" style="padding: 2px 6px; font-size: 10px;">None</button>
                </div>
                <div class="vc-form-row">
                    <span>Width</span>
                    <input type="number" id="propStrokeW" value="${el.style?.strokeWidth || 0.5}" step="0.1" min="0.05"> mm
                </div>
                <div class="vc-form-row">
                    <span>Opacity</span>
                    <input type="range" id="propOpacity" min="0" max="1" step="0.05" value="${el.style?.opacity !== undefined ? el.style.opacity : 1}">
                </div>
            </div>

            <div class="vc-panel-section">
                <div class="vc-panel-title">LASER OPERATION</div>
                <div class="vc-form-row">
                    <span>Mode</span>
                    <select id="propLaserOp">
                        <option value="cut" ${el.laser?.op === 'cut' ? 'selected' : ''}>🔴 Cut (Vector Outline)</option>
                        <option value="score" ${el.laser?.op === 'score' ? 'selected' : ''}>🔵 Score (Vector Crease)</option>
                        <option value="engrave" ${el.laser?.op === 'engrave' ? 'selected' : ''}>⚫ Engrave (Raster Fill)</option>
                        <option value="guide" ${el.laser?.op === 'guide' ? 'selected' : ''}>🟢 Guide (Alignment)</option>
                    </select>
                </div>
            </div>

            ${el.type === 'text' ? `
            <div class="vc-panel-section">
                <div class="vc-panel-title">TEXT PROPERTIES</div>
                <div class="vc-form-row">
                    <span>Content</span>
                    <input type="text" id="propTextContent" value="${el.geometry?.text || ''}" style="width: 140px;">
                </div>
                <div class="vc-form-row">
                    <span>Font Size</span>
                    <input type="number" id="propFontSize" value="${el.geometry?.fontSize || 14}" min="4" max="200"> mm
                </div>
                <div class="vc-form-row">
                    <span>Font Family</span>
                    <select id="propFontFamily" style="width: 140px;">
                        ${(fontManager.manifest.length > 0 ? fontManager.manifest : [
                            { family: 'Arial' }, { family: 'Roboto' }, { family: 'Dancing Script' }, { family: 'Allerta Stencil' }
                        ]).map(f => `<option value="${f.family}" ${el.geometry?.fontFamily === f.family ? 'selected' : ''}>${f.family}</option>`).join('')}
                    </select>
                </div>
            </div>
            ` : ''}
        `;

        this.bindInputListeners(el, box);
    }

    bindInputListeners(el, box) {
        // X Position
        const inputX = document.getElementById('propX');
        if (inputX) {
            inputX.addEventListener('change', () => {
                const newX = parseFloat(inputX.value) || 0;
                const before = [...el.transform];
                el.transform[4] = newX;
                this.store.dispatch(new TransformElementsCommand([{ id: el.id, before, after: [...el.transform] }]));
            });
        }

        // Y Position
        const inputY = document.getElementById('propY');
        if (inputY) {
            inputY.addEventListener('change', () => {
                const newY = parseFloat(inputY.value) || 0;
                const before = [...el.transform];
                el.transform[5] = newY;
                this.store.dispatch(new TransformElementsCommand([{ id: el.id, before, after: [...el.transform] }]));
            });
        }

        // Width
        const inputW = document.getElementById('propW');
        if (inputW) {
            inputW.addEventListener('change', () => {
                const newW = Math.max(0.5, parseFloat(inputW.value) || 1);
                const beforeProps = { geometry: { ...el.geometry } };
                if (el.type === 'rect') el.geometry.width = newW;
                else if (el.type === 'circle') el.geometry.r = newW / 2;
                else if (el.type === 'ellipse') el.geometry.rx = newW / 2;
                else if (el.type === 'polygon') el.geometry.radius = newW / 2;
                else if (el.type === 'star') el.geometry.outerRadius = newW / 2;
                const afterProps = { geometry: { ...el.geometry } };
                this.store.dispatch(new UpdateElementPropsCommand(el.id, beforeProps, afterProps));
            });
        }

        // Height
        const inputH = document.getElementById('propH');
        if (inputH) {
            inputH.addEventListener('change', () => {
                const newH = Math.max(0.5, parseFloat(inputH.value) || 1);
                const beforeProps = { geometry: { ...el.geometry } };
                if (el.type === 'rect') el.geometry.height = newH;
                else if (el.type === 'circle') el.geometry.r = newH / 2;
                else if (el.type === 'ellipse') el.geometry.ry = newH / 2;
                else if (el.type === 'polygon') el.geometry.radius = newH / 2;
                else if (el.type === 'star') el.geometry.outerRadius = newH / 2;
                const afterProps = { geometry: { ...el.geometry } };
                this.store.dispatch(new UpdateElementPropsCommand(el.id, beforeProps, afterProps));
            });
        }

        // Rotation
        const inputRot = document.getElementById('propRot');
        if (inputRot) {
            inputRot.addEventListener('change', () => {
                const deg = parseFloat(inputRot.value) || 0;
                const before = [...el.transform];
                const cx = el.transform[4] + box.width / 2;
                const cy = el.transform[5] + box.height / 2;
                const mRot = rotationMatrix(deg, cx, cy);
                el.transform = multiplyMatrix(mRot, translationMatrix(cx, cy));
                this.store.dispatch(new TransformElementsCommand([{ id: el.id, before, after: [...el.transform] }]));
            });
        }

        // Fill Color
        const inputFill = document.getElementById('propFill');
        if (inputFill) {
            inputFill.addEventListener('input', () => {
                const beforeProps = { style: { ...el.style } };
                el.style.fill = inputFill.value;
                const afterProps = { style: { ...el.style } };
                this.store.dispatch(new UpdateElementPropsCommand(el.id, beforeProps, afterProps));
            });
        }

        const btnFillNone = document.getElementById('propFillNone');
        if (btnFillNone) {
            btnFillNone.addEventListener('click', () => {
                const beforeProps = { style: { ...el.style } };
                el.style.fill = 'none';
                const afterProps = { style: { ...el.style } };
                this.store.dispatch(new UpdateElementPropsCommand(el.id, beforeProps, afterProps));
            });
        }

        // Stroke Color
        const inputStroke = document.getElementById('propStroke');
        if (inputStroke) {
            inputStroke.addEventListener('input', () => {
                const beforeProps = { style: { ...el.style } };
                el.style.stroke = inputStroke.value;
                const afterProps = { style: { ...el.style } };
                this.store.dispatch(new UpdateElementPropsCommand(el.id, beforeProps, afterProps));
            });
        }

        const btnStrokeNone = document.getElementById('propStrokeNone');
        if (btnStrokeNone) {
            btnStrokeNone.addEventListener('click', () => {
                const beforeProps = { style: { ...el.style } };
                el.style.stroke = 'none';
                const afterProps = { style: { ...el.style } };
                this.store.dispatch(new UpdateElementPropsCommand(el.id, beforeProps, afterProps));
            });
        }

        // Stroke Width
        const inputStrokeW = document.getElementById('propStrokeW');
        if (inputStrokeW) {
            inputStrokeW.addEventListener('change', () => {
                const beforeProps = { style: { ...el.style } };
                el.style.strokeWidth = Math.max(0.01, parseFloat(inputStrokeW.value) || 0.5);
                const afterProps = { style: { ...el.style } };
                this.store.dispatch(new UpdateElementPropsCommand(el.id, beforeProps, afterProps));
            });
        }

        // Opacity
        const inputOpacity = document.getElementById('propOpacity');
        if (inputOpacity) {
            inputOpacity.addEventListener('input', () => {
                const beforeProps = { style: { ...el.style } };
                el.style.opacity = parseFloat(inputOpacity.value);
                const afterProps = { style: { ...el.style } };
                this.store.dispatch(new UpdateElementPropsCommand(el.id, beforeProps, afterProps));
            });
        }

        // Laser Operation
        const inputLaserOp = document.getElementById('propLaserOp');
        if (inputLaserOp) {
            inputLaserOp.addEventListener('change', () => {
                const op = inputLaserOp.value;
                const before = { laser: { ...el.laser }, style: { ...el.style } };

                el.laser.op = op;
                if (op === 'cut') {
                    el.style.fill = 'none';
                    el.style.stroke = '#ff3b30';
                    el.style.strokeWidth = 0.1;
                } else if (op === 'score') {
                    el.style.fill = 'none';
                    el.style.stroke = '#007aff';
                    el.style.strokeWidth = 0.1;
                } else if (op === 'engrave') {
                    el.style.fill = '#5856d6';
                    el.style.stroke = 'none';
                } else if (op === 'guide') {
                    el.style.fill = 'none';
                    el.style.stroke = '#4caf50';
                    el.style.strokeWidth = 0.1;
                    el.style.strokeDasharray = '2 2';
                }

                const after = { laser: { ...el.laser }, style: { ...el.style } };
                this.store.dispatch(new UpdateElementPropsCommand(el.id, before, after));
            });
        }

        // Text Content
        const inputText = document.getElementById('propTextContent');
        if (inputText) {
            inputText.addEventListener('input', () => {
                const beforeProps = { geometry: { ...el.geometry } };
                el.geometry.text = inputText.value;
                const afterProps = { geometry: { ...el.geometry } };
                this.store.dispatch(new UpdateElementPropsCommand(el.id, beforeProps, afterProps));
            });
        }

        // Font Size
        const inputFontSize = document.getElementById('propFontSize');
        if (inputFontSize) {
            inputFontSize.addEventListener('change', () => {
                const beforeProps = { geometry: { ...el.geometry } };
                el.geometry.fontSize = Math.max(2, parseFloat(inputFontSize.value) || 14);
                const afterProps = { geometry: { ...el.geometry } };
                this.store.dispatch(new UpdateElementPropsCommand(el.id, beforeProps, afterProps));
            });
        }

        // Font Family
        const selectFont = document.getElementById('propFontFamily');
        if (selectFont) {
            selectFont.addEventListener('change', () => {
                const beforeProps = { geometry: { ...el.geometry } };
                el.geometry.fontFamily = selectFont.value;
                const afterProps = { geometry: { ...el.geometry } };
                this.store.dispatch(new UpdateElementPropsCommand(el.id, beforeProps, afterProps));
            });
        }
    }

    bindEvents() {
        events.on('selection:changed', () => {
            if (this.currentTab === 'properties') this.render();
        });
        events.on('document:changed', (e) => {
            if (e?.action === 'laser-mode') {
                if (this.store.doc.settings.laserMode) {
                    this.currentTab = 'laser';
                }
                this.render();
                return;
            }
            if (e?.action !== 'typing') {
                this.render();
            }
        });
    }
}
