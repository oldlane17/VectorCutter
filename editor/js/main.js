/**
 * VectorCutter - Main ES Module Entry Point (Revision 2)
 * Central coordinator integrating 2D design, live 60 FPS rendering, objects tree,
 * direct SVG code editor, and the "Prepare for 3D" workflow.
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
import { fromMm } from './model/units.js';
import { registerRenderHook, requestRender, renderAll } from './core/scheduler.js';

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
        this.render();
        requestRender();

        // Expose debug handle
        window.vc = this;
        console.log('[VectorCutter] Ready! Window handle available at window.vc');
    }

    render() {
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        this.worldGroup.setAttribute('transform', this.camera.matrix());
        this.grid.render(this.camera, isDark);
        this.scene.render();
        this.overlay.render();
        this.updateStatusBar();
    }

    setupRenderHooks() {
        registerRenderHook('canvas', () => {
            this.render();
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
                this.render();
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

            this.render();
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
        events.on('document:changed', () => {
            this.render();
            requestRender();
        });
        events.on('selection:changed', () => {
            this.overlay.render();
            if (this.properties.currentTab === 'properties') {
                this.properties.render();
            } else if (this.properties.currentTab === '3d') {
                this.properties.panel3D?.rebuildMesh();
            }
            requestRender();
        });
        events.on('camera:changed', () => {
            this.worldGroup.setAttribute('transform', this.camera.matrix());
            this.grid.render(this.camera, document.documentElement.getAttribute('data-theme') !== 'light');
            this.overlay.render();
            this.updateStatusBar();
        });
        events.on('theme:changed', () => {
            this.render();
            requestRender();
        });
        events.on('grid:toggle', () => {
            this.grid.enabled = !this.grid.enabled;
            if (this.gridCanvas) {
                this.gridCanvas.style.display = this.grid.enabled ? 'block' : 'none';
            }
            this.render();
            requestRender();
        });
        events.on('settings:changed', (settings) => {
            this.applySettings(settings);
        });

        // Apply persisted editor settings on boot
        const savedSettings = storage.getItem('vc_editor_settings', null);
        if (savedSettings) {
            this.applySettings(savedSettings);
        }

        // Global shortcuts (Ctrl+Z Undo, Ctrl+M / Ctrl+Y / Ctrl+Shift+Z Redo, Ctrl+G Grid Toggle)
        window.addEventListener('keydown', (e) => {
            const active = document.activeElement;
            const tag = active?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active?.isContentEditable) return;

            if (e.ctrlKey || e.metaKey) {
                const key = e.key.toLowerCase();
                if (key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.store.undo();
                } else if (key === 'm' || key === 'y' || (key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    this.store.redo();
                } else if (key === 'g' && !e.shiftKey) {
                    e.preventDefault();
                    events.emit('grid:toggle');
                }
            }
        });

        // Update status bar coordinates on pointer move
        this.container.addEventListener('pointermove', (e) => {
            const rect = this.container.getBoundingClientRect();
            const w = this.camera.toWorld(e.clientX - rect.left, e.clientY - rect.top);
            const coordEl = document.getElementById('statusCoords');
            if (coordEl) {
                const unit = this.store.doc.units || window.__vcDefaultUnit || 'mm';
                coordEl.textContent = `X: ${fromMm(w.x, unit).toFixed(1)} ${unit} | Y: ${fromMm(w.y, unit).toFixed(1)} ${unit}`;
            }
        });
    }

    applySettings(settings) {
        if (!settings) return;
        if (settings.defaultStroke) {
            window.__vcDefaultStroke = settings.defaultStroke;
            const prev = document.getElementById('qbStrokePreview');
            if (prev) prev.style.background = settings.defaultStroke;
        }
        if (settings.defaultFill !== undefined) {
            window.__vcDefaultFill = settings.defaultFill;
            const prev = document.getElementById('qbFillPreview');
            if (prev) prev.style.background = settings.defaultFill === 'none' ? 'transparent' : settings.defaultFill;
        }
        if (settings.defaultUnit) {
            window.__vcDefaultUnit = settings.defaultUnit;
            this.store.doc.units = settings.defaultUnit;
            const unitNames = { mm: 'Millimetres (mm)', cm: 'Centimetres (cm)', in: 'Inches (in)', px: 'Pixels (px)' };
            const statusUnit = document.getElementById('statusUnit');
            if (statusUnit) statusUnit.textContent = unitNames[settings.defaultUnit] || settings.defaultUnit;
        }
        if (settings.defaultFontFamily) {
            window.__vcDefaultFontFamily = settings.defaultFontFamily;
        }
        if (settings.defaultFontSize) {
            window.__vcDefaultFontSize = settings.defaultFontSize;
        }
        if (settings.defaultTheme && this.theme) {
            this.theme.applyTheme(settings.defaultTheme, true);
        }
        if (settings.invertScroll !== undefined && this.input) {
            this.input.setInvertScroll(settings.invertScroll);
        }
        this.properties?.render();
        this.render();
        requestRender();
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
                let parsed = null;
                if (typeof project.content === 'string') {
                    if (project.content.trim().startsWith('<svg')) {
                        importSVGString(project.content, this.store, 'replace');
                    } else {
                        try {
                            parsed = JSON.parse(project.content);
                        } catch (err) {
                            console.error('Failed to parse project JSON:', err);
                        }
                    }
                } else if (typeof project.content === 'object') {
                    parsed = project.content;
                }
                if (parsed) {
                    this.store.replaceDocument(parsed);
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
