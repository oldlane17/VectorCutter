/**
 * VectorCutter - SVG Editor Module
 * Module: editor-tools.js
 * Description: Tool Modes, Mouse Event Handlers & Shape Creation
 */

Object.assign(SVGEditor.prototype, {
    setupTools() {
        // Add path tool to the available tools
        this.tools = ['select', 'rectangle', 'circle', 'ellipse', 'line', 'path', 'text'];
        this.properties = {
            fill: '#4CAF50',
            stroke: '#000000',
            strokeWidth: 2,
            opacity: 1
        };
    },

    setCanvasMode(mode) {
        this.canvasMode = mode;
        
        // Update toolbar button states
        document.getElementById('selectModeBtn').classList.toggle('active', mode === 'select');
        document.getElementById('panModeBtn').classList.toggle('active', mode === 'pan');
        
        // Update cursor
        this.updateCanvasCursor();
        
        // Show mode in status bar
        this.updateStatusBarMode();
    },

    toggleCanvasMode() {
        const newMode = this.canvasMode === 'select' ? 'pan' : 'select';
        this.setCanvasMode(newMode);
    },

    toggleGridFromToolbar() {
        this.gridEnabled = !this.gridEnabled;
        const gridBtn = document.getElementById('gridToggleBtn');
        gridBtn.classList.toggle('active', this.gridEnabled);
        
        // UPDATED: Includes the IMG tag in the innerHTML update
        const iconPath = "sidebar/grid.svg";
        gridBtn.innerHTML = `<img src="${iconPath}" alt="Grid"> ${this.gridEnabled ? 'Grid On' : 'Grid Off'}`;
        
        // Update the SVG grid
        this.updateGrid();
        this.updateStatusBarMode();
    },

    toggleSnap() {
        this.snapEnabled = !this.snapEnabled;
        const snapBtn = document.getElementById('snapToggleBtn');
        snapBtn.classList.toggle('active', this.snapEnabled);
        
        // UPDATED: Includes the IMG tag in the innerHTML update
        const iconPath = "sidebar/snap.svg";
        snapBtn.innerHTML = `<img src="${iconPath}" alt="Snap"> ${this.snapEnabled ? 'Snap On' : 'Snap Off'}`;
        
        // Show a message about snap functionality
        if (this.snapEnabled) {
            console.log('Snap to grid enabled - Elements will snap to grid points');
        } else {
            console.log('Snap to grid disabled');
        }
        this.updateStatusBarMode();
    }
    
    // Add methods to manage editing state,

    handleMouseDown(e) {
        let svgPoint = this.screenToSVG(e.clientX, e.clientY);
        
        // FIX 1: Bubble up selection from tspan to text
        // If user clicks a tspan (edited text), select the parent <text> element
        let target = e.target;
        if (target.tagName.toLowerCase() === 'tspan' && target.parentElement && target.parentElement.tagName.toLowerCase() === 'text') {
            target = target.parentElement;
        }

        if (this.canvasMode === 'pan') {
            this.startPanning(e.clientX, e.clientY);
            return;
        }
        
        // Handle Handles First
        if (target.classList.contains('selection-handle')) {
            if (target.classList.contains('rotate')) {
                this.startRotating(e.clientX, e.clientY);
            } else if (target.classList.contains('curve-control')) {
                this.isModifyingCurve = true;
                this.selectedElement = this.selectedElements[0]; 
                e.stopPropagation();
                return;
            } else {
                this.startResizing(target.dataset.handle, e.clientX, e.clientY);
            }
            e.stopPropagation();
            return;
        }

        // Snap Start Point for Drawing tools
        if (['rectangle', 'circle', 'ellipse', 'line', 'path', 'curve', 'text'].includes(this.currentTool)) {
            const snap = this.findSnapTarget(svgPoint.x, svgPoint.y, null);
            if (snap.snapped) {
                svgPoint.x = snap.x;
                svgPoint.y = snap.y;
            }
        }

        if (target.classList.contains('selection-rect')) {
            this.isDragging = true;
            this.dragStartScreen = { x: e.clientX, y: e.clientY };
            this.dragStartSVG = this.screenToSVG(e.clientX, e.clientY);
            if (this.selectedElements.length > 0) {
                this.dragStartElementCenters = this.selectedElements.map(el => {
                    try {
                        return {
                            x: this.getElementCenterX(el),
                            y: this.getElementCenterY(el)
                        };
                    } catch (error) {
                        return { x: 0, y: 0 };
                    }
                });
            }
            e.stopPropagation();
            return;
        }

        // Selection Logic (using the corrected 'target')
        if (target !== this.canvas && !target.classList.contains('axis-line') && 
            !target.classList.contains('axis-label') && !target.classList.contains('grid-label')) {
            
                
            // 1. Find the "Selectable" Parent
            // Because imported files have nested structures (<g><path/></g>), 
            // we need to find the element that is a direct child of the SVG canvas.
            let selectableTarget = target;
            while (selectableTarget.parentNode && selectableTarget.parentNode !== this.canvas) {
                selectableTarget = selectableTarget.parentNode;
            }

            if (!(selectableTarget instanceof SVGGraphicsElement)) return;

            target = selectableTarget;
            
            if (e.ctrlKey || e.metaKey) {
                const index = this.selectedElements.indexOf(target);
                if (index > -1) {
                    target.style.outline = 'none';
                    this.selectedElements.splice(index, 1);
                } else {
                    target.style.outline = '2px dashed #007acc';
                    this.selectedElements.push(target);
                }
            } else {
                this.clearSelection();
                this.selectedElements = [target];
                target.style.outline = '2px dashed #007acc';
                this.selectedElement = target;
            }
            this.isDragging = true;
            this.dragStartScreen = { x: e.clientX, y: e.clientY };
            this.dragStartSVG = this.screenToSVG(e.clientX, e.clientY);
            this.dragStartElementCenters = this.selectedElements.map(el => {
                try {
                    return {
                        x: this.getElementCenterX(el),
                        y: this.getElementCenterY(el)
                    };
                } catch (error) {
                    return { x: 0, y: 0 };
                }
            });
            this.updateSelectionHandles();
            this.updateContextMenu();
            e.stopPropagation();
            return;
        }

        // Background click (Deselect / Start Draw)
        if (target === this.canvas || target.classList.contains('axis-line') || 
            target.classList.contains('axis-label') || target.classList.contains('grid-label')) {
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                this.clearSelection();
            }
            if (this.currentTool === 'select') {
                this.startAreaSelection(e.clientX, e.clientY);
            } else if (this.currentTool === 'path') {
                this.startPathDrawing(svgPoint.x, svgPoint.y);
            } else {
                this.startX = svgPoint.x;
                this.startY = svgPoint.y;
                this.isDrawing = true;
                this.createNewElement();
            }
            this.updateContextMenu();
            return;
        }
    },

    handleMouseMove(e) {
        let svgPoint = this.screenToSVG(e.clientX, e.clientY);
        
        if (this.isPanning) {
            this.pan(e.clientX, e.clientY);
        } else if (this.isPathDrawing && this.currentElement) {
            // Snap for Path
            if (this.snapEnabled) {
                const snap = this.findSnapTarget(svgPoint.x, svgPoint.y, this.currentElement);
                if (snap.snapped) { svgPoint.x = snap.x; svgPoint.y = snap.y; }
            }
            if (this.pathPoints) {
                this.pathPoints.push({ x: svgPoint.x, y: svgPoint.y });
                this.updatePathDrawing();
            }
        } else if (this.isDrawing && this.currentElement) {
            // Snap for basic shapes
            if (this.snapEnabled) {
                const snap = this.findSnapTarget(svgPoint.x, svgPoint.y, this.currentElement);
                if (snap.snapped) { svgPoint.x = snap.x; svgPoint.y = snap.y; }
            }
            this.updateElementDimensions(svgPoint.x, svgPoint.y);
        } else if (this.isResizing && this.selectedElement) {
            this.resizeElement(e.clientX, e.clientY);
        } else if (this.isRotating && this.selectedElement) {
            this.rotateElement(e.clientX, e.clientY);
        
        } else if (this.isModifyingCurve && this.selectedElement) {
            this.updateCurveControlPoint(e.clientX, e.clientY);
        } else if (this.isSelecting) {
            this.updateAreaSelection(e.clientX, e.clientY);
        } else if (this.isDragging) {
            if (this.selectedElements.length > 0 && this.dragStartElementCenters) {
                // const deltaScreenX = e.clientX - this.dragStartScreen.x;
                // const deltaScreenY = e.clientY - this.dragStartScreen.y;
                // const rect = this.canvas.getBoundingClientRect();
                // const deltaX = (deltaScreenX / rect.width) * this.viewBox.width;
                // const deltaY = (deltaScreenY / rect.height) * this.viewBox.height;
                const currentSVG = this.screenToSVG(e.clientX, e.clientY);
                // Calculate the distance moved in pure SVG units
                const deltaX = currentSVG.x - this.dragStartSVG.x;
                const deltaY = currentSVG.y - this.dragStartSVG.y;
                this.selectedElements.forEach((element, index) => {
                    if (this.dragStartElementCenters[index]) {
                        const newCenterX = this.dragStartElementCenters[index].x + deltaX;
                        const newCenterY = this.dragStartElementCenters[index].y + deltaY;
                        this.moveElement(element, newCenterX, newCenterY);
                    }
                });
                this.updateSelectionHandles();
                this.updateContextMenuValues();
            }
        }
    },

    handleMouseUp(e) {
        // Handle path drawing completion
        if (this.isPathDrawing) {
            this.isPathDrawing = false;
            this.isDrawing = false;
            
            if (this.currentElement && this.pathPoints && this.pathPoints.length > 1) {
                this.selectElement(this.currentElement);
            } else {
                // If path has only one point, remove it
                if (this.currentElement) {
                    this.currentElement.remove();
                    this.currentElement = null;
                }
            }
            this.pathPoints = null;
        } else if (this.isDrawing) {
            this.isDrawing = false;
            
            if (this.currentElement) {
                this.selectElement(this.currentElement);
            }
        }
        
        if (this.isSelecting) {
            this.finishAreaSelection();
        }
        
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        this.isModifyingCurve = false; // Stop modifying
        this.stopPanning();
        
        // Clear drag data
        this.dragStartElementCenters = null;
        
        this.currentElement = null;
        this.updateContextMenuValues();
        if (this.currentElement || this.selectedElement) {
            this.saveState(); 
        }
    }  ,

    bindEvents() {
        // Tool selection
         document.querySelectorAll('.tool').forEach(tool => {
            // Skip the edit code button as it's not a drawing tool
            if (tool.id === 'editCodeBtn') return;
            
            tool.addEventListener('click', (e) => {
                // Skip actions like "Show Code"
                if (e.currentTarget.dataset.action) return;
                
                document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentTool = e.currentTarget.dataset.tool;
                this.updateCanvasCursor();
            });
        });

        // Canvas events
        // Canvas events
        this.canvasContainer.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvasContainer.addEventListener('mousemove', this.handleMouseMove.bind(this));
        // Use window for mouseup to catch releases outside the canvas
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvasContainer.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

        // Cursor position tracking
        this.canvasContainer.addEventListener('mousemove', (e) => {
            const svgPoint = this.screenToSVG(e.clientX, e.clientY);
            const unitX = this.formatUnitValue(svgPoint.x);
            const unitY = this.formatUnitValue(svgPoint.y);
            document.getElementById('cursorPos').textContent = `X: ${unitX}, Y: ${unitY} ${this.currentUnits}`;
        });

        // Edit Code Button
        document.getElementById('editCodeBtn').addEventListener('click', () => this.toggleCodeEditor());
        document.getElementById('applyCodeBtn').addEventListener('click', () => this.applyCodeToCanvas());

        document.querySelector('[data-action="code"]').addEventListener('click', () => this.showCode());
    },

    createNewElement() {
        if (this.currentTool === 'path') {
            // Path is handled separately in startPathDrawing
            return;
        }
        const ns = "http://www.w3.org/2000/svg";
        
        switch (this.currentTool) {
            case 'rectangle':
                this.currentElement = document.createElementNS(ns, 'rect');
                this.currentElement.setAttribute('x', this.startX);
                this.currentElement.setAttribute('y', this.startY);
                this.currentElement.setAttribute('width', '0');
                this.currentElement.setAttribute('height', '0');
                break;
            case 'circle':
                this.currentElement = document.createElementNS(ns, 'circle');
                this.currentElement.setAttribute('cx', this.startX);
                this.currentElement.setAttribute('cy', this.startY);
                this.currentElement.setAttribute('r', '0');
                break;
            case 'ellipse':
                this.currentElement = document.createElementNS(ns, 'ellipse');
                this.currentElement.setAttribute('cx', this.startX);
                this.currentElement.setAttribute('cy', this.startY);
                this.currentElement.setAttribute('rx', '0');
                this.currentElement.setAttribute('ry', '0');
                break;
            case 'curve':
                this.currentElement = document.createElementNS(ns, 'path');
                // Tag it so our logic knows this is a Curve tool object
                this.currentElement.setAttribute('data-type', 'curve'); 
                
                // Set initial degenerate path (start point)
                this.currentElement.setAttribute('d', `M ${this.startX} ${this.startY} Q ${this.startX} ${this.startY} ${this.startX} ${this.startY}`);
                
                // Curves should usually be hollow
                this.currentElement.setAttribute('fill', 'none');
                break;
            case 'line':
                this.currentElement = document.createElementNS(ns, 'line');
                this.currentElement.setAttribute('x1', this.startX);
                this.currentElement.setAttribute('y1', this.startY);
                this.currentElement.setAttribute('x2', this.startX);
                this.currentElement.setAttribute('y2', this.startY);
                break;
            case 'text':
                this.currentElement = document.createElementNS(ns, 'text');
                this.currentElement.setAttribute('x', this.startX);
                this.currentElement.setAttribute('y', this.startY);
                this.currentElement.setAttribute('font-family', 'Arial'); // Add this line
                this.currentElement.textContent = 'Text';
                break;
        }

        if (this.currentElement) {
            this.applyProperties(this.currentElement);
            this.canvas.appendChild(this.currentElement);
            this.selectElement(this.currentElement);
        }
        // Removed this.saveState() to prevent saving empty/intermediate states
    },

    updateElementDimensions(currentX, currentY) {
        if (!this.currentElement) return;

        switch (this.currentTool) {
            case 'rectangle':
                const width = Math.abs(currentX - this.startX) * 2;
                const height = Math.abs(currentY - this.startY) * 2;
                
                // Calculate top-left corner based on center point (startX, startY)
                const x = this.startX - width / 2;
                const y = this.startY - height / 2;
                
                this.currentElement.setAttribute('x', x);
                this.currentElement.setAttribute('y', y);
                this.currentElement.setAttribute('width', width);
                this.currentElement.setAttribute('height', height);
                break;
            case 'circle':
                const radius = Math.sqrt(
                    Math.pow(currentX - this.startX, 2) + 
                    Math.pow(currentY - this.startY, 2)
                );
                this.currentElement.setAttribute('r', radius);
                break;
            case 'ellipse':
                const rx = Math.abs(currentX - this.startX);
                const ry = Math.abs(currentY - this.startY);
                this.currentElement.setAttribute('rx', rx);
                this.currentElement.setAttribute('ry', ry);
                break;
            case 'line':
                this.currentElement.setAttribute('x2', currentX);
                this.currentElement.setAttribute('y2', currentY);
                break;
            case 'curve':
                // Logic: Start at click, End at mouse pos.
                // Control Point: We calculate a point to make a nice arc while dragging.
                // Using (startX, currentY) creates a simple right-angle bezier curve visual.
                const d = `M ${this.startX} ${this.startY} Q ${this.startX} ${currentY} ${currentX} ${currentY}`;
                this.currentElement.setAttribute('d', d);
                break;
            case 'text':
                // For text, we can update the position while dragging if needed
                this.currentElement.setAttribute('x', currentX);
                this.currentElement.setAttribute('y', currentY);
                break;
        }
    }
    // Add this new method to your class,

    startPathDrawing(startX, startY) {
        const ns = "http://www.w3.org/2000/svg";
        
        this.currentElement = document.createElementNS(ns, 'path');
        this.pathPoints = [{ x: startX, y: startY }];
        this.isDrawing = true;
        this.isPathDrawing = true;
        
        // Start with M (moveto) command
        this.currentElement.setAttribute('d', `M ${startX} ${startY}`);
        
        this.applyProperties(this.currentElement);
        this.canvas.appendChild(this.currentElement);
        
        // Debug log
        console.log('Path drawing started at:', startX, startY);
    },

    updatePathDrawing() {
        if (!this.currentElement || !this.pathPoints || this.pathPoints.length < 2) return;
        
        // Build the path data string
        let pathData = `M ${this.pathPoints[0].x} ${this.pathPoints[0].y}`;
        
        // For all other points, use L (lineto) commands
        for (let i = 1; i < this.pathPoints.length; i++) {
            pathData += ` L ${this.pathPoints[i].x} ${this.pathPoints[i].y}`;
        }
        
        this.currentElement.setAttribute('d', pathData);
    }

});
