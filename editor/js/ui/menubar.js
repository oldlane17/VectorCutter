/**
 * VectorCutter - Menubar Controller
 * Connects standard desktop application menus (File, Edit, Modify, View, Help).
 */

import { downloadSVG, exportSVGString } from '../io/svg-export.js';
import { importSVGString } from '../io/svg-import.js';
import { downloadDXF } from '../io/dxf.js';
import { downloadPNG } from '../io/png-export.js';
import { ImageTracer } from '../io/trace.js';
import { performBooleanUnion, performBooleanDifference, performBooleanIntersect, performBooleanExclude, elementToPathD } from '../ops/boolean.js';
import { applyKerfOffset, outlineStroke } from '../ops/offset.js';
import { linearRepeat, rotationalRepeat, gridRepeat, mirrorRepeat } from '../ops/repeat.js';
import { storage } from '../core/storage.js';
import { events } from '../core/events.js';
import { DeleteElementsCommand, AddElementCommand } from '../core/commands.js';
import { translationMatrix, multiplyMatrix } from '../model/matrix.js';

export class MenubarController {
    constructor(store, camera, modals) {
        this.store = store;
        this.camera = camera;
        this.modals = modals;

        this.bindMenus();
    }

    bindMenus() {
        // File -> New
        this.on('menuNew', () => {
            if (confirm('Create new document? Unsaved changes will be cleared.')) {
                this.store.replaceDocument({
                    version: 1,
                    units: 'mm',
                    settings: { ...this.store.doc.settings },
                    components: {},
                    elements: {},
                    order: [],
                    selection: []
                });
                const titleInput = document.getElementById('projectTitleInput');
                if (titleInput) titleInput.value = 'Untitled Project';
            }
        });

        // File -> Open SVG
        const openInput = document.createElement('input');
        openInput.type = 'file';
        openInput.accept = '.svg,image/svg+xml';
        openInput.style.display = 'none';
        document.body.appendChild(openInput);

        this.on('menuOpen', () => openInput.click());
        openInput.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const text = ev.target?.result;
                if (text) {
                    const mode = confirm('Click OK to Replace document, or Cancel to Append elements.') ? 'replace' : 'append';
                    importSVGString(text, this.store, mode);
                }
            };
            reader.readAsText(file);
            openInput.value = '';
        });

        // File -> Export SVG
        this.on('menuSave', () => downloadSVG(this.store, 'vectorcutter.svg'));

        // File -> Export DXF
        this.on('menuExportDXF', () => downloadDXF(this.store, 'vectorcutter.dxf'));

        // File -> Export PNG
        this.on('menuExportPNG', () => {
            const svgStr = exportSVGString(this.store);
            downloadPNG(svgStr, 'vectorcutter.png');
        });

        // File -> Save to Dashboard
        this.on('menuDashboardSave', () => {
            const titleInput = document.getElementById('projectTitleInput');
            const name = titleInput?.value || 'VectorCutter Project';
            const docJson = JSON.stringify(this.store.doc);
            const svgThumb = exportSVGString(this.store);
            storage.saveProject({
                id: Date.now(),
                name,
                content: docJson,
                svgPreview: svgThumb
            });
            alert(`Project "${name}" saved to Dashboard!`);
        });

        // Edit -> Undo / Redo
        this.on('menuUndo', () => this.store.undo());
        this.on('menuRedo', () => this.store.redo());

        // Edit -> Select All / Clear
        this.on('menuSelectAll', () => this.store.setSelection(this.store.doc.order));
        this.on('menuClearSelection', () => this.store.clearSelection());

        // Edit -> Duplicate
        this.on('menuDuplicate', () => {
            const selected = this.store.getSelectedElements();
            if (selected.length === 0) return;
            this.store.beginBatch();
            const newIds = [];
            selected.forEach(el => {
                const cloned = JSON.parse(JSON.stringify(el));
                cloned.id = 'el_' + Math.random().toString(36).substr(2, 9);
                cloned.name = `${el.name || el.type} (Copy)`;
                cloned.transform = multiplyMatrix(translationMatrix(10, 10), el.transform);
                this.store.dispatch(new AddElementCommand(cloned));
                newIds.push(cloned.id);
            });
            this.store.endBatch('Duplicate Elements');
            this.store.setSelection(newIds);
        });

        // Edit -> Delete
        this.on('menuDelete', () => {
            if (this.store.doc.selection.length === 0) return;
            this.store.dispatch(new DeleteElementsCommand(this.store.doc.selection, this.store.doc));
        });

        // Edit -> Convert to Path
        this.on('menuConvertToPath', () => {
            const selected = this.store.getSelectedElements();
            if (selected.length === 0) return;
            this.store.beginBatch();
            const newIds = [];
            selected.forEach(el => {
                const d = elementToPathD(el);
                const pathEl = {
                    ...JSON.parse(JSON.stringify(el)),
                    type: 'path',
                    name: `${el.name || el.type} (Path)`,
                    geometry: { d }
                };
                delete pathEl.params; // Breaking generator link (§4.3)
                this.store.dispatch(new DeleteElementsCommand([el.id], this.store.doc));
                this.store.dispatch(new AddElementCommand(pathEl));
                newIds.push(pathEl.id);
            });
            this.store.endBatch('Convert to Paths');
            this.store.setSelection(newIds);
        });

        // Edit -> Trace Image
        const tracer = new ImageTracer(this.store, this.camera);
        this.on('menuTraceImage', () => tracer.openDialog());

        // Modify -> Prepare for 3D (§7.2)
        this.on('menuPrepare3D', () => events.emit('open:tab', '3d'));

        // Modify -> Booleans
        this.on('menuBooleanUnion', () => performBooleanUnion(this.store));
        this.on('menuBooleanDiff', () => performBooleanDifference(this.store));
        this.on('menuBooleanIntersect', () => performBooleanIntersect(this.store));
        this.on('menuBooleanExclude', () => performBooleanExclude(this.store));

        // Modify -> Offsets
        this.on('menuKerfOffset', () => applyKerfOffset(this.store));
        this.on('menuOutlineStroke', () => outlineStroke(this.store));

        // Modify -> Repeats
        this.on('menuLinearRepeat', () => linearRepeat(this.store));
        this.on('menuRotRepeat', () => rotationalRepeat(this.store));
        this.on('menuGridRepeat', () => gridRepeat(this.store));
        this.on('menuMirrorRepeat', () => mirrorRepeat(this.store));

        // View -> Zoom controls
        this.on('menuZoomIn', () => {
            this.camera.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.25);
        });

        this.on('menuZoomOut', () => {
            this.camera.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 0.8);
        });

        this.on('menuResetZoom', () => {
            this.camera.resetView(window.innerWidth, window.innerHeight);
        });

        this.on('menuToggleGrid', () => {
            const gridCanvas = document.getElementById('gridCanvas');
            if (gridCanvas) {
                gridCanvas.style.display = gridCanvas.style.display === 'none' ? 'block' : 'none';
            }
        });

        // Help -> Modals
        this.on('menuShapeLibrary', () => this.modals.showShapeLibrary());
        this.on('menuShortcuts', () => this.modals.showShortcutsModal());
        this.on('menuCommandPalette', () => this.modals.showCommandPalette());
    }

    on(id, handler) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', handler);
        }
    }
}
