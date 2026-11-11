/**
 * VectorCutter - SVG Editor Core
 * Module: editor-core.js
 * Description: Core Lifecycle, State, Document Management, History & Keyboard Shortcuts
 */

class SVGEditor {
    constructor() {
        this.canvas = document.getElementById('svgCanvas');
        this.canvasContainer = document.getElementById('canvasContainer');
        this.currentTool = 'select';
        this.selectedElement = null;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentElement = null;
        this.zoomLevel = 1;
        this.showGrid = true;
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.viewBox = {
            x: -600,
            y: -450,
            width: 1200,
            height: 900
        };
        this.currentUnits = 'mm';
        this.laserMode = false;
        this.axisElements = {
            xAxis: null,
            yAxis: null,
            xLabel: null,
            yLabel: null
        };

        this.templateFiles = [
            "leather_badge.svg",
            "5_star.svg", 
            "6_star.svg", 
            "code.svg",
            "ellipse.svg", 
            
        ];
        
        // Toolbar states
        this.canvasMode = 'select'; // 'select' or 'pan'
        this.gridEnabled = true;
        this.snapEnabled = false;

        this.selectionRectStart = null;
        this.selectionRectElement = null;
        this.isSelecting = false;
        
        // Multi-selection
        this.selectedElements = [];
        
        // Selection handles
        this.selectionGroup = null;
        this.selectionRect = null;
        this.resizeHandles = [];
        this.rotateHandle = null;
        this.isResizing = false;
        this.isRotating = false;
        this.isModifyingCurve = false; // New state for curve bending
        this.resizeHandleType = null;
        this.initialMouseAngle = 0;
        this.initialRotation = 0;
        
        //input
        this.editingInputs = new Set();

        // Unit conversion factors (pixels per unit)
        this.unitFactors = {
            'px': 1,
            'mm': 3.779527559, // 96 DPI / 25.4 mm per inch
            'cm': 37.79527559, // 96 DPI / 2.54 cm per inch
            'in': 96 // 96 DPI
        };


        this.history = [];         // Array to store XML strings of the canvas state
        this.historyIndex = -1;    // Current position in the history stack
        this.clipboard = [];       // Array to store cloned SVG elements
        this.maxHistory = 50; 
        this.ctrlKeyPressed = false;
        this.shiftKeyPressed = false;

        this.batchUpdateDepth = 0;
        this.batchUpdateCallback = null;

        this.isPathDrawing = false;
        this.pathPoints = null;
        this.init();
    }

    init() {
        this.setupCoordinateSystem();
        this.setupTools();
        this.setupMenuHandlers();
        this.setupLaserModeToggle();
        this.setupToolbar();
        this.bindEvents();
        this.setupTemplates();

        
        const rect = this.canvasContainer.getBoundingClientRect();
        
        // Default zoom: 1 pixel = 1 SVG unit
        // Center (0,0) in the middle of the screen
        if (rect.width > 0 && rect.height > 0) {
            this.viewBox = {
                x: -rect.width / 2,
                y: -rect.height / 2,
                width: rect.width,
                height: rect.height
            };
        }
        
        this.updateViewBox();
        this.updateCanvasCursor();
        this.setupShiftKeyListener();
        this.setupKeyboardModifiers();
        this.updateContextMenu();
        this.setupContextMenuResizer(); 
        this.setupTooltips();

        window.addEventListener('resize', () => {
            this.handleCanvasResize();
        });
        // --- ADD THIS BLOCK START ---
        // Check for Project ID in URL
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('pid');

        if (projectId) {
            // Give a small delay to ensure DOM is ready
            setTimeout(() => {
                try {
                    const projects = JSON.parse(localStorage.getItem('vc_projects') || '[]');
                    // Note: project.id is a number, projectId from URL is a string
                    const project = projects.find(p => p.id == projectId);
                    
                    if (project && project.content) {
                        // Load the content and force 'replace' mode
                        this.loadSVGContent(project.content, 'replace');
                        console.log("Loaded project:", project.name);
                    } else {
                        console.error("Project not found in storage");
                    }
                } catch (e) {
                    console.error("Error auto-loading project:", e);
                }
            }, 100);
        }
        // --- ADD THIS BLOCK END ---
        

        // Set initial grid state
        if (this.gridEnabled) {
            this.canvasContainer.classList.add('grid-enabled');
        } else {
            this.canvasContainer.classList.add('without-grid');
        }
        this.saveState()
    }

