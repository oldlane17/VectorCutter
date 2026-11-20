/**
 * VectorCutter - Main ES Module Entry Point (Revision 2)
 * Central coordinator integrating 2D design, live 60 FPS rendering, objects tree,
 * direct SVG code editor, and the "Prepare for 3D" workflow.
 */

import { storage } from './core/storage.js?v=2.4.0';
import { Store } from './core/store.js?v=2.4.0';
import { Camera } from './view/camera.js?v=2.4.0';
import { GridRenderer } from './view/grid.js?v=2.4.0';
import { InputController } from './view/input.js?v=2.4.0';
import { SceneRenderer } from './view/scene.js?v=2.4.0';
import { OverlayRenderer } from './view/overlay.js?v=2.4.0';
import { ToolManager } from './tools/tool-manager.js?v=2.4.0';
import { ThemeController } from './ui/theme.js?v=2.4.0';
import { SidebarController } from './ui/sidebar.js?v=2.4.0';
import { QuickbarController } from './ui/quickbar.js?v=2.4.0';
import { PropertiesController } from './ui/properties.js?v=2.4.0';
import { MenubarController } from './ui/menubar.js?v=2.4.0';
import { ModalsController } from './ui/modals.js?v=2.4.0';
import { events } from './core/events.js?v=2.4.0';
import { importSVGString } from './io/svg-import.js?v=2.4.0';
import { registerRenderHook, requestRender, renderAll } from './core/scheduler.js?v=2.4.0';

class VectorCutterApp {
    constructor() {
        console.log('[VectorCutter] Booting Modular Architecture Revision 2...');

        // 1. Single Source of Truth Store (§1.1)
        this.store = new Store();

        // 2. View DOM Elements
        this.container = document.getElementById('canvasContainer');
        this.gridCanvas = document.getElementById('gridCanvas');
        this.artworkSvg = document.getElementById('artworkSvg');
        this.worldGroup = document.getElementById('worldGroup');
        this.overlaySvg = document.getElementById('overlaySvg');
        this.quickbarEl = document.getElementById('quickbar');
        this.sidebarEl = document.getElementById('sidebar');
        this.sidebarResizer = document.getElementById('sidebarResizer');
        this.contextPanel = document.getElementById('contextPanel');

        // 3. View Systems
        this.camera = new Camera();
        this.grid = new GridRenderer(this.gridCanvas);
        this.scene = new SceneRenderer(this.worldGroup, this.store);
        this.overlay = new OverlayRenderer(this.overlaySvg, this.camera, this.store);

        // 4. Tools & Interaction
        this.tools = new ToolManager(this.container, this.camera, this.store);
        this.input = new InputController(this.container, this.camera, this.tools);

        // 5. UI Controllers
        this.theme = new ThemeController();
        this.sidebar = new SidebarController(this.sidebarEl, this.sidebarResizer, this.tools);
        this.quickbar = new QuickbarController(this.quickbarEl, this.tools, this.store);
        this.properties = new PropertiesController(this.contextPanel, this.store);
        this.modals = new ModalsController(this.store, this.camera);
        this.menubar = new MenubarController(this.store, this.camera, this.modals);

        // Sidebar Browse Shapes Button
        const browseBtn = document.getElementById('sidebarBrowseShapesBtn');
        if (browseBtn) {
            browseBtn.addEventListener('click', () => this.modals.showShapeLibrary());
        }

        // 6. Laser Mode Toggle
        this.setupLaserModeToggle();

        // 7. Render Scheduler Hook Registrations (§1.3)
        this.setupRenderHooks();

        // 8. Viewport Resizing & Subscriptions
        this.setupResize();
        this.setupSubscriptions();
        this.checkUrlProject();

        // Initial render tick (§1.6)
        requestRender();

        // Expose debug handle
        window.vc = this;
        console.log('[VectorCutter] Ready! Window handle available at window.vc');
    }

    setupRenderHooks() {
        registerRenderHook('canvas', () => {
            const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
            this.worldGroup.setAttribute('transform', this.camera.matrix());
            this.grid.render(this.camera, isDark);
            this.scene.render();
            this.overlay.render();
        });

        registerRenderHook('objectList', () => {
            if (this.properties.currentTab === 'properties') {
                this.properties.objectsPanel?.render();
            }
        });

        registerRenderHook('codeEditor', () => {
            if (this.properties.currentTab === 'code') {
                this.properties.codePanel?.syncFromModel();
            }
        });

        registerRenderHook('statusBar', () => {
            this.updateStatusBar();
        });
    }

    setupLaserModeToggle() {
        const toggle = document.getElementById('laserModeSwitch');
        if (toggle) {
            toggle.addEventListener('click', () => {
                this.store.doc.settings.laserMode = !this.store.doc.settings.laserMode;
                toggle.classList.toggle('active', this.store.doc.settings.laserMode);
                events.emit('document:changed', { action: 'laser-mode' });
                requestRender();
            });
        }
    }

    setupResize() {
        const resize = () => {
            const rect = this.container.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;

            this.grid.resize(rect.width, rect.height);
            this.overlaySvg.setAttribute('width', rect.width);
            this.overlaySvg.setAttribute('height', rect.height);
            this.artworkSvg.setAttribute('width', rect.width);
            this.artworkSvg.setAttribute('height', rect.height);

            requestRender();
        };

        window.addEventListener('resize', resize);
        if (window.ResizeObserver) {
            new ResizeObserver(resize).observe(this.container);
        }
        resize();

        // Initial camera centering
        const rect = this.container.getBoundingClientRect();
        this.camera.resetView(rect.width, rect.height);
    }

    setupSubscriptions() {
        events.on('document:changed', () => requestRender());
        events.on('selection:changed', () => {
            this.overlay.render();
            if (this.properties.currentTab === 'properties') {
                this.properties.render();
            } else if (this.properties.currentTab === '3d') {
                this.properties.panel3D?.rebuildMesh();
            }
        });
        events.on('camera:changed', () => {
            this.worldGroup.setAttribute('transform', this.camera.matrix());
            this.overlay.render();
            this.updateStatusBar();
        });
        events.on('theme:changed', () => requestRender());

        // Update status bar coordinates on pointer move
        this.container.addEventListener('pointermove', (e) => {
            const rect = this.container.getBoundingClientRect();
            const w = this.camera.toWorld(e.clientX - rect.left, e.clientY - rect.top);
            const coordEl = document.getElementById('statusCoords');
            if (coordEl) {
                coordEl.textContent = `X: ${w.x.toFixed(1)} mm | Y: ${w.y.toFixed(1)} mm`;
            }
        });
    }

    updateStatusBar() {
        const zoomEl = document.getElementById('statusZoom');
        if (zoomEl) {
            const pct = Math.round((this.camera.scale / 3.779527559) * 100);
            zoomEl.textContent = `${pct}%`;
        }
    }

    checkUrlProject() {
        const params = new URLSearchParams(window.location.search);
        const pid = params.get('pid');
        if (pid) {
            const project = storage.getProjectById(pid);
            if (project && project.content) {
                if (typeof project.content === 'string' && project.content.trim().startsWith('<svg')) {
                    importSVGString(project.content, this.store, 'replace');
                } else if (typeof project.content === 'object') {
                    this.store.replaceDocument(project.content);
                }
                const titleInput = document.getElementById('projectTitleInput');
                if (titleInput && project.name) titleInput.value = project.name;
                console.log(`[VectorCutter] Loaded dashboard project "${project.name}" (ID: ${pid})`);
            }
        }
    }
}

// Boot application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new VectorCutterApp());
} else {
    new VectorCutterApp();
}
