/**
 * VectorCutter - Objects List Component (§2)
 * Live, reorderable z-order tree with visibility, lock, rename, and context actions.
 */

import { events } from '../core/events.js';
import { requestRender } from '../core/scheduler.js';
import { DeleteElementsCommand, AddElementCommand } from '../core/commands.js';
import { translationMatrix, multiplyMatrix } from '../model/matrix.js';
import { getRotationCentre, getElementLocalBounds } from '../model/bounds.js';

export class ObjectsPanel {
    constructor(containerEl, store) {
        this.container = containerEl;
        this.store = store;
        this.isCollapsed = false;
        this.draggedId = null;

        this.bindEvents();
    }

    bindEvents() {
        // Context menu listener for objects
        window.addEventListener('click', (e) => {
            const menu = document.getElementById('vcObjContextMenu');
            if (menu && !menu.contains(e.target)) {
                menu.remove();
            }
        });
    }

    render() {
        if (!this.container) return;

        const doc = this.store.doc;
        // Top-most element first in visual list (reverse of order array)
        const reversedIds = [...doc.order].reverse();

        let rowsHtml = '';
        reversedIds.forEach(id => {
            const el = doc.elements[id];
            if (!el) return;

            const isSelected = doc.selection.includes(id);
            const isVisible = el.visible !== false;
            const isLocked = !!el.locked;
            const name = el.name || `${this.capitalize(el.type)} ${id.slice(-4)}`;

            rowsHtml += `
                <div class="vc-object-row ${isSelected ? 'selected' : ''}" data-id="${id}" draggable="true">
                    <span class="vc-obj-icon">${this.getTypeIcon(el.type)}</span>
                    <span class="vc-obj-name" title="Double click to rename">${this.escapeHTML(name)}</span>
                    <div class="vc-obj-actions">
                        <button class="vc-obj-action-btn btn-vis" title="${isVisible ? 'Hide' : 'Show'}" data-action="toggle-vis">
                            ${isVisible ? 
                                '<svg class="vc-icon" style="width:12px;height:12px;" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' : 
                                '<svg class="vc-icon" style="width:12px;height:12px;opacity:0.4;" viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"/><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/></svg>'
                            }
                        </button>
                        <button class="vc-obj-action-btn btn-lock" title="${isLocked ? 'Unlock' : 'Lock'}" data-action="toggle-lock">
                            ${isLocked ? 
                                '<svg class="vc-icon" style="width:12px;height:12px;color:var(--vc-warning);" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' : 
                                '<svg class="vc-icon" style="width:12px;height:12px;opacity:0.4;" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>'
                            }
                        </button>
                    </div>
                </div>
            `;
        });

        this.container.innerHTML = `
            <div class="vc-objects-section">
                <div class="vc-objects-header" id="vcObjectsToggleHeader">
                    <span>OBJECTS (${doc.order.length})</span>
                    <span style="font-size:10px;transform:${this.isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'};transition:transform 0.15s;">▼</span>
                </div>
                <div class="vc-objects-list" id="vcObjectsListContainer" style="display:${this.isCollapsed ? 'none' : 'block'};">
                    ${rowsHtml || '<div style="padding:16px;text-align:center;font-size:11px;color:var(--vc-text-muted);">No objects in drawing</div>'}
                </div>
            </div>
        `;

        this.wireDomEvents();
    }

