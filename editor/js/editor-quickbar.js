/**
 * VectorCutter - SVG Editor Quick-Tools Bar
 * Module: editor-quickbar.js
 * Description: Floating Pill Toolbar, Selection Actions, Alignment, Distribution & Quick Transforms
 */

Object.assign(SVGEditor.prototype, {
    initQuickbar() {
        // Create Quickbar container if not already in DOM
        if (document.getElementById('quickToolbar')) return;

        const quickbar = document.createElement('div');
        quickbar.id = 'quickToolbar';
        quickbar.className = 'quick-toolbar';
        quickbar.setAttribute('role', 'toolbar');
        quickbar.setAttribute('aria-label', 'Quick Actions Toolbar');

        quickbar.innerHTML = `
            <div class="quick-drag-handle" id="quickDragHandle" title="Drag to move toolbar">
                <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
                    <circle cx="3" cy="3" r="1.5"/><circle cx="9" cy="3" r="1.5"/>
                    <circle cx="3" cy="9" r="1.5"/><circle cx="9" cy="9" r="1.5"/>
                    <circle cx="3" cy="15" r="1.5"/><circle cx="9" cy="15" r="1.5"/>
                </svg>
            </div>

            <div class="quick-toolbar-content" id="quickContent">
                <!-- Zone 1: Tool Switch -->
                <div class="quick-group tools-group">
                    <button class="quick-btn active" id="quickToolSelect" data-tool="select" title="Select (V)">
                        <img src="sidebar/select.svg" alt="Select">
                    </button>
                    <button class="quick-btn" id="quickToolNode" data-tool="curve" title="Node Edit (N)">
                        <img src="sidebar/curve.svg" alt="Node Edit">
                    </button>
                    <button class="quick-btn" id="quickToolPen" data-tool="path" title="Pen Tool (P)">
                        <img src="sidebar/path.svg" alt="Pen">
                    </button>
                    <button class="quick-btn" id="quickToolRect" data-tool="rectangle" title="Rectangle (R)">
                        <img src="sidebar/rectangle.svg" alt="Rect">
                    </button>
                    <button class="quick-btn" id="quickToolCircle" data-tool="circle" title="Circle (C)">
                        <img src="sidebar/circle.svg" alt="Circle">
                    </button>
                    <button class="quick-btn" id="quickToolText" data-tool="text" title="Text (T)">
                        <img src="sidebar/text.svg" alt="Text">
                    </button>
                </div>

                <div class="quick-divider"></div>

                <!-- Zone 2: Selection Actions -->
                <div class="quick-group actions-group">
                    <!-- Rotate 90 CCW -->
                    <button class="quick-btn selection-action" id="quickRotateCCW" title="Rotate 90° CCW" disabled>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                        </svg>
                    </button>
                    <!-- Rotate 90 CW -->
                    <button class="quick-btn selection-action" id="quickRotateCW" title="Rotate 90° CW" disabled>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                            <path d="M21 3v5h-5"/>
                        </svg>
                    </button>
                    <!-- Rotate 180 -->
                    <button class="quick-btn selection-action" id="quickRotate180" title="Rotate 180°" disabled>
                        <span style="font-size:11px; font-weight:bold;">180°</span>
                    </button>
                    <!-- Flip Horizontal -->
                    <button class="quick-btn selection-action" id="quickFlipH" title="Flip Horizontal" disabled>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/>
                            <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/>
                            <line x1="12" y1="2" x2="12" y2="22"/>
                        </svg>
                    </button>
                    <!-- Flip Vertical -->
                    <button class="quick-btn selection-action" id="quickFlipV" title="Flip Vertical" disabled>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 8V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"/>
                            <path d="M3 16v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/>
                            <line x1="2" y1="12" x2="22" y2="12"/>
                        </svg>
                    </button>

                    <div class="quick-divider"></div>

                    <!-- Duplicate -->
                    <button class="quick-btn selection-action" id="quickDuplicate" title="Duplicate (Ctrl+D)" disabled>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                    </button>
                    <!-- Delete -->
                    <button class="quick-btn selection-action" id="quickDelete" title="Delete (Del)" disabled>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                    <!-- Group / Ungroup -->
                    <button class="quick-btn selection-action" id="quickGroup" title="Group (Ctrl+G)" disabled>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="7" height="7"/>
                            <rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/>
                            <rect x="3" y="14" width="7" height="7"/>
                        </svg>
                    </button>
                    <button class="quick-btn selection-action" id="quickUngroup" title="Ungroup (Ctrl+Shift+G)" disabled>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M8 8V3h8v5"/>
                            <path d="M8 16v5h8v-5"/>
                            <line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="2 2"/>
                        </svg>
                    </button>
                    <!-- Order: Front / Back -->
                    <button class="quick-btn selection-action" id="quickBringFront" title="Bring to Front" disabled>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                            <polyline points="2 17 12 22 22 17"/>
                            <polyline points="2 12 12 17 22 12"/>
                        </svg>
                    </button>
                    <button class="quick-btn selection-action" id="quickSendBack" title="Send to Back" disabled>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(180deg);">
                            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                            <polyline points="2 17 12 22 22 17"/>
                            <polyline points="2 12 12 17 22 12"/>
                        </svg>
                    </button>

                    <div class="quick-divider"></div>

                    <!-- Align Dropdown Trigger -->
                    <div class="quick-dropdown-container">
                        <button class="quick-btn selection-action" id="quickAlignDropdownBtn" title="Align & Distribute" disabled>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="21" y1="10" x2="3" y2="10"/>
                                <line x1="21" y1="6" x2="3" y2="6"/>
                                <line x1="21" y1="14" x2="3" y2="14"/>
                                <line x1="21" y1="18" x2="3" y2="18"/>
                            </svg>
                        </button>
                        <div class="quick-dropdown-menu" id="quickAlignMenu">
                            <div class="quick-menu-header">ALIGN (SELECTION)</div>
                            <div class="quick-menu-item" data-align="left">Align Left</div>
                            <div class="quick-menu-item" data-align="center">Align Horizontal Center</div>
                            <div class="quick-menu-item" data-align="right">Align Right</div>
                            <div class="quick-menu-item" data-align="top">Align Top</div>
                            <div class="quick-menu-item" data-align="middle">Align Vertical Middle</div>
                            <div class="quick-menu-item" data-align="bottom">Align Bottom</div>
                            <div class="quick-menu-separator"></div>
                            <div class="quick-menu-header">DISTRIBUTE (≥ 3 ITEMS)</div>
                            <div class="quick-menu-item" data-distribute="horizontal">Distribute Horizontally</div>
                            <div class="quick-menu-item" data-distribute="vertical">Distribute Vertically</div>
                            <div class="quick-menu-separator"></div>
                            <div class="quick-menu-item" id="quickCenterOrigin">Center on Origin (0, 0)</div>
                            <div class="quick-menu-item" id="quickMatchWidth">Match Width (to 1st)</div>
                            <div class="quick-menu-item" id="quickMatchHeight">Match Height (to 1st)</div>
                            <div class="quick-menu-item" id="quickConvertToPaths">Convert to Paths</div>
                        </div>
                    </div>

                    <!-- Snap Toggle -->
                    <button class="quick-btn" id="quickSnapToggle" title="Toggle Snap">
                        <img src="sidebar/snap.svg" alt="Snap">
                    </button>
                </div>
            </div>

            <!-- Collapse Button -->
            <button class="quick-btn quick-collapse-btn" id="quickCollapseBtn" title="Collapse / Expand Toolbar">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="18 15 12 9 6 15"/>
                </svg>
            </button>
        `;

        this.canvasContainer.appendChild(quickbar);
        this.bindQuickbarEvents();
        this.restoreQuickbarPosition();
    },

    bindQuickbarEvents() {
        const quickbar = document.getElementById('quickToolbar');
        const dragHandle = document.getElementById('quickDragHandle');
        const collapseBtn = document.getElementById('quickCollapseBtn');
        const alignBtn = document.getElementById('quickAlignDropdownBtn');
        const alignMenu = document.getElementById('quickAlignMenu');

        // Tool switches
        quickbar.querySelectorAll('.tools-group .quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                if (!tool) return;
                
                // Trigger sidebar tool click
                const sidebarTool = document.querySelector(`.tool[data-tool="${tool}"]`);
                if (sidebarTool) {
                    sidebarTool.click();
                } else {
                    this.currentTool = tool;
                    this.updateCanvasCursor();
                }
                this.updateQuickbarActiveTool();
            });
        });

        // Collapse / Expand
        if (collapseBtn) {
            collapseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                quickbar.classList.toggle('collapsed');
                const isCollapsed = quickbar.classList.contains('collapsed');
                localStorage.setItem('vc_quickbar_collapsed', isCollapsed ? 'true' : 'false');
                collapseBtn.querySelector('svg').style.transform = isCollapsed ? 'rotate(180deg)' : 'none';
            });

            if (localStorage.getItem('vc_quickbar_collapsed') === 'true') {
                quickbar.classList.add('collapsed');
                collapseBtn.querySelector('svg').style.transform = 'rotate(180deg)';
            }
        }

        // Draggable Quickbar
        let isDraggingBar = false;
        let startX, startY, initialLeft, initialTop;

        dragHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDraggingBar = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = quickbar.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            quickbar.style.transform = 'none'; // Clear translate(-50%)
            quickbar.style.left = `${initialLeft}px`;
            quickbar.style.top = `${initialTop}px`;
            dragHandle.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDraggingBar) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const newLeft = Math.max(10, Math.min(window.innerWidth - quickbar.offsetWidth - 10, initialLeft + dx));
            const newTop = Math.max(10, Math.min(window.innerHeight - quickbar.offsetHeight - 10, initialTop + dy));
            quickbar.style.left = `${newLeft}px`;
            quickbar.style.top = `${newTop}px`;
        });

        window.addEventListener('mouseup', () => {
            if (isDraggingBar) {
                isDraggingBar = false;
                dragHandle.style.cursor = 'grab';
                localStorage.setItem('vc_quickbar_pos', JSON.stringify({
                    left: quickbar.style.left,
                    top: quickbar.style.top
                }));
            }
        });

        // Align menu toggle
        if (alignBtn && alignMenu) {
            alignBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = alignMenu.classList.contains('show');
                document.querySelectorAll('.quick-dropdown-menu').forEach(m => m.classList.remove('show'));
                if (!isOpen) alignMenu.classList.add('show');
            });

            document.addEventListener('click', (e) => {
                if (!quickbar.contains(e.target)) {
                    alignMenu.classList.remove('show');
                }
            });

            alignMenu.querySelectorAll('[data-align]').forEach(item => {
                item.addEventListener('click', () => {
                    this.alignSelected(item.dataset.align);
                    alignMenu.classList.remove('show');
                });
            });

            alignMenu.querySelectorAll('[data-distribute]').forEach(item => {
                item.addEventListener('click', () => {
                    this.distributeSelected(item.dataset.distribute);
                    alignMenu.classList.remove('show');
                });
            });

            const centerOrigin = document.getElementById('quickCenterOrigin');
            if (centerOrigin) {
                centerOrigin.addEventListener('click', () => {
                    this.centerOnOrigin();
                    alignMenu.classList.remove('show');
                });
            }

            const matchW = document.getElementById('quickMatchWidth');
            if (matchW) {
                matchW.addEventListener('click', () => {
                    this.matchSelectedSize('width');
                    alignMenu.classList.remove('show');
                });
            }

            const matchH = document.getElementById('quickMatchHeight');
            if (matchH) {
                matchH.addEventListener('click', () => {
                    this.matchSelectedSize('height');
                    alignMenu.classList.remove('show');
                });
            }

            const convertPaths = document.getElementById('quickConvertToPaths');
            if (convertPaths) {
                convertPaths.addEventListener('click', () => {
                    this.convertSelectionToPaths();
                    alignMenu.classList.remove('show');
                });
            }
        }

        // Selection Action Buttons
        const btnCCW = document.getElementById('quickRotateCCW');
        if (btnCCW) btnCCW.addEventListener('click', () => this.rotateExact90(false));

        const btnCW = document.getElementById('quickRotateCW');
        if (btnCW) btnCW.addEventListener('click', () => this.rotateExact90(true));

        const btn180 = document.getElementById('quickRotate180');
        if (btn180) btn180.addEventListener('click', () => this.rotateExact180());

        const btnFlipH = document.getElementById('quickFlipH');
        if (btnFlipH) btnFlipH.addEventListener('click', () => this.flipHorizontal());

        const btnFlipV = document.getElementById('quickFlipV');
        if (btnFlipV) btnFlipV.addEventListener('click', () => this.flipVertical());

        const btnDup = document.getElementById('quickDuplicate');
        if (btnDup) btnDup.addEventListener('click', () => this.duplicateSelected());

        const btnDel = document.getElementById('quickDelete');
        if (btnDel) btnDel.addEventListener('click', () => this.deleteSelectedElements());

        const btnGrp = document.getElementById('quickGroup');
        if (btnGrp) btnGrp.addEventListener('click', () => this.groupSelected());

        const btnUngrp = document.getElementById('quickUngroup');
        if (btnUngrp) btnUngrp.addEventListener('click', () => this.ungroupSelected());

        const btnFront = document.getElementById('quickBringFront');
        if (btnFront) btnFront.addEventListener('click', () => this.bringToFront());

        const btnBack = document.getElementById('quickSendBack');
        if (btnBack) btnBack.addEventListener('click', () => this.sendToBack());

        const snapToggle = document.getElementById('quickSnapToggle');
        if (snapToggle) snapToggle.addEventListener('click', () => this.toggleSnap());
    },

    restoreQuickbarPosition() {
        const quickbar = document.getElementById('quickToolbar');
        if (!quickbar) return;

        // If screen is narrow / mobile, let CSS dock to bottom
        if (window.innerWidth <= 768) return;

        try {
            const pos = JSON.parse(localStorage.getItem('vc_quickbar_pos'));
            if (pos && pos.left && pos.top) {
                quickbar.style.transform = 'none';
                quickbar.style.left = pos.left;
                quickbar.style.top = pos.top;
            }
        } catch (e) {
            console.warn('Failed restoring quickbar pos', e);
        }
    },

    updateQuickbarState() {
        const hasSelection = this.selectedElements && this.selectedElements.length > 0;
        const count = hasSelection ? this.selectedElements.length : 0;

        // Enable or disable action buttons
        document.querySelectorAll('.quick-toolbar .selection-action').forEach(btn => {
            btn.disabled = !hasSelection;
        });

        // Group requires >= 2 elements (or 1 to wrap in group)
        const btnGrp = document.getElementById('quickGroup');
        if (btnGrp) btnGrp.disabled = count < 2;

        // Ungroup requires at least one group
        const hasGroup = hasSelection && this.selectedElements.some(el => el.tagName.toLowerCase() === 'g');
        const btnUngrp = document.getElementById('quickUngroup');
        if (btnUngrp) btnUngrp.disabled = !hasGroup;

        // Distribute requires >= 3 elements
        const distItems = document.querySelectorAll('.quick-dropdown-menu [data-distribute]');
        distItems.forEach(item => {
            if (count < 3) {
                item.classList.add('disabled');
            } else {
                item.classList.remove('disabled');
            }
        });

        this.updateQuickbarActiveTool();

        const snapBtn = document.getElementById('quickSnapToggle');
        if (snapBtn) {
            snapBtn.classList.toggle('active', !!this.snapEnabled);
        }
    },

    updateQuickbarActiveTool() {
        const quickbar = document.getElementById('quickToolbar');
        if (!quickbar) return;

        quickbar.querySelectorAll('.tools-group .quick-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === this.currentTool);
        });
    },

    // --- EXACT 90° / 180° ROTATION (No Floating-Point Drift) ---
    rotateExact90(clockwise = true) {
        if (!this.selectedElements || this.selectedElements.length === 0) return;

        const angleDelta = clockwise ? 90 : -90;
        const bbox = this.getGroupBoundingBox();
        if (!bbox) return;

        const pivotX = bbox.x + bbox.width / 2;
        const pivotY = bbox.y + bbox.height / 2;

        this.selectedElements.forEach(element => {
            this.rotateElementExactAngle(element, angleDelta, pivotX, pivotY);
        });

        this.updateSelectionHandles();
        this.updateContextMenuValues();
        this.saveState();
    },

    rotateExact180() {
        if (!this.selectedElements || this.selectedElements.length === 0) return;

        const bbox = this.getGroupBoundingBox();
        if (!bbox) return;

        const pivotX = bbox.x + bbox.width / 2;
        const pivotY = bbox.y + bbox.height / 2;

        this.selectedElements.forEach(element => {
            this.rotateElementExactAngle(element, 180, pivotX, pivotY);
        });

        this.updateSelectionHandles();
        this.updateContextMenuValues();
        this.saveState();
    },

    rotateElementExactAngle(element, angleDelta, pivotX, pivotY) {
        const transform = element.getAttribute('transform') || '';
        const state = this.getElementState(element);

        // Calculate and snap rotation exactly to multiples of 90 degrees if near
        let rawRot = (state.rotation || 0) + angleDelta;
        let normalizedRot = Math.round(rawRot);
        normalizedRot = ((normalizedRot % 360) + 360) % 360; // 0, 90, 180, 270

        const isComplex = element.getAttribute('data-type') === 'latex' || 
                          element.getAttribute('data-type') === 'structure' || 
                          element.tagName.toLowerCase() === 'g';

        if (this.selectedElements.length === 1) {
            // Rotate around its own center
            const elemBbox = element.getBBox();
            const elemCx = elemBbox.x + elemBbox.width / 2;
            const elemCy = elemBbox.y + elemBbox.height / 2;

            if (isComplex) {
                const scaledCx = elemCx * state.scaleX;
                const scaledCy = elemCy * state.scaleY;
                if (normalizedRot === 0) {
                    element.setAttribute('transform', `translate(${state.x}, ${state.y}) scale(${state.scaleX}, ${state.scaleY})`);
                } else {
                    element.setAttribute('transform', 
                        `translate(${state.x}, ${state.y}) rotate(${normalizedRot}, ${scaledCx}, ${scaledCy}) scale(${state.scaleX}, ${state.scaleY})`);
                }
            } else {
                if (normalizedRot === 0) {
                    // Strip rotate transform completely for clean identical geometry!
                    const stripped = transform.replace(/rotate\([^)]+\)/g, '').trim();
                    if (stripped) element.setAttribute('transform', stripped);
                    else element.removeAttribute('transform');
                } else {
                    element.setAttribute('transform', `rotate(${normalizedRot}, ${elemCx}, ${elemCy})`);
                }
            }
        } else {
            // Multi-selection: rotate point around group pivot
            // Exact rotation integer matrix:
            // 90 CW: (x - px, y - py) -> (-(y - py), (x - px))
            // 90 CCW: (x - px, y - py) -> ((y - py), -(x - px))
            // 180: (x - px, y - py) -> (-(x - px), -(y - py))
            const cos = angleDelta === 90 ? 0 : angleDelta === -90 ? 0 : -1;
            const sin = angleDelta === 90 ? 1 : angleDelta === -90 ? -1 : 0;

            const elemCx = this.getElementCenterX(element);
            const elemCy = this.getElementCenterY(element);

            const dx = elemCx - pivotX;
            const dy = elemCy - pivotY;

            const newCx = pivotX + (dx * cos - dy * sin);
            const newCy = pivotY + (dx * sin + dy * cos);

            const shiftX = Math.round(newCx - elemCx);
            const shiftY = Math.round(newCy - elemCy);

            this.moveElement(element, shiftX, shiftY);

            // Also rotate the element around its own center
            this.rotateElementExactAngle(element, angleDelta, newCx, newCy);
        }
    },

    // --- DUPLICATE (Ctrl+D) ---
    duplicateSelected() {
        if (!this.selectedElements || this.selectedElements.length === 0) return;

        const newElements = [];
        const offset = 10 * (this.unitFactors['mm'] || 3.7795); // 10mm offset

        this.selectedElements.forEach(element => {
            const clone = element.cloneNode(true);
            clone.style.outline = 'none';

            // Assign unique ID if present
            if (clone.id) {
                clone.id = `${clone.id}_copy_${Date.now()}`;
            }

            // Insert directly after original
            if (element.nextSibling) {
                element.parentNode.insertBefore(clone, element.nextSibling);
            } else {
                element.parentNode.appendChild(clone);
            }

            // Offset position
            this.moveElement(clone, offset, offset);
            newElements.push(clone);
        });

        this.clearSelection();
        newElements.forEach(el => {
            el.style.outline = '2px dashed #007acc';
            this.selectedElements.push(el);
        });
        this.selectedElement = newElements[0];

        this.updateSelectionHandles();
        this.updateContextMenu();
        this.saveState();
    },

    // --- GROUP & UNGROUP ---
    groupSelected() {
        if (!this.selectedElements || this.selectedElements.length < 2) return;

        const ns = "http://www.w3.org/2000/svg";
        const group = document.createElementNS(ns, 'g');
        group.setAttribute('data-type', 'group');
        group.id = `group_${Date.now()}`;

        // Insert group before the first element in DOM
        const firstElement = this.selectedElements[0];
        firstElement.parentNode.insertBefore(group, firstElement);

        this.selectedElements.forEach(element => {
            element.style.outline = 'none';
            group.appendChild(element);
        });

        this.clearSelection();
        this.selectedElements = [group];
        this.selectedElement = group;
        group.style.outline = '2px dashed #007acc';

        this.updateSelectionHandles();
        this.updateContextMenu();
        this.saveState();
    },

    ungroupSelected() {
        if (!this.selectedElements || this.selectedElements.length === 0) return;

        const unpacked = [];
        const groupsToUngroup = this.selectedElements.filter(el => el.tagName.toLowerCase() === 'g');

        if (groupsToUngroup.length === 0) return;

        groupsToUngroup.forEach(group => {
            const parent = group.parentNode;
            const children = Array.from(group.children);

            children.forEach(child => {
                if (child instanceof SVGGraphicsElement) {
                    parent.insertBefore(child, group);
                    child.style.outline = '2px dashed #007acc';
                    unpacked.push(child);
                }
            });

            group.remove();
        });

        this.clearSelection();
        this.selectedElements = unpacked;
        this.selectedElement = unpacked[0] || null;

        this.updateSelectionHandles();
        this.updateContextMenu();
        this.saveState();
    },

    // --- Z-ORDER: FRONT / BACK ---
    bringToFront() {
        if (!this.selectedElements || this.selectedElements.length === 0) return;

        this.selectedElements.forEach(element => {
            if (this.selectionGroup && this.selectionGroup.parentNode === this.canvas) {
                this.canvas.insertBefore(element, this.selectionGroup);
            } else {
                this.canvas.appendChild(element);
            }
        });

        this.saveState();
        this.updateContextMenu();
    },

    sendToBack() {
        if (!this.selectedElements || this.selectedElements.length === 0) return;

        // Keep elements in front of axes and grid
        const reference = this.axesGroup && this.axesGroup.nextSibling ? 
            this.axesGroup.nextSibling : this.canvas.firstChild;

        this.selectedElements.forEach(element => {
            this.canvas.insertBefore(element, reference);
        });

        this.saveState();
        this.updateContextMenu();
    },

    // --- ALIGNMENT ---
    alignSelected(alignType) {
        if (!this.selectedElements || this.selectedElements.length < 2) return;

        const groupBbox = this.getGroupBoundingBox();
        if (!groupBbox) return;

        this.selectedElements.forEach(element => {
            const bbox = element.getBBox();
            const elemX = this.getElementCenterX(element) - bbox.width / 2;
            const elemY = this.getElementCenterY(element) - bbox.height / 2;

            let dx = 0;
            let dy = 0;

            switch (alignType) {
                case 'left':
                    dx = groupBbox.x - elemX;
                    break;
                case 'center':
                    dx = (groupBbox.x + groupBbox.width / 2) - (elemX + bbox.width / 2);
                    break;
                case 'right':
                    dx = (groupBbox.x + groupBbox.width) - (elemX + bbox.width);
                    break;
                case 'top':
                    dy = groupBbox.y - elemY;
                    break;
                case 'middle':
                    dy = (groupBbox.y + groupBbox.height / 2) - (elemY + bbox.height / 2);
                    break;
                case 'bottom':
                    dy = (groupBbox.y + groupBbox.height) - (elemY + bbox.height);
                    break;
            }

            if (dx !== 0 || dy !== 0) {
                this.moveElement(element, dx, dy);
            }
        });

        this.updateSelectionHandles();
        this.updateContextMenuValues();
        this.saveState();
    },

    // --- DISTRIBUTE ---
    distributeSelected(axis = 'horizontal') {
        if (!this.selectedElements || this.selectedElements.length < 3) return;

        const isHoriz = axis === 'horizontal';

        // Sort elements by position along axis
        const items = this.selectedElements.map(el => {
            const bbox = el.getBBox();
            const center = isHoriz ? this.getElementCenterX(el) : this.getElementCenterY(el);
            const size = isHoriz ? bbox.width : bbox.height;
            return { element: el, bbox, center, size };
        });

        items.sort((a, b) => a.center - b.center);

        const first = items[0];
        const last = items[items.length - 1];

        const totalSpan = (last.center + last.size / 2) - (first.center - first.size / 2);
        const totalSize = items.reduce((acc, it) => acc + it.size, 0);
        const gap = (totalSpan - totalSize) / (items.length - 1);

        let currentPos = first.center - first.size / 2;

        items.forEach((item, index) => {
            const targetPos = currentPos;
            const currentItemPos = item.center - item.size / 2;
            const delta = targetPos - currentItemPos;

            if (index > 0 && index < items.length - 1 && Math.abs(delta) > 0.01) {
                if (isHoriz) this.moveElement(item.element, delta, 0);
                else this.moveElement(item.element, 0, delta);
            }

            currentPos += item.size + gap;
        });

        this.updateSelectionHandles();
        this.updateContextMenuValues();
        this.saveState();
    },

    // --- CENTER ON ORIGIN (0,0) ---
    centerOnOrigin() {
        if (!this.selectedElements || this.selectedElements.length === 0) return;

        const bbox = this.getGroupBoundingBox();
        if (!bbox) return;

        const groupCenterX = bbox.x + bbox.width / 2;
        const groupCenterY = bbox.y + bbox.height / 2;

        const dx = -groupCenterX;
        const dy = -groupCenterY;

        this.selectedElements.forEach(element => {
            this.moveElement(element, dx, dy);
        });

        this.updateSelectionHandles();
        this.updateContextMenuValues();
        this.saveState();
    },

    // --- MATCH SIZE ---
    matchSelectedSize(dimension = 'width') {
        if (!this.selectedElements || this.selectedElements.length < 2) return;

        const refElement = this.selectedElements[0];
        const refBbox = refElement.getBBox();

        for (let i = 1; i < this.selectedElements.length; i++) {
            const element = this.selectedElements[i];
            const bbox = element.getBBox();

            let scaleX = 1;
            let scaleY = 1;

            if (dimension === 'width' || dimension === 'both') {
                if (bbox.width > 0) scaleX = refBbox.width / bbox.width;
            }
            if (dimension === 'height' || dimension === 'both') {
                if (bbox.height > 0) scaleY = refBbox.height / bbox.height;
            }

            const state = this.getElementState(element);
            const cx = bbox.x + bbox.width / 2;
            const cy = bbox.y + bbox.height / 2;

            element.setAttribute('transform', 
                `translate(${state.x}, ${state.y}) scale(${state.scaleX * scaleX}, ${state.scaleY * scaleY})`);
        }

        this.updateSelectionHandles();
        this.updateContextMenuValues();
        this.saveState();
    },

    // --- CONVERT SELECTION TO PATHS ---
    convertSelectionToPaths() {
        if (!this.selectedElements || this.selectedElements.length === 0) return;

        const newElements = [];
        this.selectedElements.forEach(element => {
            const converted = this.elementToPath(element);
            if (converted) {
                newElements.push(converted);
            } else {
                newElements.push(element);
            }
        });

        this.clearSelection();
        newElements.forEach(el => {
            el.style.outline = '2px dashed #007acc';
            this.selectedElements.push(el);
        });
        this.selectedElement = newElements[0] || null;

        this.updateSelectionHandles();
        this.updateContextMenu();
        this.saveState();
    },

    elementToPath(element) {
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'path') return element; // already a path

        const ns = "http://www.w3.org/2000/svg";
        const path = document.createElementNS(ns, 'path');

        // Copy presentation attributes
        ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'transform', 'class', 'id'].forEach(attr => {
            if (element.hasAttribute(attr)) {
                path.setAttribute(attr, element.getAttribute(attr));
            }
        });

        let d = '';

        if (tagName === 'rect') {
            const x = parseFloat(element.getAttribute('x') || 0);
            const y = parseFloat(element.getAttribute('y') || 0);
            const w = parseFloat(element.getAttribute('width') || 0);
            const h = parseFloat(element.getAttribute('height') || 0);
            const rx = parseFloat(element.getAttribute('rx') || 0);
            const ry = parseFloat(element.getAttribute('ry') || rx || 0);

            if (rx > 0 || ry > 0) {
                const r = Math.min(rx, w / 2, h / 2);
                d = `M ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} V ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + h - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
            } else {
                d = `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
            }
        } else if (tagName === 'circle') {
            const cx = parseFloat(element.getAttribute('cx') || 0);
            const cy = parseFloat(element.getAttribute('cy') || 0);
            const r = parseFloat(element.getAttribute('r') || 0);
            d = `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
        } else if (tagName === 'ellipse') {
            const cx = parseFloat(element.getAttribute('cx') || 0);
            const cy = parseFloat(element.getAttribute('cy') || 0);
            const rx = parseFloat(element.getAttribute('rx') || 0);
            const ry = parseFloat(element.getAttribute('ry') || 0);
            d = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
        } else if (tagName === 'line') {
            const x1 = parseFloat(element.getAttribute('x1') || 0);
            const y1 = parseFloat(element.getAttribute('y1') || 0);
            const x2 = parseFloat(element.getAttribute('x2') || 0);
            const y2 = parseFloat(element.getAttribute('y2') || 0);
            d = `M ${x1} ${y1} L ${x2} ${y2}`;
        } else if (tagName === 'polyline' || tagName === 'polygon') {
            const points = (element.getAttribute('points') || '').trim().split(/[\s,]+/);
            if (points.length >= 2) {
                d = `M ${points[0]} ${points[1]}`;
                for (let i = 2; i < points.length; i += 2) {
                    if (points[i] !== undefined && points[i+1] !== undefined) {
                        d += ` L ${points[i]} ${points[i+1]}`;
                    }
                }
                if (tagName === 'polygon') d += ' Z';
            }
        }

        if (d) {
            path.setAttribute('d', d);
            element.parentNode.replaceChild(path, element);
            return path;
        }

        return null;
    }
});
