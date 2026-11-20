/**
 * VectorCutter - Main ES Module Entry Point
 */

import { storage } from './core/storage.js';
import { Store } from './core/store.js';
import { Camera } from './view/camera.js';
import { GridRenderer } from './view/grid.js';
import { InputController } from './view/input.js';
import { SceneRenderer } from './view/scene.js';
import { OverlayRenderer } from './view/overlay.js';
import { ToolManager } from './tools/tool-manager.js';
import { ThemeController } from './ui/theme.js';
import { SidebarController } from './ui/sidebar.js';
import { QuickbarController } from './ui/quickbar.js';
import { PropertiesController } from './ui/properties.js';
import { MenubarController } from './ui/menubar.js';
import { ModalsController } from './ui/modals.js';
import { events } from './core/events.js';
import { importSVGString } from './io/svg-import.js';

class VectorCutterApp {
    constructor() {
        console.log('[VectorCutter] Initializing ES Module Architecture...');

        // 1. Core Model & Store
        this.store = new Store();

        // 2. View Elements
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

        // 7. Lifecycle & Rendering Loop
        this.setupResize();
        this.setupSubscriptions();
        this.checkUrlProject();
        this.startRenderLoop();

        // Debug handle for browser console
        window.vc = this;
        console.log('[VectorCutter] Ready! Window handle available at window.vc');
    }

    setupLaserModeToggle() {
        const toggle = document.getElementById('laserModeSwitch');
        if (toggle) {
            toggle.addEventListener('click', () => {
                this.store.doc.settings.laserMode = !this.store.doc.settings.laserMode;
                toggle.classList.toggle('active', this.store.doc.settings.laserMode);
                events.emit('document:changed', { action: 'laser-mode' });
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

            // Re-render
            this.render();
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
        events.on('document:changed', () => this.render());
        events.on('selection:changed', () => this.overlay.render());
        events.on('camera:changed', () => {
            // Apply camera matrix to artwork world
            this.worldGroup.setAttribute('transform', this.camera.matrix());
            this.overlay.render();
            this.updateStatusBar();
        });
        events.on('theme:changed', () => this.render());

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

    render() {
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        this.worldGroup.setAttribute('transform', this.camera.matrix());
        this.grid.render(this.camera, isDark);
        this.scene.render();
        this.overlay.render();
        this.updateStatusBar();
    }

    startRenderLoop() {
        let lastFrameTime = performance.now();
        const loop = (now) => {
            // Smooth animated render tick
            const dt = now - lastFrameTime;
            lastFrameTime = now;
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
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
