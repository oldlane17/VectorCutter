/**
 * VectorCutter - SVG Editor Components & Project Manager
 * Module: editor-components.js
 * Description: Multi-Component / Artboards (Component 1, 2, ...), Extract as Component,
 *              Read Me Project Notes Modal & Units & Settings Dialog
 */

(function() {
    Object.assign(SVGEditor.prototype, {
        initComponents() {
            this.components = JSON.parse(localStorage.getItem('vc_components') || '[]');
            if (this.components.length === 0) {
                this.components = [
                    { id: 'comp_1', name: 'Component 1', content: '' }
                ];
            }
            this.activeComponentId = this.components[0].id;

            this.setupComponentUI();
            this.setupProjectModals();
        },

        setupComponentUI() {
            const addBtn = document.getElementById('addComponentBtn');
            if (addBtn) {
                addBtn.addEventListener('click', () => this.addNewComponent());
            }

            this.renderComponentsList();
        },

        renderComponentsList() {
            const list = document.getElementById('sidebarComponentsList');
            if (!list) return;
            list.innerHTML = '';

            this.components.forEach((comp, idx) => {
                const item = document.createElement('div');
                item.className = `component-item ${comp.id === this.activeComponentId ? 'active' : ''}`;
                item.dataset.componentId = comp.id;
                item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; margin-bottom: 4px; border-radius: 4px; cursor: pointer; font-size: 12px; color: #ccc; background: ' + (comp.id === this.activeComponentId ? '#094771' : 'transparent') + ';';

                item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
                        <span>📄</span>
                        <span class="comp-name" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${comp.name}</span>
                    </div>
                    <div class="comp-actions" style="display: flex; gap: 4px; opacity: 0.7;">
                        <span class="comp-dup" title="Duplicate component" style="cursor: pointer; font-size: 11px;">📋</span>
                        ${this.components.length > 1 ? '<span class="comp-del" title="Delete component" style="cursor: pointer; font-size: 11px;">🗑️</span>' : ''}
                    </div>
                `;

                // Select component
                item.addEventListener('click', (e) => {
                    if (e.target.classList.contains('comp-del') || e.target.classList.contains('comp-dup')) return;
                    this.switchComponent(comp.id);
                });

                // Duplicate component
                const dupBtn = item.querySelector('.comp-dup');
                if (dupBtn) {
                    dupBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.duplicateComponent(comp.id);
                    });
                }

                // Delete component
                const delBtn = item.querySelector('.comp-del');
                if (delBtn) {
                    delBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.deleteComponent(comp.id);
                    });
                }

                // Double click to rename
                const nameSpan = item.querySelector('.comp-name');
                nameSpan.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    const newName = prompt('Rename component:', comp.name);
                    if (newName && newName.trim()) {
                        comp.name = newName.trim();
                        this.saveComponents();
                        this.renderComponentsList();
                    }
                });

                list.appendChild(item);
            });
        },

        saveCurrentComponentContent() {
            const current = this.components.find(c => c.id === this.activeComponentId);
            if (!current) return;

            const userElements = this.getUserElements();
            current.content = userElements.map(el => el.outerHTML).join('');
            this.saveComponents();
        },

        switchComponent(compId) {
            if (compId === this.activeComponentId) return;

            // Save current content first
            this.saveCurrentComponentContent();

            // Clear canvas elements
            this.clearSelection();
            const userElements = this.getUserElements();
            userElements.forEach(el => el.remove());

            // Switch active ID
            this.activeComponentId = compId;
            const target = this.components.find(c => c.id === compId);

            if (target && target.content) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${target.content}</svg>`, "image/svg+xml");
                const nodes = Array.from(doc.documentElement.childNodes);
                nodes.forEach(node => {
                    if (node.nodeType === 1) {
                        this.canvas.insertBefore(document.importNode(node, true), this.selectionGroup);
                    }
                });
            }

            this.history = [];
            this.historyIndex = -1;
            this.saveState();
            this.renderComponentsList();
            this.updateContextMenu();
            this.zoomToFitAll();
        },

        addNewComponent(name = null) {
            this.saveCurrentComponentContent();

            const count = this.components.length + 1;
            const newComp = {
                id: `comp_${Date.now()}`,
                name: name || `Component ${count}`,
                content: ''
            };

            this.components.push(newComp);
            this.saveComponents();
            this.switchComponent(newComp.id);
        },

        duplicateComponent(compId) {
            const comp = this.components.find(c => c.id === compId);
            if (!comp) return;

            if (compId === this.activeComponentId) {
                this.saveCurrentComponentContent();
            }

            const clonedComp = {
                id: `comp_${Date.now()}`,
                name: `${comp.name} Copy`,
                content: comp.content
            };

            this.components.push(clonedComp);
            this.saveComponents();
            this.renderComponentsList();
        },

        deleteComponent(compId) {
            if (this.components.length <= 1) return;
            if (!confirm('Delete this component and all its elements?')) return;

            const idx = this.components.findIndex(c => c.id === compId);
            if (idx === -1) return;

            this.components.splice(idx, 1);
            if (this.activeComponentId === compId) {
                this.activeComponentId = this.components[0].id;
                this.switchComponent(this.activeComponentId);
            } else {
                this.saveComponents();
                this.renderComponentsList();
            }
        },

        extractSelectionAsComponent() {
            if (!this.selectedElements || this.selectedElements.length === 0) {
                alert('Select elements to extract into a separate component.');
                return;
            }

            const compName = prompt('New Component Name:', `Component ${this.components.length + 1}`);
            if (!compName) return;

            const selectedContent = this.selectedElements.map(el => el.outerHTML).join('');
            
            // Remove from current canvas
            this.selectedElements.forEach(el => el.remove());
            this.clearSelection();
            this.saveState();

            // Create new component
            const newComp = {
                id: `comp_${Date.now()}`,
                name: compName.trim(),
                content: selectedContent
            };

            this.components.push(newComp);
            this.saveComponents();
            this.renderComponentsList();
            alert(`Extracted elements to new component "${compName}".`);
        },

        saveComponents() {
            localStorage.setItem('vc_components', JSON.stringify(this.components));
        },

        setupProjectModals() {
            // 1. Read Me / Project Notes Modal
            const readmeBtn = document.getElementById('projectReadmeBtn');
            if (readmeBtn) {
                readmeBtn.addEventListener('click', () => this.showReadmeModal());
            }

            // 2. Units & Settings Modal
            const settingsBtn = document.getElementById('projectSettingsBtn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => this.showUnitsSettingsModal());
            }
        },

        showReadmeModal() {
            let modal = document.getElementById('readmeModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'readmeModal';
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content" style="width: 580px; max-width: 95%;">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #3e3e42; padding-bottom:10px; margin-bottom:15px;">
                            <h2 style="margin:0; font-size:18px;">📝 Project Read Me & Notes</h2>
                            <button id="closeReadmeBtn" style="background:transparent; border:none; color:#aaa; font-size:22px; cursor:pointer;">&times;</button>
                        </div>
                        <p style="font-size:12px; color:#aaa; margin-bottom:10px;">Keep design instructions, laser power/speed settings, material notes, and assembly instructions with this project.</p>
                        <textarea id="projectNotesTextarea" rows="12" style="width:100%; box-sizing:border-box; background:#1e1e1e; border:1px solid #3e3e42; color:#fff; border-radius:4px; padding:10px; font-size:13px; font-family:monospace; resize:vertical;"></textarea>
                        <div class="modal-buttons" style="margin-top:15px; display:flex; justify-content:flex-end; gap:8px;">
                            <button id="saveReadmeBtn" style="background:#007acc; color:#fff; padding:6px 16px; border:none; border-radius:4px; cursor:pointer;">Save Notes</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                modal.querySelector('#closeReadmeBtn').addEventListener('click', () => modal.style.display = 'none');
                modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

                modal.querySelector('#saveReadmeBtn').addEventListener('click', () => {
                    const notes = modal.querySelector('#projectNotesTextarea').value;
                    localStorage.setItem('vc_project_notes', notes);
                    modal.style.display = 'none';
                });
            }

            modal.querySelector('#projectNotesTextarea').value = localStorage.getItem('vc_project_notes') || '';
            modal.style.display = 'flex';
        },

        showUnitsSettingsModal() {
            let modal = document.getElementById('unitsSettingsModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'unitsSettingsModal';
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content" style="width: 500px; max-width: 95%;">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #3e3e42; padding-bottom:10px; margin-bottom:15px;">
                            <h2 style="margin:0; font-size:18px;">⚙️ Units & Project Settings</h2>
                            <button id="closeUnitsSettingsBtn" style="background:transparent; border:none; color:#aaa; font-size:22px; cursor:pointer;">&times;</button>
                        </div>

                        <div class="property-group" style="margin-bottom:12px;">
                            <label style="display:block; font-size:12px; color:#aaa; margin-bottom:4px;">Display Units:</label>
                            <select id="modalUnitSelect" style="width:100%; padding:6px; background:#1e1e1e; border:1px solid #3e3e42; color:#fff; border-radius:4px;">
                                <option value="mm">Millimeters (mm)</option>
                                <option value="cm">Centimeters (cm)</option>
                                <option value="in">Inches (in)</option>
                                <option value="px">Pixels (px)</option>
                            </select>
                        </div>

                        <div class="property-group" style="margin-bottom:12px;">
                            <label style="display:block; font-size:12px; color:#aaa; margin-bottom:4px;">Grid Spacing (mm):</label>
                            <input type="number" id="modalGridSpacing" value="10" min="1" max="100" style="width:100%; padding:6px; background:#1e1e1e; border:1px solid #3e3e42; color:#fff; border-radius:4px;">
                        </div>

                        <div class="property-group" style="margin-bottom:12px;">
                            <label style="display:block; font-size:12px; color:#aaa; margin-bottom:4px;">Laser Kerf Default Compensation (mm):</label>
                            <input type="number" id="modalDefaultKerf" value="0.15" step="0.01" min="0" max="2" style="width:100%; padding:6px; background:#1e1e1e; border:1px solid #3e3e42; color:#fff; border-radius:4px;">
                        </div>

                        <div class="property-group" style="margin-bottom:15px;">
                            <label style="display:block; font-size:12px; color:#aaa; margin-bottom:4px;">Default Outline Stroke Width (mm):</label>
                            <input type="number" id="modalDefaultStroke" value="0.1" step="0.05" min="0.01" max="5" style="width:100%; padding:6px; background:#1e1e1e; border:1px solid #3e3e42; color:#fff; border-radius:4px;">
                        </div>

                        <div class="modal-buttons" style="display:flex; justify-content:flex-end; gap:8px;">
                            <button id="saveUnitsSettingsBtn" style="background:#007acc; color:#fff; padding:6px 16px; border:none; border-radius:4px; cursor:pointer;">Save Settings</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                modal.querySelector('#closeUnitsSettingsBtn').addEventListener('click', () => modal.style.display = 'none');
                modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

                modal.querySelector('#saveUnitsSettingsBtn').addEventListener('click', () => {
                    const unit = modal.querySelector('#modalUnitSelect').value;
                    const grid = parseFloat(modal.querySelector('#modalGridSpacing').value) || 10;
                    const kerf = parseFloat(modal.querySelector('#modalDefaultKerf').value) || 0.15;
                    const stroke = parseFloat(modal.querySelector('#modalDefaultStroke').value) || 0.1;

                    this.currentUnits = unit;
                    const unitSelector = document.getElementById('unitSelector');
                    if (unitSelector) unitSelector.value = unit;

                    this.gridSpacing = grid;
                    localStorage.setItem('vc_unit', unit);
                    localStorage.setItem('vc_grid_spacing', grid.toString());
                    localStorage.setItem('vc_default_kerf', kerf.toString());
                    localStorage.setItem('vc_default_stroke', stroke.toString());

                    this.updateGrid();
                    this.updateContextMenu();
                    modal.style.display = 'none';
                });
            }

            modal.querySelector('#modalUnitSelect').value = this.currentUnits || 'mm';
            modal.querySelector('#modalGridSpacing').value = localStorage.getItem('vc_grid_spacing') || '10';
            modal.querySelector('#modalDefaultKerf').value = localStorage.getItem('vc_default_kerf') || '0.15';
            modal.querySelector('#modalDefaultStroke').value = localStorage.getItem('vc_default_stroke') || '0.1';

            modal.style.display = 'flex';
        }
    });
})();
