/**
 * VectorCutter - Dialogs & Modals Controller
 * Shape Library, Shortcuts Cheatsheet, Command Palette, and Project Settings.
 */

import { createElement } from '../model/elements.js';
import { AddElementCommand } from '../core/commands.js';
import { translationMatrix } from '../model/matrix.js';
import { importSVGString } from '../io/svg-import.js';
import { events } from '../core/events.js';
import { storage } from '../core/storage.js';

export class ModalsController {
    constructor(store, camera) {
        this.store = store;
        this.camera = camera;
        this.bindGlobalShortcuts();
    }

    bindGlobalShortcuts() {
        window.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea, select')) return;

            // '?' -> Shortcuts
            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                this.showShortcutsModal();
            }

            // Ctrl+K -> Command Palette
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.showCommandPalette();
            }
        });
    }

    showShapeLibrary() {
        let modal = document.getElementById('shapeLibraryModal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'shapeLibraryModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;';

        modal.innerHTML = `
            <div style="background:var(--vc-bg-surface-1);border:1px solid var(--vc-border-default);border-radius:var(--vc-radius-lg);width:760px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column;padding:16px;box-shadow:var(--vc-shadow-modal);">
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--vc-border-subtle);padding-bottom:10px;margin-bottom:12px;">
                    <h2 style="font-size:16px;margin:0;color:var(--vc-text-primary);">📐 Shape & Preset Library</h2>
                    <button id="closeShapesModal" style="background:none;border:none;color:var(--vc-text-muted);font-size:20px;cursor:pointer;">&times;</button>
                </div>
                <div style="font-size:12px;font-weight:600;color:var(--vc-text-muted);margin-bottom:6px;">PRESET SHAPES</div>
                <div id="shapeGrid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(110px, 1fr));gap:10px;margin-bottom:16px;"></div>
                <div style="font-size:12px;font-weight:600;color:var(--vc-text-muted);margin-bottom:6px;border-top:1px solid var(--vc-border-subtle);padding-top:10px;">TEMPLATES</div>
                <div id="templateGrid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:10px;overflow-y:auto;flex:1;padding:4px;"></div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#closeShapesModal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        const shapeGrid = modal.querySelector('#shapeGrid');
        const templateGrid = modal.querySelector('#templateGrid');

        const presets = [
            { name: 'Heart', d: 'M 50 15 C 35 -5, 0 10, 0 38 C 0 65, 50 95, 50 95 C 50 95, 100 65, 100 38 C 100 10, 65 -5, 50 15 Z' },
            { name: 'Gear 8T', d: 'M 45 5 H 55 L 57 15 L 67 18 L 75 11 L 82 18 L 75 26 L 78 36 L 88 38 L 88 50 L 78 52 L 75 62 L 82 70 L 75 77 L 67 70 L 57 73 L 55 83 H 45 L 43 73 L 33 70 L 25 77 L 18 70 L 25 62 L 22 52 L 12 50 L 12 38 L 22 36 L 25 26 L 18 18 L 25 11 L 33 18 L 43 15 Z' },
            { name: '5-Point Star', d: 'M 50 5 L 61 38 L 96 38 L 68 59 L 79 92 L 50 71 L 21 92 L 32 59 L 4 38 L 39 38 Z' },
            { name: 'Cross / Plus', d: 'M 35 5 H 65 V 35 H 95 V 65 H 65 V 95 H 35 V 65 H 5 V 35 H 35 Z' },
            { name: 'Crescent Moon', d: 'M 60 5 C 25 15, 10 50, 30 85 C 45 100, 75 95, 90 80 C 65 80, 45 60, 48 35 C 50 20, 58 10, 60 5 Z' },
            { name: 'Speech Bubble', d: 'M 10 10 H 90 V 65 H 35 L 15 85 V 65 H 10 Z' }
        ];

        presets.forEach(p => {
            const card = document.createElement('div');
            card.style.cssText = 'background:var(--vc-bg-surface-2);border:1px solid var(--vc-border-default);border-radius:6px;padding:8px;text-align:center;cursor:pointer;transition:transform 0.15s, border-color 0.15s;';
            card.innerHTML = `
                <svg viewBox="0 0 100 100" width="48" height="48" style="margin:0 auto 4px auto;display:block;">
                    <path d="${p.d}" fill="var(--vc-accent-blue)" stroke="none"/>
                </svg>
                <div style="font-size:11px;font-weight:600;color:var(--vc-text-primary);">${p.name}</div>
            `;
            card.addEventListener('mouseenter', () => { card.style.borderColor = 'var(--vc-accent-blue)'; card.style.transform = 'translateY(-2px)'; });
            card.addEventListener('mouseleave', () => { card.style.borderColor = 'var(--vc-border-default)'; card.style.transform = 'none'; });
            card.addEventListener('click', () => {
                const center = this.camera.toWorld(window.innerWidth / 2, window.innerHeight / 2);
                const el = createElement('path', {
                    d: p.d,
                    name: p.name,
                    style: { fill: 'none', stroke: '#007acc', strokeWidth: 0.5 },
                    laser: { op: 'cut' },
                    transform: translationMatrix(center.x - 25, center.y - 25)
                });
                this.store.dispatch(new AddElementCommand(el));
                this.store.setSelection([el.id]);
                modal.remove();
            });
            shapeGrid.appendChild(card);
        });

        // Templates from /templates/
        const templates = [
            { name: 'Leather Badge', file: 'templates/leather_badge.svg' },
            { name: '5-Star Template', file: 'templates/5_star.svg' },
            { name: '6-Star Template', file: 'templates/6_star.svg' },
            { name: 'Code Block', file: 'templates/code.svg' },
            { name: 'Ellipse Template', file: 'templates/ellipse.svg' }
        ];

        templates.forEach(t => {
            const card = document.createElement('div');
            card.style.cssText = 'background:var(--vc-bg-surface-2);border:1px solid var(--vc-border-default);border-radius:6px;padding:10px;text-align:center;cursor:pointer;transition:transform 0.15s, border-color 0.15s;';
            card.innerHTML = `
                <div style="font-size:24px;margin-bottom:6px;">📦</div>
                <div style="font-size:12px;font-weight:600;color:var(--vc-text-primary);">${t.name}</div>
                <div style="font-size:10px;color:var(--vc-text-muted);margin-top:2px;">Load SVG Template</div>
            `;
            card.addEventListener('mouseenter', () => { card.style.borderColor = 'var(--vc-accent-blue)'; card.style.transform = 'translateY(-2px)'; });
            card.addEventListener('mouseleave', () => { card.style.borderColor = 'var(--vc-border-default)'; card.style.transform = 'none'; });
            card.addEventListener('click', async () => {
                try {
                    const res = await fetch(t.file);
                    if (res.ok) {
                        const svgText = await res.text();
                        importSVGString(svgText, this.store, 'append');
                        modal.remove();
                    } else {
                        alert('Could not load template file: ' + t.file);
                    }
                } catch (err) {
                    console.error('Template load error:', err);
                }
            });
            templateGrid.appendChild(card);
        });
    }

    showShortcutsModal() {
        let modal = document.getElementById('shortcutsModal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'shortcutsModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;';

        modal.innerHTML = `
            <div style="background:var(--vc-bg-surface-1);border:1px solid var(--vc-border-default);border-radius:var(--vc-radius-lg);width:540px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column;padding:16px;box-shadow:var(--vc-shadow-modal);">
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--vc-border-subtle);padding-bottom:10px;margin-bottom:12px;">
                    <h2 style="font-size:16px;margin:0;color:var(--vc-text-primary);">⌨️ Keyboard Shortcuts</h2>
                    <button id="closeShortcutsModal" style="background:none;border:none;color:var(--vc-text-muted);font-size:20px;cursor:pointer;">&times;</button>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px;color:var(--vc-text-secondary);overflow-y:auto;padding:4px;">
                    <div><strong>V</strong>: Select Tool</div>
                    <div><strong>H / Space</strong>: Pan Tool</div>
                    <div><strong>R</strong>: Rectangle</div>
                    <div><strong>C</strong>: Circle</div>
                    <div><strong>L</strong>: Line</div>
                    <div><strong>P</strong>: Pen / Freehand</div>
                    <div><strong>N</strong>: Curve / Node Edit</div>
                    <div><strong>T</strong>: Text</div>
                    <div><strong>Ctrl+Z</strong>: Undo</div>
                    <div><strong>Ctrl+M / Ctrl+Y</strong>: Redo</div>
                    <div><strong>Ctrl+D</strong>: Duplicate</div>
                    <div><strong>Del / Backspace</strong>: Delete</div>
                    <div><strong>Arrow Keys</strong>: Nudge 1mm (Shift: 10mm)</div>
                    <div><strong>Ctrl+A</strong>: Select All</div>
                    <div><strong>Ctrl+0</strong>: Reset Zoom</div>
                    <div><strong>Ctrl+K</strong>: Command Palette</div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#closeShortcutsModal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }

    showCommandPalette() {
        let modal = document.getElementById('cmdPaletteModal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'cmdPaletteModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);display:flex;align-items:flex-start;justify-content:center;padding-top:80px;z-index:9999;';

        modal.innerHTML = `
            <div style="background:var(--vc-bg-surface-2);border:1px solid var(--vc-accent-blue);border-radius:var(--vc-radius-md);width:500px;max-width:95vw;box-shadow:var(--vc-shadow-modal);overflow:hidden;">
                <input type="text" id="cmdInput" placeholder="Type a command (e.g. Export, Union, Zoom, Grid)..." style="width:100%;padding:12px 14px;background:transparent;border:none;border-bottom:1px solid var(--vc-border-default);color:var(--vc-text-primary);font-size:14px;outline:none;">
                <div id="cmdList" style="max-height:260px;overflow-y:auto;padding:6px;"></div>
            </div>
        `;
        document.body.appendChild(modal);

        const input = modal.querySelector('#cmdInput');
        const list = modal.querySelector('#cmdList');
        input.focus();

        const commands = [
            { name: 'Export SVG', action: () => document.getElementById('menuSave')?.click() },
            { name: 'Export DXF (Laser/CNC)', action: () => document.getElementById('menuExportDXF')?.click() },
            { name: 'Export PNG', action: () => document.getElementById('menuExportPNG')?.click() },
            { name: 'Boolean Union (Weld)', action: () => document.getElementById('menuBooleanUnion')?.click() },
            { name: 'Boolean Difference', action: () => document.getElementById('menuBooleanDiff')?.click() },
            { name: 'Boolean Intersect', action: () => document.getElementById('menuBooleanIntersect')?.click() },
            { name: 'Boolean Exclude (XOR)', action: () => document.getElementById('menuBooleanExclude')?.click() },
            { name: 'Kerf Offset (Inset/Outset)', action: () => document.getElementById('menuKerfOffset')?.click() },
            { name: 'Outline Stroke', action: () => document.getElementById('menuOutlineStroke')?.click() },
            { name: 'Linear Repeat Pattern', action: () => document.getElementById('menuLinearRepeat')?.click() },
            { name: 'Browse Shape Library', action: () => this.showShapeLibrary() },
            { name: 'Reset Zoom (1:1 mm)', action: () => document.getElementById('menuResetZoom')?.click() },
            { name: 'Toggle Grid', action: () => document.getElementById('menuToggleGrid')?.click() },
            { name: 'Toggle Theme (Light / Dark)', action: () => document.getElementById('themeToggleBtn')?.click() },
            { name: 'Editor Settings', action: () => this.showSettingsModal() }
        ];

        const renderList = (filter = '') => {
            list.innerHTML = '';
            const q = filter.toLowerCase().trim();
            const filtered = commands.filter(c => !q || c.name.toLowerCase().includes(q));

            filtered.forEach((c) => {
                const item = document.createElement('div');
                item.style.cssText = 'padding:8px 12px;border-radius:4px;font-size:13px;color:var(--vc-text-primary);cursor:pointer;display:flex;align-items:center;justify-content:space-between;';
                item.textContent = c.name;
                item.addEventListener('mouseenter', () => item.style.background = 'var(--vc-accent-blue)');
                item.addEventListener('mouseleave', () => item.style.background = 'transparent');
                item.addEventListener('click', () => {
                    modal.remove();
                    c.action();
                });
                list.appendChild(item);
            });
        };

        input.addEventListener('input', (e) => renderList(e.target.value));
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        renderList();
    }

    showSettingsModal() {
        let modal = document.getElementById('settingsModal');
        if (modal) modal.remove();

        const saved = storage.getItem('vc_editor_settings', {});
        const curStroke = saved.defaultStroke || window.__vcDefaultStroke || '#007acc';
        const curFill = saved.defaultFill !== undefined ? saved.defaultFill : (window.__vcDefaultFill !== undefined ? window.__vcDefaultFill : 'rgba(0, 122, 204, 0.08)');
        const isFillNone = curFill === 'none';
        const curFillHex = curFill.startsWith('#') ? curFill : '#007acc';
        const curUnit = saved.defaultUnit || this.store.doc.units || window.__vcDefaultUnit || 'mm';
        const curFont = saved.defaultFontFamily || window.__vcDefaultFontFamily || 'Arial';
        const curFontSize = saved.defaultFontSize || window.__vcDefaultFontSize || 14;
        const curTheme = storage.getItem('vc_theme', saved.defaultTheme || 'dark');
        const curInvertScroll = saved.invertScroll !== undefined ? !!saved.invertScroll : true;

        modal = document.createElement('div');
        modal.id = 'settingsModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;';

        modal.innerHTML = `
            <div style="background:var(--vc-bg-surface-1);border:1px solid var(--vc-border-default);border-radius:var(--vc-radius-lg);width:440px;max-width:95vw;display:flex;flex-direction:column;padding:18px;box-shadow:var(--vc-shadow-modal);color:var(--vc-text-primary);">
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--vc-border-subtle);padding-bottom:10px;margin-bottom:14px;">
                    <h2 style="font-size:16px;margin:0;">⚙️ Editor Settings</h2>
                    <button id="closeSettingsModal" style="background:none;border:none;color:var(--vc-text-muted);font-size:20px;cursor:pointer;">&times;</button>
                </div>

                <div style="display:flex;flex-direction:column;gap:12px;font-size:13px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <label for="setDefaultStroke">Default Stroke Color</label>
                        <input type="color" id="setDefaultStroke" value="${curStroke}" style="width:48px;height:28px;border:none;background:none;cursor:pointer;">
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <label for="setDefaultFill">Default Fill Color</label>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <input type="color" id="setDefaultFill" value="${curFillHex}" style="width:48px;height:28px;border:none;background:none;cursor:pointer;">
                            <label style="font-size:11px;display:flex;align-items:center;gap:4px;cursor:pointer;">
                                <input type="checkbox" id="setDefaultFillNone" ${isFillNone ? 'checked' : ''}> None
                            </label>
                        </div>
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <label for="setDefaultUnit">Dimension Units</label>
                        <select id="setDefaultUnit" style="width:180px;padding:5px 8px;background:var(--vc-bg-surface-2);color:var(--vc-text-primary);border:1px solid var(--vc-border-default);border-radius:4px;">
                            <option value="mm" ${curUnit === 'mm' ? 'selected' : ''}>Millimetres (mm)</option>
                            <option value="cm" ${curUnit === 'cm' ? 'selected' : ''}>Centimetres (cm)</option>
                            <option value="in" ${curUnit === 'in' ? 'selected' : ''}>Inches (in)</option>
                            <option value="px" ${curUnit === 'px' ? 'selected' : ''}>Pixels (px)</option>
                        </select>
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <label for="setDefaultFont">Default Font</label>
                        <select id="setDefaultFont" style="width:180px;padding:5px 8px;background:var(--vc-bg-surface-2);color:var(--vc-text-primary);border:1px solid var(--vc-border-default);border-radius:4px;">
                            <option value="Arial" ${curFont === 'Arial' ? 'selected' : ''}>Arial</option>
                            <option value="Helvetica" ${curFont === 'Helvetica' ? 'selected' : ''}>Helvetica</option>
                            <option value="Verdana" ${curFont === 'Verdana' ? 'selected' : ''}>Verdana</option>
                            <option value="Georgia" ${curFont === 'Georgia' ? 'selected' : ''}>Georgia</option>
                            <option value="Times New Roman" ${curFont === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
                            <option value="Courier New" ${curFont === 'Courier New' ? 'selected' : ''}>Courier New</option>
                        </select>
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <label for="setDefaultFontSize">Default Font Size (mm)</label>
                        <input type="number" id="setDefaultFontSize" value="${curFontSize}" min="2" max="200" step="1" style="width:180px;padding:5px 8px;background:var(--vc-bg-surface-2);color:var(--vc-text-primary);border:1px solid var(--vc-border-default);border-radius:4px;">
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <label for="setDefaultTheme">Default Color Theme</label>
                        <select id="setDefaultTheme" style="width:180px;padding:5px 8px;background:var(--vc-bg-surface-2);color:var(--vc-text-primary);border:1px solid var(--vc-border-default);border-radius:4px;">
                            <option value="dark" ${curTheme === 'dark' ? 'selected' : ''}>Dark</option>
                            <option value="light" ${curTheme === 'light' ? 'selected' : ''}>Light</option>
                            <option value="system" ${curTheme === 'system' ? 'selected' : ''}>System</option>
                        </select>
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <label for="setInvertScroll">Invert Canvas Scroll</label>
                        <input type="checkbox" id="setInvertScroll" ${curInvertScroll ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;">
                    </div>
                </div>

                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px;padding-top:12px;border-top:1px solid var(--vc-border-subtle);">
                    <button id="btnCancelSettings" class="vc-btn" style="padding:6px 14px;">Cancel</button>
                    <button id="btnSaveSettings" class="vc-btn" style="padding:6px 16px;background:var(--vc-accent-blue);color:#fff;font-weight:600;">Save Settings</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#closeSettingsModal').addEventListener('click', () => modal.remove());
        modal.querySelector('#btnCancelSettings').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        modal.querySelector('#btnSaveSettings').addEventListener('click', () => {
            const fillNone = modal.querySelector('#setDefaultFillNone').checked;
            const settings = {
                defaultStroke: modal.querySelector('#setDefaultStroke').value,
                defaultFill: fillNone ? 'none' : modal.querySelector('#setDefaultFill').value,
                defaultUnit: modal.querySelector('#setDefaultUnit').value,
                defaultFontFamily: modal.querySelector('#setDefaultFont').value,
                defaultFontSize: parseFloat(modal.querySelector('#setDefaultFontSize').value) || 14,
                defaultTheme: modal.querySelector('#setDefaultTheme').value,
                invertScroll: modal.querySelector('#setInvertScroll').checked
            };
            storage.setItem('vc_editor_settings', settings);
            events.emit('settings:changed', settings);
            modal.remove();
        });
    }
}