    // Add this method to your SVGEditor class

    handleCanvasResize() {
        const containerWidth = this.canvasContainer.clientWidth;
        const containerHeight = this.canvasContainer.clientHeight;

        if (this.viewBox.width > 0 && containerWidth > 0) {
            // 1. Calculate current Zoom Scale (Pixels per SVG Unit)
            // We use the width ratio to determine the scale
            const currentScale = containerWidth / this.viewBox.width;
            
            // 2. Calculate the current center point of the view
            const centerX = this.viewBox.x + (this.viewBox.width / 2);
            const centerY = this.viewBox.y + (this.viewBox.height / 2);

            // 3. Calculate new dimensions based on the container size
            // This keeps the zoom level constant (objects stay same size) 
            // but reveals more/less of the canvas area.
            const newViewWidth = containerWidth / currentScale;
            const newViewHeight = containerHeight / currentScale;

            // 4. Apply new viewBox, keeping the center point fixed
            this.viewBox = {
                x: centerX - (newViewWidth / 2),
                y: centerY - (newViewHeight / 2),
                width: newViewWidth,
                height: newViewHeight
            };
            
            // 5. Update DOM
            this.canvas.setAttribute('viewBox', 
                `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`);
            
            // 6. Refresh Grid
            this.updateGrid();
            this.updateAxes();
        }
    }

