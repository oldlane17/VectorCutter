/**
 * VectorCutter - Adaptive Left Sidebar Controller
 */

import { storage } from '../core/storage.js';
import { events } from '../core/events.js';

export class SidebarController {
    constructor(sidebarEl, resizerEl, toolManager) {
        this.sidebar = sidebarEl;
        this.resizer = resizerEl;
        this.toolManager = toolManager;

        this.width = parseInt(storage.getItem('vc_sidebar_w', '260'), 10);
        if (isNaN(this.width) || this.width < 180) this.width = 260;
        this.isCollapsed = storage.getItem('vc_sidebar_collapsed', 'false') === 'true';

        this.applyState(false);
        this.bindEvents();
    }

    applyState(persist = true) {
        if (this.isCollapsed) {
            this.sidebar.classList.add('icon-only');
            this.sidebar.style.width = '56px';
            document.documentElement.style.setProperty('--vc-sidebar-w', '56px');
        } else {
            this.sidebar.classList.remove('icon-only');
            this.sidebar.style.width = `${this.width}px`;
            document.documentElement.style.setProperty('--vc-sidebar-w', `${this.width}px`);
        }

        if (persist) {
            storage.setItem('vc_sidebar_w', this.width);
            storage.setItem('vc_sidebar_collapsed', this.isCollapsed ? 'true' : 'false');
        }
        events.emit('layout:resized');
    }

    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        this.applyState(true);
    }

    bindEvents() {
        // Collapse toggle button
        const collapseBtn = document.getElementById('sidebarCollapseBtn');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => this.toggleCollapse());
        }

        // Draggable divider
        if (this.resizer) {
            let isDragging = false;
            let startX = 0;
            let startW = 0;

            this.resizer.addEventListener('pointerdown', (e) => {
                isDragging = true;
                startX = e.clientX;
                startW = this.sidebar.getBoundingClientRect().width;
                this.resizer.classList.add('active');
                document.body.style.cursor = 'col-resize';
                e.preventDefault();
            });

            window.addEventListener('pointermove', (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const targetW = startW + dx;

                if (targetW < 100) {
                    this.isCollapsed = true;
                    this.applyState(false);
                } else {
                    this.isCollapsed = false;
                    this.width = Math.max(180, Math.min(Math.round(window.innerWidth * 0.45), targetW));
                    this.applyState(false);
                }
            });

            window.addEventListener('pointerup', () => {
                if (!isDragging) return;
                isDragging = false;
                this.resizer.classList.remove('active');
                document.body.style.cursor = '';
                this.applyState(true);
            });

            this.resizer.addEventListener('dblclick', () => {
                this.isCollapsed = false;
                this.width = 260;
                this.applyState(true);
            });
        }

        // Tool buttons click
        this.sidebar.querySelectorAll('.vc-tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                if (tool) {
                    this.toolManager.setTool(tool);
                }
            });
        });

        // Search box live filter
        const searchInput = document.getElementById('sidebarSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                this.sidebar.querySelectorAll('.vc-tool-btn').forEach(btn => {
                    const text = btn.textContent.toLowerCase();
                    const tool = (btn.dataset.tool || '').toLowerCase();
                    const match = !query || text.includes(query) || tool.includes(query);
                    btn.style.display = match ? 'flex' : 'none';
                });
            });
        }

        // Sync active tool state
        events.on('tool:changed', (tool) => {
            this.sidebar.querySelectorAll('.vc-tool-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tool === tool);
            });
        });
    }
}
