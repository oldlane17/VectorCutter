/**
 * VectorCutter - SVG Editor Adaptive Resizable Sidebar
 * Module: editor-sidebar-resize.js
 * Description: Draggable Dividers, Responsive Collapsible Sidebar & Panel Management
 */

Object.assign(SVGEditor.prototype, {
    setupSidebarResizing() {
        const sidebar = document.querySelector('.sidebar');
        const contextMenu = document.querySelector('.context-menu');
        const sidebarResizer = document.getElementById('sidebarResizer');
        const contextResizer = document.getElementById('contextResizer');
        const collapseBtn = document.getElementById('sidebarCollapseBtn');
        const searchInput = document.getElementById('sidebarSearch');

        if (!sidebar) return;

        // --- 1. RESTORE PERSISTED STATE ---
        const savedLeftW = parseInt(localStorage.getItem('vc_sidebar_w'), 10) || 260;
        const isLeftCollapsed = localStorage.getItem('vc_sidebar_collapsed') === 'true';

        const savedRightW = parseInt(localStorage.getItem('vc_context_w'), 10) || 320;
        const isRightCollapsed = localStorage.getItem('vc_context_collapsed') === 'true';

        if (isLeftCollapsed) {
            this.setSidebarCollapsed(true, false);
        } else {
            this.setSidebarWidth(savedLeftW, false);
        }

        if (contextMenu) {
            if (isRightCollapsed) {
                this.setContextMenuCollapsed(true, false);
            } else {
                this.setContextMenuWidth(savedRightW, false);
            }
        }

        // --- 2. LEFT SIDEBAR RESIZER DRAG ---
        if (sidebarResizer) {
            let isDraggingLeft = false;
            let startX = 0;
            let startW = 0;

            sidebarResizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isDraggingLeft = true;
                startX = e.clientX;
                startW = sidebar.getBoundingClientRect().width;

                sidebarResizer.classList.add('active');
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
            });

            window.addEventListener('mousemove', (e) => {
                if (!isDraggingLeft) return;
                const dx = e.clientX - startX;
                let targetW = startW + dx;

                const minW = 56;
                const maxW = Math.round(window.innerWidth * 0.45);

                if (targetW < 100) {
                    // Snap to icon-only collapsed mode
                    this.setSidebarCollapsed(true);
                } else {
                    targetW = Math.max(160, Math.min(maxW, targetW));
                    this.setSidebarCollapsed(false, false);
                    this.setSidebarWidth(targetW);
                }
            });

            window.addEventListener('mouseup', () => {
                if (!isDraggingLeft) return;
                isDraggingLeft = false;
                sidebarResizer.classList.remove('active');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                this.handleCanvasResize();
            });

            // Double click to reset
            sidebarResizer.addEventListener('dblclick', () => {
                this.setSidebarCollapsed(false, true);
                this.setSidebarWidth(260, true);
            });
        }

        // --- 3. RIGHT CONTEXT MENU RESIZER DRAG ---
        if (contextResizer && contextMenu) {
            let isDraggingRight = false;
            let startX = 0;
            let startW = 0;

            contextResizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isDraggingRight = true;
                startX = e.clientX;
                startW = contextMenu.getBoundingClientRect().width;

                contextResizer.classList.add('active');
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
            });

            window.addEventListener('mousemove', (e) => {
                if (!isDraggingRight) return;
                const dx = startX - e.clientX; // Moving left increases width
                let targetW = startW + dx;

                const minW = 200;
                const maxW = Math.round(window.innerWidth * 0.45);

                if (targetW < 120) {
                    this.setContextMenuCollapsed(true);
                } else {
                    targetW = Math.max(minW, Math.min(maxW, targetW));
                    this.setContextMenuCollapsed(false, false);
                    this.setContextMenuWidth(targetW);
                }
            });

            window.addEventListener('mouseup', () => {
                if (!isDraggingRight) return;
                isDraggingRight = false;
                contextResizer.classList.remove('active');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                this.handleCanvasResize();
            });

            // Double click to reset
            contextResizer.addEventListener('dblclick', () => {
                this.setContextMenuCollapsed(false, true);
                this.setContextMenuWidth(320, true);
            });
        }

        // --- 4. COLLAPSE TOGGLE BUTTONS ---
        if (collapseBtn) {
            collapseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isCurrentlyCollapsed = sidebar.classList.contains('icon-only');
                this.setSidebarCollapsed(!isCurrentlyCollapsed, true);
            });
        }

        const rightCollapseBtn = document.getElementById('contextCollapseBtn');
        if (rightCollapseBtn && contextMenu) {
            rightCollapseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isCollapsed = contextMenu.classList.contains('collapsed');
                this.setContextMenuCollapsed(!isCollapsed, true);
            });
        }

        // --- 5. SEARCH FILTER ---
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const toolItems = sidebar.querySelectorAll('.tool');

                toolItems.forEach(tool => {
                    const title = (tool.dataset.title || '').toLowerCase();
                    const name = (tool.querySelector('.tool-label')?.textContent || '').toLowerCase();
                    const match = !query || title.includes(query) || name.includes(query);
                    tool.style.display = match ? 'flex' : 'none';
                });

                // Auto-expand sections if searching
                if (query) {
                    sidebar.querySelectorAll('.sidebar-section-content').forEach(c => c.style.display = 'block');
                }
            });
        }

        // --- 6. ACCORDION SECTIONS ---
        sidebar.querySelectorAll('.sidebar-section-header').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.parentElement;
                const content = section.querySelector('.sidebar-section-content');
                const arrow = header.querySelector('.section-arrow');
                if (!content) return;

                const isOpen = content.style.display !== 'none';
                content.style.display = isOpen ? 'none' : 'block';
                if (arrow) arrow.textContent = isOpen ? '▶' : '▼';
            });
        });

        // --- 7. RESIZE OBSERVER ON CANVAS CONTAINER ---
        if (window.ResizeObserver && this.canvasContainer) {
            const ro = new ResizeObserver(() => {
                this.handleCanvasResize();
            });
            ro.observe(this.canvasContainer);
        }
    },

    setSidebarWidth(width, persist = true) {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        sidebar.style.width = `${width}px`;
        document.documentElement.style.setProperty('--sidebar-w', `${width}px`);
        if (persist) {
            localStorage.setItem('vc_sidebar_w', width);
        }
        this.handleCanvasResize();
    },

    setSidebarCollapsed(collapse, persist = true) {
        const sidebar = document.querySelector('.sidebar');
        const collapseBtn = document.getElementById('sidebarCollapseBtn');
        if (!sidebar) return;

        if (collapse) {
            sidebar.classList.add('icon-only');
            sidebar.style.width = '56px';
            document.documentElement.style.setProperty('--sidebar-w', '56px');
            if (collapseBtn) {
                collapseBtn.title = 'Expand sidebar';
                collapseBtn.querySelector('svg')?.style.setProperty('transform', 'rotate(180deg)');
            }
        } else {
            sidebar.classList.remove('icon-only');
            const savedW = parseInt(localStorage.getItem('vc_sidebar_w'), 10) || 260;
            const w = Math.max(180, savedW);
            sidebar.style.width = `${w}px`;
            document.documentElement.style.setProperty('--sidebar-w', `${w}px`);
            if (collapseBtn) {
                collapseBtn.title = 'Collapse to icons only';
                collapseBtn.querySelector('svg')?.style.setProperty('transform', 'none');
            }
        }

        if (persist) {
            localStorage.setItem('vc_sidebar_collapsed', collapse ? 'true' : 'false');
        }
        this.handleCanvasResize();
    },

    setContextMenuWidth(width, persist = true) {
        const contextMenu = document.querySelector('.context-menu');
        if (!contextMenu) return;
        contextMenu.style.width = `${width}px`;
        document.documentElement.style.setProperty('--context-w', `${width}px`);
        if (persist) {
            localStorage.setItem('vc_context_w', width);
        }
        this.handleCanvasResize();
    },

    setContextMenuCollapsed(collapse, persist = true) {
        const contextMenu = document.querySelector('.context-menu');
        const rightCollapseBtn = document.getElementById('contextCollapseBtn');
        if (!contextMenu) return;

        if (collapse) {
            contextMenu.classList.add('collapsed');
            contextMenu.style.width = '0px';
            contextMenu.style.minWidth = '0px';
            contextMenu.style.padding = '0px';
            contextMenu.style.overflow = 'hidden';
            if (rightCollapseBtn) rightCollapseBtn.title = 'Expand Properties Panel';
        } else {
            contextMenu.classList.remove('collapsed');
            const savedW = parseInt(localStorage.getItem('vc_context_w'), 10) || 320;
            contextMenu.style.width = `${savedW}px`;
            contextMenu.style.minWidth = '220px';
            contextMenu.style.padding = '';
            contextMenu.style.overflow = '';
            if (rightCollapseBtn) rightCollapseBtn.title = 'Collapse Properties Panel';
        }

        if (persist) {
            localStorage.setItem('vc_context_collapsed', collapse ? 'true' : 'false');
        }
        this.handleCanvasResize();
    }
});
