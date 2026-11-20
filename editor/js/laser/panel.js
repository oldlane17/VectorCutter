/**
 * VectorCutter - Laser Cutting Panel
 * Sheet presets, bed boundaries, automated kerf compensation, cut ordering, and geometry checks.
 */

import { MATERIAL_PRESETS } from './operations.js';
import { runLaserChecks } from './checks.js';
import { optimizeCutOrder } from './ordering.js';
import { applyKerfOffset } from '../ops/offset.js';
import { events } from '../core/events.js';

export class LaserPanel {
    constructor(containerEl, store) {
        this.container = containerEl;
        this.store = store;
    }

    render() {
        const doc = this.store.doc;
        const bed = doc.settings?.bed || { w: 600, h: 400 };

        this.container.innerHTML = `
            <div class="vc-panel-section">
                <div class="vc-panel-title">LASER BED & STOCK</div>
                <div class="vc-form-row">
                    <span>Bed Width</span>
                    <input type="number" id="laserBedW" value="${bed.w}" min="50" max="2500" step="10"> mm
                </div>
                <div class="vc-form-row">
                    <span>Bed Height</span>
                    <input type="number" id="laserBedH" value="${bed.h}" min="50" max="2500" step="10"> mm
                </div>
                <div class="vc-form-row">
                    <span>Preset</span>
                    <select id="laserMaterialPreset" style="width: 140px;">
                        <option value="">Custom...</option>
                        ${MATERIAL_PRESETS.map(m => `<option value="${m.name}" data-kerf="${m.kerf}" data-thick="${m.thickness}">${m.name}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div class="vc-panel-section">
                <div class="vc-panel-title">CUT OPTIMIZATION</div>
                <button class="vc-btn" id="btnOptimizeOrder" style="width: 100%; justify-content: center; background: var(--vc-bg-surface-3); border: 1px solid var(--vc-border-default); margin-bottom: 6px;">
                    ⚡ Optimize Cut Order (Inner First)
                </button>
                <button class="vc-btn" id="btnApplyKerf" style="width: 100%; justify-content: center; background: var(--vc-bg-surface-3); border: 1px solid var(--vc-border-default);">
                    📐 Apply Kerf Offset
                </button>
            </div>

            <div class="vc-panel-section">
                <div class="vc-panel-title">PRE-FLIGHT VALIDATION</div>
                <button class="vc-btn" id="btnRunChecks" style="width: 100%; justify-content: center; background: rgba(0, 122, 204, 0.15); border: 1px solid var(--vc-accent-blue); color: var(--vc-accent-hover); margin-bottom: 8px;">
                    🔍 Run Geometry Checks
                </button>
                <div id="laserIssuesList" style="font-size: 11px; max-height: 180px; overflow-y: auto;"></div>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const bedW = document.getElementById('laserBedW');
        const bedH = document.getElementById('laserBedH');
        if (bedW) {
            bedW.addEventListener('change', () => {
                if (!this.store.doc.settings.bed) this.store.doc.settings.bed = {};
                this.store.doc.settings.bed.w = parseFloat(bedW.value) || 600;
                events.emit('document:changed', { action: 'bed' });
            });
        }
        if (bedH) {
            bedH.addEventListener('change', () => {
                if (!this.store.doc.settings.bed) this.store.doc.settings.bed = {};
                this.store.doc.settings.bed.h = parseFloat(bedH.value) || 400;
                events.emit('document:changed', { action: 'bed' });
            });
        }

        const preset = document.getElementById('laserMaterialPreset');
        if (preset) {
            preset.addEventListener('change', () => {
                const opt = preset.selectedOptions[0];
                if (opt && opt.dataset.kerf) {
                    alert(`Selected ${opt.value}:\n• Material Thickness: ${opt.dataset.thick} mm\n• Recommended Kerf Offset: ${opt.dataset.kerf} mm`);
                }
            });
        }

        const btnOrder = document.getElementById('btnOptimizeOrder');
        if (btnOrder) {
            btnOrder.addEventListener('click', () => {
                const sorted = optimizeCutOrder(this.store);
                events.emit('document:changed', { action: 'cut-order' });
                alert(`Cut order optimized! ${sorted?.length || 0} cut operations sorted (inner contours will cut first).`);
            });
        }

        const btnKerf = document.getElementById('btnApplyKerf');
        if (btnKerf) {
            btnKerf.addEventListener('click', () => applyKerfOffset(this.store));
        }

        const btnChecks = document.getElementById('btnRunChecks');
        if (btnChecks) {
            btnChecks.addEventListener('click', () => {
                const issues = runLaserChecks(this.store);
                const list = document.getElementById('laserIssuesList');
                if (!list) return;

                if (issues.length === 0) {
                    list.innerHTML = `<div style="color: var(--vc-success); padding: 6px; text-align: center;">✅ All paths passed validation! Ready to cut.</div>`;
                    return;
                }

                list.innerHTML = issues.map((iss, idx) => `
                    <div class="laser-issue-item" data-id="${iss.elementId}" style="padding: 6px; margin-bottom: 4px; background: var(--vc-bg-surface-2); border-left: 3px solid ${iss.severity === 'error' ? 'var(--vc-danger)' : 'var(--vc-warning)'}; cursor: pointer; border-radius: 2px;">
                        ${iss.message}
                    </div>
                `).join('');

                list.querySelectorAll('.laser-issue-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const id = item.dataset.id;
                        if (id) this.store.setSelection([id]);
                    });
                });
            });
        }
    }
}