    setupContextMenuResizer() {
        const resizer = document.getElementById('contextResizer');
        const sidebar = document.querySelector('.context-menu');

        if (!resizer || !sidebar) return;

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            
            // UI Feedback
            resizer.classList.add('active');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none'; // Prevent text selection

            // Initial values
            const startX = e.clientX;
            const startWidth = parseInt(document.defaultView.getComputedStyle(sidebar).width, 10);

            const doDrag = (e) => {
                // Calculate new width (Mouse moving Left increases width)
                const newWidth = startWidth + (startX - e.clientX);

                // Apply limits (min 200px, max 600px)
                if (newWidth > 200 && newWidth < 600) {
                    sidebar.style.width = `${newWidth}px`;
                    
                    // CRITICAL: Update the canvas grid immediately
                    this.handleCanvasResize();
                }
            };

            const stopDrag = () => {
                resizer.classList.remove('active');
                document.body.style.cursor = 'default';
                document.body.style.userSelect = '';
                
                document.removeEventListener('mousemove', doDrag);
                document.removeEventListener('mouseup', stopDrag);
                
                // Final update to ensure everything is crisp
                this.handleCanvasResize();
            };

            document.addEventListener('mousemove', doDrag);
            document.addEventListener('mouseup', stopDrag);
        });
    }

    setupToolbar() {
        // Canvas mode buttons
        document.getElementById('selectModeBtn').addEventListener('click', () => {
            this.setCanvasMode('select');
        });
        
        document.getElementById('panModeBtn').addEventListener('click', () => {
            this.setCanvasMode('pan');
        });
        
        // Grid toggle
        document.getElementById('gridToggleBtn').addEventListener('click', () => {
            this.toggleGridFromToolbar();
        });
        
        // Snap toggle
        document.getElementById('snapToggleBtn').addEventListener('click', () => {
            this.toggleSnap();
        });
        
        // Zoom buttons
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.zoomIn();
        });
        
        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.zoomOut();
        });
        
        document.getElementById('zoomResetBtn').addEventListener('click', () => {
            this.resetZoom();
        });
    }

    setupMenuHandlers() {
        // File menu
        document.getElementById('menuNew').addEventListener('click', () => this.newDocument());
        const openBtn = document.getElementById('menuOpen');
        if (openBtn) {
            openBtn.addEventListener('click', () => this.triggerOpen());
        }
        document.getElementById('menuSave').addEventListener('click', () => this.saveSVG());
        document.getElementById('menuDashboardSave').addEventListener('click', () => this.saveToStorage());
        document.getElementById('menuExport').addEventListener('click', () => this.exportPNG());
        // document.getElementById('menuPrint').addEventListener('click', () => this.printDocument());
        document.getElementById('menuExit').addEventListener('click', () => this.exitApplication());
        
        // Edit menu
        document.getElementById('menuSelectAll').addEventListener('click', () => this.selectAllElements());
        document.getElementById('menuClearSelection').addEventListener('click', () => this.clearSelection());
        
        // Modify menu
        // document.getElementById('menuGroup').addEventListener('click', () => this.groupElements());
        

        document.getElementById('menuRotate').addEventListener('click', () => this.rotateElementByAngle());
        document.getElementById('menuScale').addEventListener('click', () => this.showScaleDialog());
        document.getElementById('menuFlipH').addEventListener('click', () => this.flipHorizontal());
        document.getElementById('menuFlipV').addEventListener('click', () => this.flipVertical());
        
        // View menu
        document.getElementById('menuZoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('menuZoomOut').addEventListener('click', () => this.zoomOut());
        document.getElementById('menuResetZoom').addEventListener('click', () => this.resetZoom());
        document.getElementById('menuToggleGrid').addEventListener('click', () => this.toggleGridFromToolbar());
        document.getElementById('menuFullscreen').addEventListener('click', () => this.toggleFullscreen());
        

        // Settings Menu Handler
        const menuSettings = document.getElementById('menuSettings');
        const settingsModal = document.getElementById('settingsModal');
        
        if (menuSettings && settingsModal) {
            menuSettings.addEventListener('click', () => {
                settingsModal.style.display = 'flex';
            });
            
            // Close when clicking background
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    settingsModal.style.display = 'none';
                }
            });
        }
        // Help menu
        
        document.getElementById('menuShortcuts').addEventListener('click', () => this.showShortcuts());
        document.getElementById('menuAbout').addEventListener('click', () => this.showAbout());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Unit selector
        document.getElementById('unitSelector').addEventListener('change', (e) => {
            this.currentUnits = e.target.value;
            this.updateUnitInfo();
            this.updateGrid();
            // this.updateCoordinateInputs();
        });
    }

    // Convert screen coordinates to SVG coordinates
   // Find this method in your class and replace it entirely

    setupKeyboardModifiers() {
        // Track Ctrl and Shift keys
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Control') {
                this.ctrlKeyPressed = true;
            } else if (e.key === 'Shift') {
                this.shiftKeyPressed = true;
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'Control') {
                this.ctrlKeyPressed = false;
            } else if (e.key === 'Shift') {
                this.shiftKeyPressed = false;
            }
        });
    }

    setupShiftKeyListener() {
        // Track both Ctrl and Shift keys
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Shift') {
                this.shiftKeyPressed = true;
            } else if (e.key === 'Control') {
                this.ctrlKeyPressed = true;
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') {
                this.shiftKeyPressed = false;
            } else if (e.key === 'Control') {
                this.ctrlKeyPressed = false;
            }
        });
    }

    handleKeyboardShortcuts(e) {
        // Get the currently focused element
        const activeElement = document.activeElement;
        const isInputField = activeElement && 
                            (activeElement.tagName === 'INPUT' || 
                            activeElement.tagName === 'TEXTAREA' || 
                            activeElement.tagName === 'SELECT' ||
                            activeElement.isContentEditable);
        
        // Debug logging (optional)
        console.log('Key:', e.key, 'Target:', activeElement.tagName, 'isInputField:', isInputField);
        
        // Handle delete/backspace - skip if in input field
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedElements.length > 0) {
            if (isInputField) {
                // Allow normal delete behavior in input fields
                return;
            }
            
            e.preventDefault();
            this.deleteSelectedElements();
            return;
        }
        
        // If we're in an input field, only handle specific shortcuts
        if (isInputField) {
            // Allow navigation within the input
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                return;
            }
            
            // Allow text selection shortcuts
            if ((e.ctrlKey || e.metaKey) && 
                ['a', 'c', 'x', 'v', 'z', 'y'].includes(e.key.toLowerCase())) {
                // Let these pass through for normal text editing
                return;
            }
            
            // For other keys, stop them from affecting the editor
            e.stopPropagation();
            return;
        }
        
        // Check if Ctrl key is pressed (or Cmd on Mac)
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'n':
                    e.preventDefault();
                    this.newDocument();
                    break;
                case 's':
                    e.preventDefault();
                    this.saveSVG();
                    break;
                case 'g':
                    e.preventDefault();
                    this.toggleGridFromToolbar();
                    break;
                case 'a':
                    e.preventDefault(); // Stop browser from selecting page text
                    this.selectAllElements();
                    break;
                case '0':
                    e.preventDefault();
                    this.resetZoom();
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    this.zoomIn();
                    break;
                case '-':
                case '_':
                    e.preventDefault();
                    this.zoomOut();
                    break;
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo(); // Ctrl+Shift+Z
                    } else {
                        this.undo(); // Ctrl+Z
                    }
                    break;
                case 'y':
                    e.preventDefault();
                    this.redo(); // Ctrl+Y
                    break;
                case 'c':
                    e.preventDefault();
                    this.copySelection();
                    break;
                case 'x':
                    e.preventDefault();
                    this.cutSelection();
                    break;
                case 'v':
                    e.preventDefault();
                    this.pasteFromClipboard();
                    break;
            }
        }
        
        // Handle arrow keys for moving elements
        if (this.selectedElements.length > 0) {
            switch(e.key) {
                case 'ArrowUp':
                case 'ArrowDown':
                case 'ArrowLeft':
                case 'ArrowRight':
                    e.preventDefault(); // Prevent page scrolling
                    this.handleArrowKeyMovement(e.key, e.ctrlKey, e.shiftKey);
                    break;
                case 'Delete':
                case 'Backspace':
                    e.preventDefault();
                    this.deleteSelectedElements();
                    break;
            }
        }
        
        // F11 for fullscreen
        if (e.key === 'F11') {
            e.preventDefault();
            this.toggleFullscreen();
        }
        
        // Space bar to toggle between select and pan modes
        if (e.key === ' ' && !isInputField) {
            e.preventDefault();
            this.toggleCanvasMode();
        }
    }

    // 1. First, add the utility method to the SVGEditor class:

    saveState() {
        // 1. If we are in the middle of the stack, remove future history
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // 2. Serialize user elements (Clone and Clean)
        const userElements = this.getUserElements();
        
        // Create a clean string representation without editor artifacts (like outline styles)
        const state = userElements.map(el => {
            const clone = el.cloneNode(true);
            
            // Remove selection outline style if present
            // This ensures history items are clean "data", not UI state
            clone.style.outline = ''; 
            clone.style.cursor = '';
            
            return clone.outerHTML;
        }).join('');

        // 3. Only push if state is different from current tip
        const currentState = this.history[this.historyIndex];
        
        // Simple string comparison usually works for SVG logic
        if (state !== currentState) {
            this.history.push(state);
            this.historyIndex++;

            // 4. Enforce limit
            if (this.history.length > this.maxHistory) {
                this.history.shift();
                this.historyIndex--;
            }
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            console.log(`Undo to Index: ${this.historyIndex}`);
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    restoreState(stateString) {
        try {
            // 1. Validate SelectionGroup existence
            if (!this.selectionGroup || !this.canvas.contains(this.selectionGroup)) {
                const ns = "http://www.w3.org/2000/svg";
                this.selectionGroup = document.createElementNS(ns, 'g');
                this.selectionGroup.setAttribute('class', 'selection-group');
                this.canvas.appendChild(this.selectionGroup);
            }

            // 2. Clear selection state first
            this.clearSelection();

            // 3. Remove current USER elements only
            const currentElements = this.getUserElements();
            currentElements.forEach(el => el.remove());

            // 4. Parse and Insert new elements from state
            if (stateString && stateString.trim().length > 0) {
                // FIX: Parse as XML/SVG to preserve Namespace
                const parser = new DOMParser();
                // Wrap in a dummy SVG to ensure namespace context is handled correctly
                const docString = `<svg xmlns="http://www.w3.org/2000/svg">${stateString}</svg>`;
                const doc = parser.parseFromString(docString, "image/svg+xml");
                
                // Check for parser errors
                const parserError = doc.querySelector("parsererror");
                if (parserError) {
                    console.error("Undo parsing error", parserError);
                    return;
                }

                // Extract the child nodes from the parsed SVG
                const newNodes = Array.from(doc.documentElement.childNodes);

                newNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        // Must use importNode to bring it into the current document
                        const clone = document.importNode(node, true);
                        this.canvas.insertBefore(clone, this.selectionGroup);
                    }
                });
            }

            // 5. Force UI Update
            this.updateContextMenu();
            this.updateElementsListHighlight();
            
        } catch (e) {
            console.error("Undo Error:", e);
        }
    }
    // --- Clipboard (Copy/Cut/Paste) System ---

    copySelection() {
        if (this.selectedElements.length === 0) return;
        this.clipboard = this.selectedElements.map(el => {
            const clone = el.cloneNode(true);
            clone.removeAttribute('id'); 
            clone.style.outline = 'none'; 
            return clone;
        });
    }

    cutSelection() {
        if (this.selectedElements.length === 0) return;
        this.copySelection();
        // Delete immediately without confirmation
        this.performDeleteElements(false);
    }

    pasteFromClipboard() {
        if (this.clipboard.length === 0) return;

        this.clearSelection();
        const newSelection = [];
        const offset = 20 * (1 / this.zoomLevel);

        this.clipboard.forEach(node => {
            const clone = node.cloneNode(true);
            this.moveElementBy(clone, offset, offset);
            this.canvas.insertBefore(clone, this.selectionGroup);
            newSelection.push(clone);
        });

        this.selectedElements = newSelection;
        this.selectedElements.forEach(el => el.style.outline = '2px dashed #007acc');
        
        this.updateSelectionHandles();
        this.updateContextMenuValues();
        this.updateElementsListHighlight();
        this.saveState();
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    showShortcuts() {
        alert('Keyboard Shortcuts:\n\n' +
              'Ctrl+N: New Document\n' +
              'Ctrl+S: Save SVG\n' +
              'Ctrl+G: Toggle Grid\n' +
              'Ctrl+A: Select All\n' +
              'Ctrl+0: Reset Zoom\n' +
              'Ctrl++: Zoom In\n' +
              'Ctrl+-: Zoom Out\n' +
              'Ctrl+Scroll: Zoom In/Out\n' +
              'Space: Toggle Select/Pan Mode\n' +
              'Drag Background: Pan Canvas\n' +
              'F11: Toggle Fullscreen');
    }

    showAbout() {
        document.getElementById('aboutModal').style.display = 'flex';
    }




    // Context Menu
    // Add these methods to the SVGEditor class

    // Add this method to update context menu

    exitApplication() {
        if (confirm('Are you sure you want to exit?')) {
            window.close();
        }
    }

    newDocument() {
        if (confirm('Create new document? Unsaved changes will be lost.')) {
            // 1. Clear Selection & Inputs
            this.clearSelection();
            this.editingInputs.clear();
            
            // 2. Reset History
            this.history = [];
            this.historyIndex = -1;
            
            // 3. Rebuild Canvas Structure
            // This clears innerHTML and correctly recreates gridGroup, axesGroup, and selectionGroup
            this.setupCoordinateSystem();
            
            // 4. Save the clean state
            this.saveState();
            
            // 5. Update UI
            this.updateContextMenu();
            
            // 6. Reset Zoom (Optional, usually expected on new doc)
            this.resetZoom();
        }
    }

    // FIND THIS METHOD AND REPLACE IT

    triggerOpen() {
        // Create a hidden file input dynamically
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.svg,image/svg+xml';
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.loadSVGContent(event.target.result);
                };
                reader.onerror = (err) => {
                    console.error("Error reading file:", err);
                    alert("Failed to read file.");
                };
                reader.readAsText(file);
            }
        });
        
        // Trigger the dialog
        fileInput.click();
    }

      // Find this method in your code

    loadSVGContent(svgString, forcedMode = null) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgString, "image/svg+xml");
            
            const errorNode = doc.querySelector('parsererror');
            if (errorNode) throw new Error("Invalid SVG file format.");

            const newSVG = doc.documentElement;

            // Determine Mode
            let mode;
            if (forcedMode) {
                mode = forcedMode;
            } else {
                mode = confirm("Click OK to Replace current document.\nClick Cancel to Append to current document.") 
                ? 'replace' 
                : 'append';
            }

            // 1. Prepare Canvas
            if (mode === 'replace') {
                const userElements = this.getUserElements();
                userElements.forEach(el => el.remove());
                this.clearSelection();
                
                // --- FIX 1: Aspect Ratio Correction ---
                // Get dimensions from file
                let x = 0, y = 0, w = 1200, h = 900;
                const vb = newSVG.getAttribute('viewBox');
                
                if (vb) {
                    const parts = vb.split(/[\s,]+/).map(parseFloat);
                    if (parts.length === 4 && !parts.some(isNaN)) {
                        x = parts[0]; y = parts[1]; w = parts[2]; h = parts[3];
                    }
                } else {
                    const attrW = parseFloat(newSVG.getAttribute('width'));
                    const attrH = parseFloat(newSVG.getAttribute('height'));
                    if (!isNaN(attrW) && !isNaN(attrH)) {
                        w = attrW; h = attrH;
                    }
                }

                // Calculate screen aspect ratio
                const screenRect = this.canvasContainer.getBoundingClientRect();
                const screenAspect = screenRect.width / screenRect.height;
                const svgAspect = w / h;

                // Adjust viewBox to fill screen (expand, don't stretch)
                if (screenAspect > svgAspect) {
                    // Screen is wider: expand width
                    const newWidth = h * screenAspect;
                    x -= (newWidth - w) / 2; // Center horizontally
                    w = newWidth;
                } else {
                    // Screen is taller: expand height
                    const newHeight = w / screenAspect;
                    y -= (newHeight - h) / 2; // Center vertically
                    h = newHeight;
                }

                this.viewBox = { x, y, width: w, height: h };
            }

            // 2. Import Elements
            const importedNodes = Array.from(newSVG.childNodes);
            
            // This ensures the imported file acts as ONE object you can move
            const ns = "http://www.w3.org/2000/svg";
            const wrapperGroup = document.createElementNS(ns, 'g');
            wrapperGroup.setAttribute('class', 'imported-content');
            // NEW: Explicitly tag this as a Structure
            wrapperGroup.setAttribute('data-type', 'structure');
            
            // If appending, offset slightly so it doesn't overlap perfectly
            if (mode === 'append') {
                wrapperGroup.setAttribute('transform', 'translate(20, 20)');
            }

            importedNodes.forEach(node => {
                if (node.nodeType !== 1) return; // Skip non-elements
                
                // Skip editor infrastructure if importing a file saved by this editor
                if (node.classList && (
                    node.classList.contains('grid-group') ||
                    node.classList.contains('axes-group') ||
                    node.classList.contains('selection-group') ||
                    node.classList.contains('resizer') // Skip UI elements
                )) return;

                // Handle Defs globally
                if (node.tagName.toLowerCase() === 'defs') {
                    let canvasDefs = this.canvas.querySelector('defs');
                    if (!canvasDefs) {
                        canvasDefs = document.createElementNS(ns, 'defs');
                        this.canvas.insertBefore(canvasDefs, this.canvas.firstChild);
                    }
                    Array.from(node.children).forEach(def => {
                        if (def.id && !document.getElementById(def.id)) {
                            canvasDefs.appendChild(document.importNode(def, true));
                        }
                    });
                    return;
                }

                // Import graphical elements
                // REMOVED THE FLATTENING LOGIC HERE
                const clone = document.importNode(node, true);
                
                // Clean up IDs to avoid duplicates
                if (clone.id) clone.removeAttribute('id');
                
                // Add to wrapper
                wrapperGroup.appendChild(clone);
            });

            // Only add the wrapper if it has children
            if (wrapperGroup.children.length > 0) {
                this.canvas.insertBefore(wrapperGroup, this.selectionGroup);
                
                // Select the new import immediately
                this.selectElement(wrapperGroup);
            }

            // 3. Finalize
            this.history = [];
            this.historyIndex = -1;
            this.updateViewBox(); 
            this.saveState();
            this.updateContextMenu();
            this.updateElementsListHighlight();

        } catch (e) {
            console.error("Error parsing SVG:", e);
            alert("Error opening file: " + e.message);
        }
    }

    clearCanvas() {
        if (confirm('Clear the entire canvas?')) {
            const axes = Array.from(this.canvas.querySelectorAll('.axis-line, .axis-label, .grid-label'));
            this.canvas.innerHTML = '';
            axes.forEach(axis => this.canvas.appendChild(axis));
            this.selectedElement = null;
            this.removeSelectionHandles();
            // this.hideCoordinateInputs();
        }
        // Add to clearCanvas() method
        this.updateContextMenu();
    }

    batchUpdates(callback) {
        // If already in a batch, just execute
        if (this.batchUpdateDepth > 0) {
            callback();
            return;
        }
        
        this.batchUpdateDepth = 0;
        
        // Start batch
        this.batchUpdateDepth++;
        try {
            callback();
        } finally {
            // End batch
            this.batchUpdateDepth = Math.max(0, this.batchUpdateDepth - 1);
            if (this.batchUpdateDepth === 0 && this.batchUpdateCallback) {
                const cb = this.batchUpdateCallback;
                this.batchUpdateCallback = null;
                cb();
            }
        }
    }
                getTransformedPoints(element) {
        const points = [];
        const tagName = element.tagName.toLowerCase();
        const transform = element.getAttribute('transform') || '';
        let rotation = 0, cx = 0, cy = 0;
        
        if (transform.includes('rotate')) {
            const match = transform.match(/rotate\(([-\d.]+)(?:,\s*([-\d.]+),\s*([-\d.]+))?\)/);
            if (match) {
                rotation = parseFloat(match[1]) * Math.PI / 180;
                if (match[2]) { cx = parseFloat(match[2]); cy = parseFloat(match[3]); }
                else {
                    const bbox = element.getBBox();
                    cx = bbox.x + bbox.width/2;
                    cy = bbox.y + bbox.height/2;
                }
            }
        }

        const rotatePoint = (x, y) => {
            if (rotation === 0) return {x, y};
            return {
                x: cx + (x - cx) * Math.cos(rotation) - (y - cy) * Math.sin(rotation),
                y: cy + (x - cx) * Math.sin(rotation) + (y - cy) * Math.cos(rotation)
            };
        };

        if (tagName === 'rect') {
            const x = parseFloat(element.getAttribute('x') || 0);
            const y = parseFloat(element.getAttribute('y') || 0);
            const w = parseFloat(element.getAttribute('width') || 0);
            const h = parseFloat(element.getAttribute('height') || 0);
            points.push(rotatePoint(x, y)); // NW
            points.push(rotatePoint(x + w, y)); // NE
            points.push(rotatePoint(x + w, y + h)); // SE
            points.push(rotatePoint(x, y + h)); // SW
        } else if (tagName === 'line') {
            points.push(rotatePoint(parseFloat(element.getAttribute('x1')), parseFloat(element.getAttribute('y1'))));
            points.push(rotatePoint(parseFloat(element.getAttribute('x2')), parseFloat(element.getAttribute('y2'))));
        }
        // Add center points for circles/ellipses/text if desired, but request emphasized lines/rects
        
        return points;
    }

async saveToStorage() {
try {
// 1. Get clean SVG string (Must use await!)
const svgContent = await this.getCleanSVG(); 

// 2. Prepare Project Data
const newProject = {
    id: Date.now(),
    name: "Editor Project " + new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
    type: 'editor',
    content: svgContent
};

// 3. Save to LocalStorage
const projects = JSON.parse(localStorage.getItem('vc_projects') || '[]');
projects.push(newProject);
localStorage.setItem('vc_projects', JSON.stringify(projects));

// 4. Feedback
            alert("Project Saved to Dashboard!");
            
        } catch (e) {
            console.error("Error saving to dashboard:", e);
            alert("Failed to save project. See console for details.");
        }
    }

}