    wireDomEvents() {
        const header = this.container.querySelector('#vcObjectsToggleHeader');
        if (header) {
            header.addEventListener('click', () => {
                this.isCollapsed = !this.isCollapsed;
                this.render();
            });
        }

        const list = this.container.querySelector('#vcObjectsListContainer');
        if (!list) return;

        // Row interactions
        list.querySelectorAll('.vc-object-row').forEach(row => {
            const id = row.dataset.id;

            // Click selection
            row.addEventListener('click', (e) => {
                if (e.target.closest('.vc-obj-actions')) return;
                if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    const sel = new Set(this.store.doc.selection);
                    if (sel.has(id)) sel.delete(id);
                    else sel.add(id);
                    this.store.setSelection(Array.from(sel));
                } else {
                    this.store.setSelection([id]);
                }
            });

            // Double click rename
            const nameEl = row.querySelector('.vc-obj-name');
            nameEl?.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const el = this.store.getElement(id);
                if (!el) return;
                const oldName = el.name || `${this.capitalize(el.type)} ${id.slice(-4)}`;
                const input = document.createElement('input');
                input.value = oldName;
                nameEl.innerHTML = '';
                nameEl.appendChild(input);
                input.focus();
                input.select();

                const finishRename = () => {
                    const newName = input.value.trim() || oldName;
                    this.store.commit(`Rename object to ${newName}`, (doc) => {
                        if (doc.elements[id]) doc.elements[id].name = newName;
                    });
                    this.render();
                };

                input.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter') finishRename();
                    if (ev.key === 'Escape') this.render();
                });
                input.addEventListener('blur', finishRename);
            });

            // Visibility toggle
            row.querySelector('[data-action="toggle-vis"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.store.commit('Toggle Visibility', (doc) => {
                    const el = doc.elements[id];
                    if (el) el.visible = el.visible === false ? true : false;
                });
            });

            // Lock toggle
            row.querySelector('[data-action="toggle-lock"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.store.commit('Toggle Lock', (doc) => {
                    const el = doc.elements[id];
                    if (el) el.locked = !el.locked;
                });
            });

            // Drag and Drop reordering
            row.addEventListener('dragstart', (e) => {
                this.draggedId = id;
                e.dataTransfer.setData('text/plain', id);
                row.style.opacity = '0.5';
            });

            row.addEventListener('dragend', () => {
                this.draggedId = null;
                row.style.opacity = '1';
                list.querySelectorAll('.vc-object-row').forEach(r => r.classList.remove('drag-over'));
            });

            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                row.classList.add('drag-over');
            });

            row.addEventListener('dragleave', () => {
                row.classList.remove('drag-over');
            });

            row.addEventListener('drop', (e) => {
                e.preventDefault();
                row.classList.remove('drag-over');
                const targetId = id;
                if (!this.draggedId || this.draggedId === targetId) return;

                this.store.commit('Reorder Objects', (doc) => {
                    const fromIdx = doc.order.indexOf(this.draggedId);
                    const toIdx = doc.order.indexOf(targetId);
                    if (fromIdx !== -1 && toIdx !== -1) {
                        doc.order.splice(fromIdx, 1);
                        doc.order.splice(toIdx, 0, this.draggedId);
                    }
                });
            });

            // Right click context menu
            row.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(e.clientX, e.clientY, id);
            });
        });

        // Scroll selected row into view
        const firstSelectedId = this.store.doc.selection[0];
        if (firstSelectedId) {
            const selRow = list.querySelector(`[data-id="${firstSelectedId}"]`);
            if (selRow) {
                selRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }

    showContextMenu(x, y, id) {
        document.getElementById('vcObjContextMenu')?.remove();
        if (!this.store.doc.selection.includes(id)) {
            this.store.setSelection([id]);
        }

        const menu = document.createElement('div');
        menu.id = 'vcObjContextMenu';
        menu.className = 'vc-dropdown';
        menu.style.display = 'block';
        menu.style.position = 'fixed';
        menu.style.left = `${Math.min(x, window.innerWidth - 220)}px`;
        menu.style.top = `${Math.min(y, window.innerHeight - 200)}px`;
        menu.style.zIndex = '1000';

        menu.innerHTML = `
            <div class="vc-dropdown-item" id="ctxPrepare3D">Prepare for 3D...</div>
            <div class="vc-dropdown-item" id="ctxSetRotCenter">Set Rotation Centre...</div>
            <div class="vc-separator"></div>
            <div class="vc-dropdown-item" id="ctxDuplicate">Duplicate</div>
            <div class="vc-dropdown-item" id="ctxDelete">Delete</div>
            <div class="vc-separator"></div>
            <div class="vc-dropdown-item" id="ctxBringFront">Bring to Front</div>
            <div class="vc-dropdown-item" id="ctxSendBack">Send to Back</div>
        `;

        document.body.appendChild(menu);

        menu.querySelector('#ctxPrepare3D')?.addEventListener('click', () => {
            menu.remove();
            events.emit('open:tab', '3d');
        });

        menu.querySelector('#ctxSetRotCenter')?.addEventListener('click', () => {
            menu.remove();
            this.showRotationCenterModal(id);
        });

        menu.querySelector('#ctxDuplicate')?.addEventListener('click', () => {
            menu.remove();
            const el = this.store.getElement(id);
            if (!el) return;
            const clone = JSON.parse(JSON.stringify(el));
            clone.id = 'el_' + Math.random().toString(36).substr(2, 9);
            clone.name = (el.name || el.type) + ' Copy';
            clone.transform = multiplyMatrix(translationMatrix(10, 10), clone.transform);
            this.store.dispatch(new AddElementCommand(clone));
            this.store.setSelection([clone.id]);
        });

        menu.querySelector('#ctxDelete')?.addEventListener('click', () => {
            menu.remove();
            this.store.dispatch(new DeleteElementsCommand([id], this.store.doc));
            this.store.clearSelection();
        });

        menu.querySelector('#ctxBringFront')?.addEventListener('click', () => {
            menu.remove();
            this.store.commit('Bring to Front', (doc) => {
                const idx = doc.order.indexOf(id);
                if (idx !== -1) {
                    doc.order.splice(idx, 1);
                    doc.order.push(id);
                }
            });
        });

        menu.querySelector('#ctxSendBack')?.addEventListener('click', () => {
            menu.remove();
            this.store.commit('Send to Back', (doc) => {
                const idx = doc.order.indexOf(id);
                if (idx !== -1) {
                    doc.order.splice(idx, 1);
                    doc.order.unshift(id);
                }
            });
        });
    }

    showRotationCenterModal(id) {
        document.getElementById('vcRotCenterModal')?.remove();
        const el = this.store.getElement(id);
        if (!el) return;

        const currentRot = el.rotationCenter || null;
        const initialMode = currentRot ? currentRot.mode : 'object';
        const defaultCenter = getRotationCentre(el);
        const defaultX = currentRot ? currentRot.x : (initialMode === 'object' ? 0 : defaultCenter.x);
        const defaultY = currentRot ? currentRot.y : (initialMode === 'object' ? 0 : defaultCenter.y);

        const card = document.createElement('div');
        card.id = 'vcRotCenterModal';
        card.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%, -50%);background:var(--vc-bg-surface-1);border:1px solid var(--vc-border-default);border-radius:8px;padding:16px;z-index:9999;box-shadow:0 10px 30px rgba(0,0,0,0.5);width:300px;font-family:sans-serif;font-size:12px;color:var(--vc-text-primary);';

        card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-weight:bold;">
                <span>ROTATION CENTRE</span>
                <span id="closeRotCenter" style="cursor:pointer;font-size:16px;color:var(--vc-text-muted);">&times;</span>
            </div>
            <div style="margin-bottom:8px;">
                <label style="display:block;margin-bottom:2px;color:var(--vc-text-muted);">X (mm)</label>
                <input type="number" id="rotCenterX" value="${defaultX.toFixed(1)}" step="1" style="width:100%;height:28px;background:var(--vc-bg-surface-2);border:1px solid var(--vc-border-default);border-radius:4px;color:var(--vc-text-primary);padding:0 8px;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block;margin-bottom:2px;color:var(--vc-text-muted);">Y (mm)</label>
                <input type="number" id="rotCenterY" value="${defaultY.toFixed(1)}" step="1" style="width:100%;height:28px;background:var(--vc-bg-surface-2);border:1px solid var(--vc-border-default);border-radius:4px;color:var(--vc-text-primary);padding:0 8px;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:14px;">
                <div style="margin-bottom:6px;color:var(--vc-text-muted);">Reference:</div>
                <label style="display:flex;align-items:center;gap:6px;margin-bottom:4px;cursor:pointer;">
                    <input type="radio" name="rotCenterMode" value="object" ${initialMode === 'object' ? 'checked' : ''}>
                    Relative to object
                </label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                    <input type="radio" name="rotCenterMode" value="absolute" ${initialMode === 'absolute' ? 'checked' : ''}>
                    Absolute document coordinates
                </label>
            </div>
            <div style="display:flex;justify-content:space-between;gap:8px;">
                <button id="btnResetRotCenter" style="flex:1;height:28px;background:var(--vc-bg-surface-2);border:1px solid var(--vc-border-default);color:var(--vc-text-primary);border-radius:4px;cursor:pointer;">Reset</button>
                <button id="btnApplyRotCenter" style="flex:1;height:28px;background:var(--vc-accent-blue);border:none;color:#fff;border-radius:4px;cursor:pointer;font-weight:bold;">Apply</button>
            </div>
        `;

        document.body.appendChild(card);

        const close = () => card.remove();
        card.querySelector('#closeRotCenter')?.addEventListener('click', close);

        card.querySelector('#btnResetRotCenter')?.addEventListener('click', () => {
            this.store.commit('Reset Rotation Centre to Mass Centre', doc => {
                if (doc.elements[id]) {
                    delete doc.elements[id].rotationCenter;
                }
            });
            requestRender();
            close();
        });

        card.querySelector('#btnApplyRotCenter')?.addEventListener('click', () => {
            const x = parseFloat(card.querySelector('#rotCenterX')?.value) || 0;
            const y = parseFloat(card.querySelector('#rotCenterY')?.value) || 0;
            const mode = card.querySelector('input[name="rotCenterMode"]:checked')?.value || 'object';

            this.store.commit('Set Rotation Centre', doc => {
                if (doc.elements[id]) {
                    doc.elements[id].rotationCenter = { mode, x, y };
                }
            });
            requestRender();
            close();
        });
    }

    getTypeIcon(type) {
        switch (type) {
            case 'rect': return '<svg class="vc-icon" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1"/></svg>';
            case 'circle': return '<svg class="vc-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>';
            case 'ellipse': return '<svg class="vc-icon" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="9" ry="5"/></svg>';
            case 'polygon': return '<svg class="vc-icon" viewBox="0 0 24 24"><path d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z"/></svg>';
            case 'star': return '<svg class="vc-icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
            case 'line': return '<svg class="vc-icon" viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4"/></svg>';
            case 'text': return '<svg class="vc-icon" viewBox="0 0 24 24"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>';
            case 'group': return '<svg class="vc-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>';
            default: return '<svg class="vc-icon" viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>';
        }
    }

    capitalize(s) {
        if (!s) return '';
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    escapeHTML(str) {
        return (str || '').replace(/[&<>'"]/g, tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag));
    }
}
