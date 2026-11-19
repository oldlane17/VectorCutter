/**
 * VectorCutter - SVG Editor Quality of Life (QoL) Enhancements
 * Module: editor-qol.js
 * Description: Command Palette (Ctrl+K), Shortcuts Cheatsheet (?), Custom Context Menu,
 *              Floating Selection Dimension Badges, and Status Bar Coordinates
 */

(function() {
    Object.assign(SVGEditor.prototype, {
        initQoL() {
            this.setupCommandPalette();
            this.setupShortcutsCheatsheet();
            this.setupCustomContextMenu();
            this.setupCanvasDimensionBadge();
            this.setupStatusBar();
        },

        // --- 1. COMMAND PALETTE (Ctrl+K) ---
        setupCommandPalette() {
            let modal = document.getElementById('commandPaletteModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'commandPaletteModal';
                modal.className = 'modal';
                modal.style.alignItems = 'flex-start';
                modal.style.paddingTop = '80px';
                modal.innerHTML = `
                    <div class="modal-content" style="width: 540px; max-width: 95%; background: #252528; border: 1px solid #007acc; box-shadow: 0 10px 30px rgba(0,0,0,0.6); padding: 0; overflow: hidden; border-radius: 6px;">
                        <div style="padding: 10px 14px; border-bottom: 1px solid #3e3e42; display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 16px; color: #007acc;">🔍</span>
                            <input type="text" id="commandPaletteInput" placeholder="Type a command or search tools (e.g. weld, rotate, text, dxf)..." style="flex: 1; background: transparent; border: none; color: #fff; font-size: 14px; outline: none;">
                            <span style="font-size: 11px; color: #888; background: #1e1e1e; padding: 2px 6px; border-radius: 4px;">ESC to close</span>
                        </div>
                        <div id="commandPaletteList" style="max-height: 320px; overflow-y: auto; padding: 6px 0;">
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                modal.addEventListener('click', (e) => {
                    if (e.target === modal) modal.style.display = 'none';
                });

                const input = modal.querySelector('#commandPaletteInput');
                input.addEventListener('input', (e) => this.filterCommands(e.target.value));
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') modal.style.display = 'none';
                    if (e.key === 'Enter') {
                        const firstItem = modal.querySelector('.palette-item');
                        if (firstItem) firstItem.click();
                    }
                });
            }

            // Global Ctrl+K trigger
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                    e.preventDefault();
                    this.showCommandPalette();
                }
            });
        },

        getCommandsList() {
            return [
                { name: 'Select Tool', shortcut: 'V', action: () => this.setCanvasMode('select') },
                { name: 'Rectangle Tool', shortcut: 'R', action: () => { const b = document.querySelector('.tool[data-tool="rectangle"]'); if (b) b.click(); } },
                { name: 'Circle Tool', shortcut: 'C', action: () => { const b = document.querySelector('.tool[data-tool="circle"]'); if (b) b.click(); } },
                { name: 'Pen / Path Tool', shortcut: 'P', action: () => { const b = document.querySelector('.tool[data-tool="path"]'); if (b) b.click(); } },
                { name: 'Text Tool', shortcut: 'T', action: () => { const b = document.querySelector('.tool[data-tool="text"]'); if (b) b.click(); } },
                { name: 'Node / Curve Edit', shortcut: 'N', action: () => { const b = document.querySelector('.tool[data-tool="curve"]'); if (b) b.click(); } },
                { name: 'Rotate 90° Clockwise', shortcut: 'Ctrl+Shift+R', action: () => this.rotateExact90(90) },
                { name: 'Rotate 90° Counter-Clockwise', shortcut: '', action: () => this.rotateExact90(-90) },
                { name: 'Rotate 180°', shortcut: '', action: () => this.rotateExact180() },
                { name: 'Flip Horizontal', shortcut: '', action: () => this.flipHorizontal() },
                { name: 'Flip Vertical', shortcut: '', action: () => this.flipVertical() },
                { name: 'Boolean Union (Weld)', shortcut: '', action: () => this.booleanUnion() },
                { name: 'Boolean Difference', shortcut: '', action: () => this.booleanDifference() },
                { name: 'Boolean Intersect', shortcut: '', action: () => this.booleanIntersect() },
                { name: 'Boolean Exclude (XOR)', shortcut: '', action: () => this.booleanExclude() },
                { name: 'Kerf Offset (Inset/Outset)...', shortcut: '', action: () => this.applyKerfOffset() },
                { name: 'Outline Stroke', shortcut: '', action: () => this.outlineStroke() },
                { name: 'Linear Repeat Pattern', shortcut: '', action: () => this.linearRepeat() },
                { name: 'Rotational Repeat Pattern', shortcut: '', action: () => this.rotationalRepeat() },
                { name: 'Grid / Tile Repeat Pattern', shortcut: '', action: () => this.gridRepeat() },
                { name: 'Sheet Nesting (Shelf Packing)', shortcut: '', action: () => this.nestElementsOnSheet() },
                { name: 'Trace Image to Vector (Beta)', shortcut: '', action: () => this.showTraceModal() },
                { name: 'Browse Shape Library...', shortcut: '', action: () => this.showShapeLibraryModal() },
                { name: 'Zoom to Fit All', shortcut: 'Ctrl+Shift+F', action: () => this.zoomToFitAll() },
                { name: 'Zoom to Real Size (1:1 mm)', shortcut: 'Ctrl+0', action: () => this.zoomToRealSize() },
                { name: 'Calibrate Screen 1:1...', shortcut: '', action: () => this.showCalibrateScreenDialog() },
                { name: 'Export SVG (Laser Ready)', shortcut: 'Ctrl+S', action: () => this.saveSVG() },
                { name: 'Export DXF (AutoCAD R12)', shortcut: '', action: () => this.exportDXF() },
                { name: 'Export PNG Image', shortcut: '', action: () => this.exportPNG() },
                { name: 'Project Read Me / Notes', shortcut: '', action: () => this.showReadmeModal() },
                { name: 'Units & Project Settings', shortcut: '', action: () => this.showUnitsSettingsModal() },
                { name: 'Toggle Laser Cutting Mode', shortcut: '', action: () => this.toggleLaserMode() }
            ];
        },

        showCommandPalette() {
            const modal = document.getElementById('commandPaletteModal');
            if (!modal) return;
            const input = modal.querySelector('#commandPaletteInput');
            input.value = '';
            this.filterCommands('');
            modal.style.display = 'flex';
            setTimeout(() => input.focus(), 50);
        },

        filterCommands(query = '') {
            const list = document.getElementById('commandPaletteList');
            if (!list) return;
            list.innerHTML = '';

            const q = query.toLowerCase().trim();
            const commands = this.getCommandsList();
            const filtered = commands.filter(c => !q || c.name.toLowerCase().includes(q));

            filtered.forEach(cmd => {
                const item = document.createElement('div');
                item.className = 'palette-item';
                item.style.cssText = 'padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; color: #ddd; font-size: 13px; transition: background 0.1s;';
                item.innerHTML = `
                    <span>${cmd.name}</span>
                    ${cmd.shortcut ? `<span style="font-size: 11px; color: #888; background: #1e1e1e; padding: 2px 6px; border-radius: 3px;">${cmd.shortcut}</span>` : ''}
                `;

                item.addEventListener('mouseenter', () => item.style.background = '#094771');
                item.addEventListener('mouseleave', () => item.style.background = 'transparent');
                item.addEventListener('click', () => {
                    document.getElementById('commandPaletteModal').style.display = 'none';
                    cmd.action();
                });

                list.appendChild(item);
            });
        },

        // --- 2. SHORTCUTS CHEATSHEET MODAL (?) ---
        setupShortcutsCheatsheet() {
            document.addEventListener('keydown', (e) => {
                if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                    e.preventDefault();
                    this.showShortcutsCheatsheet();
                }
            });
        },

        showShortcutsCheatsheet() {
            let modal = document.getElementById('shortcutsCheatsheetModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'shortcutsCheatsheetModal';
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content" style="width: 640px; max-width: 95%; max-height: 85vh; display: flex; flex-direction: column;">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #3e3e42; padding-bottom:10px; margin-bottom:15px;">
                            <h2 style="margin:0; font-size:18px;">⌨️ Keyboard Shortcuts</h2>
                            <button id="closeShortcutsBtn" style="background:transparent; border:none; color:#aaa; font-size:22px; cursor:pointer;">&times;</button>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px; overflow-y: auto; font-size: 12px; color: #ccc;">
                            <div>
                                <h4 style="color:#007acc; margin-bottom:8px;">Tools & Navigation</h4>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Select tool</span> <kbd>V</kbd></div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Node / Curve edit</span> <kbd>N</kbd></div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Pen / Path tool</span> <kbd>P</kbd></div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Rectangle tool</span> <kbd>R</kbd></div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Circle tool</span> <kbd>C</kbd></div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Text tool</span> <kbd>T</kbd></div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Pan canvas</span> <kbd>Space + Drag</kbd></div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Zoom In / Out</span> <kbd>+ / -</kbd></div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Real Size (1:1 mm)</span> <kbd>Ctrl + 0</kbd></div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Fit Selected / All</span> <kbd>Ctrl+F / Ctrl+Shift+F</kbd></div>
                            </div>
                            <div>
                                <h4 style="color:#007acc; margin-bottom:8px;">Editing & Selection</h4>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Undo / Redo</span> <kbd>Ctrl+Z / Ctrl+Y</kbd></div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Duplicate</span> <kbd>Ctrl + D</kbd></div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Delete</span> <kbd>Del / Backspace</kbd></div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Group / Ungroup</span> <kbd>Ctrl+G / Ctrl+Shift+G</kbd></div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Select All</span> <kbd>Ctrl + A</kbd></div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Command Palette</span> <kbd>Ctrl + K</kbd></div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Rotate 90° Exact</span> <kbd>Quickbar 90°</kbd></div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Export SVG</span> <kbd>Ctrl + S</kbd></div>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                modal.querySelector('#closeShortcutsBtn').addEventListener('click', () => modal.style.display = 'none');
                modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
            }

            modal.style.display = 'flex';
        },

        // --- 3. CUSTOM RIGHT-CLICK CONTEXT MENU ---
        setupCustomContextMenu() {
            let menu = document.getElementById('canvasContextMenu');
            if (!menu) {
                menu = document.createElement('div');
                menu.id = 'canvasContextMenu';
                menu.style.cssText = 'position: fixed; display: none; z-index: 10000; background: #252528; border: 1px solid #3e3e42; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.5); padding: 4px 0; min-width: 170px; font-size: 12px; color: #ccc;';

                menu.innerHTML = `
                    <div class="ctx-item" data-action="undo" style="padding: 6px 14px; cursor: pointer;">Undo (Ctrl+Z)</div>
                    <div class="ctx-item" data-action="redo" style="padding: 6px 14px; cursor: pointer;">Redo (Ctrl+Y)</div>
                    <div style="height: 1px; background: #3e3e42; margin: 4px 0;"></div>
                    <div class="ctx-item" data-action="cut" style="padding: 6px 14px; cursor: pointer;">Cut (Ctrl+X)</div>
                    <div class="ctx-item" data-action="copy" style="padding: 6px 14px; cursor: pointer;">Copy (Ctrl+C)</div>
                    <div class="ctx-item" data-action="paste" style="padding: 6px 14px; cursor: pointer;">Paste (Ctrl+V)</div>
                    <div class="ctx-item" data-action="duplicate" style="padding: 6px 14px; cursor: pointer;">Duplicate (Ctrl+D)</div>
                    <div class="ctx-item" data-action="delete" style="padding: 6px 14px; cursor: pointer;">Delete (Del)</div>
                    <div style="height: 1px; background: #3e3e42; margin: 4px 0;"></div>
                    <div class="ctx-item" data-action="group" style="padding: 6px 14px; cursor: pointer;">Group (Ctrl+G)</div>
                    <div class="ctx-item" data-action="ungroup" style="padding: 6px 14px; cursor: pointer;">Ungroup (Ctrl+Shift+G)</div>
                    <div class="ctx-item" data-action="rot90" style="padding: 6px 14px; cursor: pointer;">Rotate 90° CW</div>
                    <div class="ctx-item" data-action="fliph" style="padding: 6px 14px; cursor: pointer;">Flip Horizontal</div>
                    <div style="height: 1px; background: #3e3e42; margin: 4px 0;"></div>
                    <div class="ctx-item" data-action="weld" style="padding: 6px 14px; cursor: pointer;">Boolean Union (Weld)</div>
                    <div class="ctx-item" data-action="diff" style="padding: 6px 14px; cursor: pointer;">Boolean Difference</div>
                `;
                document.body.appendChild(menu);

                menu.querySelectorAll('.ctx-item').forEach(item => {
                    item.addEventListener('mouseenter', () => item.style.background = '#094771');
                    item.addEventListener('mouseleave', () => item.style.background = 'transparent');
                    item.addEventListener('click', () => {
                        menu.style.display = 'none';
                        const action = item.dataset.action;
                        if (action === 'undo') this.undo();
                        else if (action === 'redo') this.redo();
                        else if (action === 'cut') this.cutSelection();
                        else if (action === 'copy') this.copySelection();
                        else if (action === 'paste') this.pasteFromClipboard();
                        else if (action === 'duplicate') this.duplicateSelected();
                        else if (action === 'delete') this.deleteSelectedElements();
                        else if (action === 'group') this.groupSelected();
                        else if (action === 'ungroup') this.ungroupSelected();
                        else if (action === 'rot90') this.rotateExact90(90);
                        else if (action === 'fliph') this.flipHorizontal();
                        else if (action === 'weld') this.booleanUnion();
                        else if (action === 'diff') this.booleanDifference();
                    });
                });

                document.addEventListener('click', () => menu.style.display = 'none');
            }

            this.canvasContainer.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                menu.style.left = `${e.clientX}px`;
                menu.style.top = `${e.clientY}px`;
                menu.style.display = 'block';
            });
        },

        // --- 4. FLOATING SELECTION DIMENSION BADGES (W × H mm like Cuttle) ---
        setupCanvasDimensionBadge() {
            let badge = document.getElementById('canvasSelectionBadge');
            if (!badge) {
                badge = document.createElement('div');
                badge.id = 'canvasSelectionBadge';
                badge.style.cssText = 'position: absolute; display: none; pointer-events: none; background: rgba(0, 122, 204, 0.9); color: #fff; font-size: 11px; font-weight: 500; padding: 2px 6px; border-radius: 3px; z-index: 50; white-space: nowrap; transform: translate(-50%, -100%); margin-top: -6px;';
                this.canvasContainer.appendChild(badge);
            }
        },

        updateCanvasDimensionBadge() {
            const badge = document.getElementById('canvasSelectionBadge');
            if (!badge) return;

            if (!this.selectedElements || this.selectedElements.length === 0) {
                badge.style.display = 'none';
                return;
            }

            const bbox = this.getGroupBoundingBox();
            if (!bbox) {
                badge.style.display = 'none';
                return;
            }

            // Convert to screen coordinates
            const factor = this.unitFactors[this.currentUnits] || 3.7795;
            const wMm = (bbox.width / factor).toFixed(1);
            const hMm = (bbox.height / factor).toFixed(1);

            const pt1 = this.svgPointToScreen(bbox.x + bbox.width / 2, bbox.y);
            const containerRect = this.canvasContainer.getBoundingClientRect();

            badge.textContent = `${wMm} × ${hMm} ${this.currentUnits}`;
            badge.style.left = `${pt1.x - containerRect.left}px`;
            badge.style.top = `${pt1.y - containerRect.top}px`;
            badge.style.display = 'block';
        },

        // --- 5. STATUS BAR COORDINATES ---
        setupStatusBar() {
            let bar = document.getElementById('editorStatusBar');
            if (!bar) {
                bar = document.createElement('div');
                bar.id = 'editorStatusBar';
                bar.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #181818; border-top: 1px solid #2d2d30; padding: 3px 12px; font-size: 11px; color: #888; z-index: 100;';
                bar.innerHTML = `
                    <div style="display:flex; gap: 15px;">
                        <span id="statusCursorCoords">X: 0.0 mm | Y: 0.0 mm</span>
                        <span id="statusSelectionSize">No selection</span>
                    </div>
                    <div style="display:flex; gap: 15px;">
                        <span id="statusZoomLevel">Zoom: 100%</span>
                        <span id="statusScrollMode">Trackpad Mode</span>
                    </div>
                `;
                document.body.appendChild(bar);
            }

            this.canvasContainer.addEventListener('mousemove', (e) => {
                const pt = this.getSVGCoordinates(e);
                const factor = this.unitFactors[this.currentUnits] || 3.7795;
                const xMm = (pt.x / factor).toFixed(1);
                const yMm = (pt.y / factor).toFixed(1);

                const coords = document.getElementById('statusCursorCoords');
                if (coords) coords.textContent = `X: ${xMm} mm | Y: ${yMm} mm`;
            });
        }
    });
})();
