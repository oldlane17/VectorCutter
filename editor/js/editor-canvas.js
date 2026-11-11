/**
 * VectorCutter - SVG Editor Module
 * Module: editor-canvas.js
 * Description: ViewBox, Pan, Zoom, Coordinate Systems, Axes, Grid & Screen-SVG Transforms
 */

Object.assign(SVGEditor.prototype, {
    setupCoordinateSystem() {
        // Clear any existing content
        this.canvas.innerHTML = '';
        
        // Set initial viewBox
        this.updateViewBox();
        
        const ns = "http://www.w3.org/2000/svg";
        
        // Create groups for grid, axes, and selection
        this.gridGroup = document.createElementNS(ns, 'g');
        this.gridGroup.setAttribute('class', 'grid-group');
        this.canvas.appendChild(this.gridGroup);
        
        this.axesGroup = document.createElementNS(ns, 'g');
        this.axesGroup.setAttribute('class', 'axes-group');
        this.canvas.appendChild(this.axesGroup);
        
        // Create selection group
        this.selectionGroup = document.createElementNS(ns, 'g');
        this.selectionGroup.setAttribute('class', 'selection-group');
        this.canvas.appendChild(this.selectionGroup);
        
        // Initialize grid and axes
        this.updateGrid();
        this.updateAxes();
    },

    updateAxes() {
        if (!this.axesGroup) return;
        
        // Clear existing axes
        while (this.axesGroup.firstChild) {
            this.axesGroup.removeChild(this.axesGroup.firstChild);
        }
        
        const ns = "http://www.w3.org/2000/svg";
        const viewBox = this.viewBox;
        
        // --- FIX: Unclamped Scaling ---
        // Calculate font size purely based on zoom.
        // At Zoom=1, size=12. At Zoom=10, size=1.2.
        const baseFontSize = 12;
        const fontSize = baseFontSize / this.zoomLevel;
        
        // Calculate line width purely based on zoom.
        const baseLineWidth = 1.5;
        const axisLineWidth = baseLineWidth / this.zoomLevel;
        
        // Draw X-axis
        const xAxis = document.createElementNS(ns, 'line');
        xAxis.setAttribute('x1', viewBox.x);
        xAxis.setAttribute('y1', 0);
        xAxis.setAttribute('x2', viewBox.x + viewBox.width);
        xAxis.setAttribute('y2', 0);
        xAxis.setAttribute('class', 'axis-line');
        xAxis.setAttribute('stroke', '#007acc');
        xAxis.setAttribute('stroke-width', axisLineWidth);
        this.axesGroup.appendChild(xAxis);
        
        // Draw Y-axis
        const yAxis = document.createElementNS(ns, 'line');
        yAxis.setAttribute('x1', 0);
        yAxis.setAttribute('y1', viewBox.y);
        yAxis.setAttribute('x2', 0);
        yAxis.setAttribute('y2', viewBox.y + viewBox.height);
        yAxis.setAttribute('class', 'axis-line');
        yAxis.setAttribute('stroke', '#007acc');
        yAxis.setAttribute('stroke-width', axisLineWidth);
        this.axesGroup.appendChild(yAxis);
        
        // Arrows (Unclamped)
        const arrowSize = 8 / this.zoomLevel;
        
        // Add X-axis arrow
        const xArrow = document.createElementNS(ns, 'polygon');
        xArrow.setAttribute('points', 
            `${viewBox.x + viewBox.width - arrowSize},-${arrowSize/2} ` +
            `${viewBox.x + viewBox.width},0 ` +
            `${viewBox.x + viewBox.width - arrowSize},${arrowSize/2}`
        );
        xArrow.setAttribute('fill', '#007acc');
        this.axesGroup.appendChild(xArrow);
        
        // Add Y-axis arrow
        const yArrow = document.createElementNS(ns, 'polygon');
        yArrow.setAttribute('points', 
            `-${arrowSize/2},${viewBox.y + arrowSize} ` +
            `0,${viewBox.y} ` +
            `${arrowSize/2},${viewBox.y + arrowSize}`
        );
        yArrow.setAttribute('fill', '#007acc');
        this.axesGroup.appendChild(yArrow);
        
        // Add X-axis label
        const xLabel = document.createElementNS(ns, 'text');
        xLabel.setAttribute('x', viewBox.x + viewBox.width - fontSize * 1.5);
        xLabel.setAttribute('y', fontSize);
        xLabel.setAttribute('class', 'axis-label');
        xLabel.setAttribute('fill', '#007acc');
        xLabel.setAttribute('font-size', fontSize);
        xLabel.setAttribute('font-weight', 'bold');
        xLabel.setAttribute('font-family', 'Arial, sans-serif');
        xLabel.textContent = 'X';
        this.axesGroup.appendChild(xLabel);
        
        // Add Y-axis label
        const yLabel = document.createElementNS(ns, 'text');
        yLabel.setAttribute('x', fontSize);
        yLabel.setAttribute('y', viewBox.y + fontSize * 1.5);
        yLabel.setAttribute('class', 'axis-label');
        yLabel.setAttribute('fill', '#007acc');
        yLabel.setAttribute('font-size', fontSize);
        yLabel.setAttribute('font-weight', 'bold');
        yLabel.setAttribute('font-family', 'Arial, sans-serif');
        yLabel.textContent = 'Y';
        this.axesGroup.appendChild(yLabel);
        
        // Add origin label (0,0)
        const originLabel = document.createElementNS(ns, 'text');
        originLabel.setAttribute('x', fontSize * 0.5);
        originLabel.setAttribute('y', fontSize);
        originLabel.setAttribute('class', 'axis-label origin-label');
        originLabel.setAttribute('fill', '#007acc');
        originLabel.setAttribute('font-size', fontSize * 0.7);
        originLabel.setAttribute('font-family', 'Arial, sans-serif');
        originLabel.textContent = '(0,0)';
        this.axesGroup.appendChild(originLabel);
    },

    updateGrid() {
        if (!this.gridGroup) return;
        
        while (this.gridGroup.firstChild) {
            this.gridGroup.removeChild(this.gridGroup.firstChild);
        }
        
        if (!this.gridEnabled) return;
        
        const ns = "http://www.w3.org/2000/svg";
        const viewBox = this.viewBox;
        
        const baseGridSize = 100;
        const gridSize = baseGridSize / this.zoomLevel;
        
        const minGridSize = 10;
        const maxGridSize = 500;
        const adjustedGridSize = Math.max(minGridSize, Math.min(maxGridSize, gridSize));
        
        const startX = Math.floor(viewBox.x / adjustedGridSize) * adjustedGridSize;
        const startY = Math.floor(viewBox.y / adjustedGridSize) * adjustedGridSize;
        const endX = Math.ceil((viewBox.x + viewBox.width) / adjustedGridSize) * adjustedGridSize;
        const endY = Math.ceil((viewBox.y + viewBox.height) / adjustedGridSize) * adjustedGridSize;
        
        // --- FIX: Unclamped Grid Lines ---
        const baseLineWidth = 0.8;
        const lineWidth = baseLineWidth / this.zoomLevel;
        
        const baseOpacity = 0.4;
        const opacity = Math.max(0.1, Math.min(0.8, baseOpacity / this.zoomLevel));
        
        // Draw horizontal grid lines
        for (let y = startY; y <= endY; y += adjustedGridSize) {
            const line = document.createElementNS(ns, 'line');
            line.setAttribute('x1', viewBox.x);
            line.setAttribute('y1', y);
            line.setAttribute('x2', viewBox.x + viewBox.width);
            line.setAttribute('y2', y);
            line.setAttribute('class', 'grid-line');
            
            if (Math.abs(y) < adjustedGridSize * 0.1) {
                line.setAttribute('stroke', `rgba(0, 122, 204, ${Math.min(0.9, opacity * 2)})`);
                line.setAttribute('stroke-width', lineWidth * 1.5);
            } else {
                line.setAttribute('stroke', `rgba(100, 150, 255, ${opacity})`);
                line.setAttribute('stroke-width', lineWidth);
            }
            
            this.gridGroup.appendChild(line);
        }
        
        // Draw vertical grid lines
        for (let x = startX; x <= endX; x += adjustedGridSize) {
            const line = document.createElementNS(ns, 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', viewBox.y);
            line.setAttribute('x2', x);
            line.setAttribute('y2', viewBox.y + viewBox.height);
            line.setAttribute('class', 'grid-line');
            
            if (Math.abs(x) < adjustedGridSize * 0.1) {
                line.setAttribute('stroke', `rgba(0, 122, 204, ${Math.min(0.9, opacity * 2)})`);
                line.setAttribute('stroke-width', lineWidth * 1.5);
            } else {
                line.setAttribute('stroke', `rgba(100, 150, 255, ${opacity})`);
                line.setAttribute('stroke-width', lineWidth);
            }
            
            this.gridGroup.appendChild(line);
        }
        
        this.addGridLabels(startX, endX, startY, endY, adjustedGridSize);
    },

    addGridLabels(startX, endX, startY, endY, adjustedGridSize) {
        const ns = "http://www.w3.org/2000/svg";
        
        // Clear existing labels
        const existingLabels = this.gridGroup.querySelectorAll('.grid-label');
        existingLabels.forEach(label => label.remove());
        
        const baseFontSize = 10; 
        const fontSize = baseFontSize / this.zoomLevel;
        const labelOpacity = Math.max(0.3, Math.min(0.8, 0.6 / this.zoomLevel));

        const vb = this.viewBox;
        
        // --- STICKY AXIS LOGIC ---
        // X-Axis Labels (horizontal numbers) stay at y=0 or stick to top/bottom edge
        const topEdge = vb.y + fontSize * 2;
        const bottomEdge = vb.y + vb.height - fontSize * 2;
        const labelYPosition = Math.min(Math.max(0, topEdge), bottomEdge); // Stick to 0 if visible

        // Y-Axis Labels (vertical numbers) stay at x=0 or stick to left/right edge
        const leftEdge = vb.x + fontSize * 2;
        const rightEdge = vb.x + vb.width - fontSize * 3;
        const labelXPosition = Math.min(Math.max(0, leftEdge), rightEdge); // Stick to 0 if visible

        // 1. Add X-axis labels (Numbers along the horizontal line)
        for (let x = startX; x <= endX; x += adjustedGridSize) {
            // Filter out x=0 to avoid overlapping the Y-axis labels slightly
            // Also ensure we aren't drawing way outside the visual box
            if (Math.abs(x) > adjustedGridSize * 0.1) {
                const label = document.createElementNS(ns, 'text');
                label.setAttribute('x', x);
                label.setAttribute('y', labelYPosition + fontSize * 0.4); // Offset slightly for baseline
                
                label.setAttribute('class', 'grid-label');
                label.setAttribute('fill', `rgba(200, 200, 255, ${labelOpacity})`);
                label.setAttribute('font-size', fontSize);
                label.setAttribute('font-family', 'Arial, sans-serif');
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('dominant-baseline', 'middle');
                
                const displayValue = Math.abs(x) < 0.0001 ? '0' : 
                                    Math.abs(x) < 1 ? parseFloat(x.toFixed(3)) :
                                    Math.abs(x) < 10 ? parseFloat(x.toFixed(2)) : 
                                    Math.round(x);
                label.textContent = displayValue;
                
                this.gridGroup.appendChild(label);
            }
        }
        
        // 2. Add Y-axis labels (Numbers along the vertical line)
        for (let y = startY; y <= endY; y += adjustedGridSize) {
            if (Math.abs(y) > adjustedGridSize * 0.1) {
                const label = document.createElementNS(ns, 'text');
                
                // Sticky X position
                label.setAttribute('x', labelXPosition);
                
                // FIX: Position at 'y', NOT '-y'. 
                // The grid lines are drawn at 'y', so the text must be at 'y'.
                label.setAttribute('y', y);
                
                label.setAttribute('class', 'grid-label');
                label.setAttribute('fill', `rgba(200, 200, 255, ${labelOpacity})`);
                label.setAttribute('font-size', fontSize);
                label.setAttribute('font-family', 'Arial, sans-serif');
                
                // Align text based on which side of the screen the axis is stuck to
                if (labelXPosition > vb.x + vb.width / 2) {
                     label.setAttribute('text-anchor', 'end'); // Stick to right
                     label.setAttribute('dx', -fontSize * 0.5); // Padding
                } else {
                     label.setAttribute('text-anchor', 'start'); // Stick to left
                     label.setAttribute('dx', fontSize * 0.5); // Padding
                }
                
                label.setAttribute('dominant-baseline', 'middle');
                
                // For display, we can invert the sign if you want "Up" to be positive (Math coords),
                // or keep it 'y' if you want "Down" to be positive (SVG coords).
                // Standard SVG editors usually show positive numbers going down.
                // If you want standard Math (positive up), change `y` to `-y` inside displayValue below.
                const val = y; 
                
                const displayValue = Math.abs(val) < 0.0001 ? '0' : 
                                    Math.abs(val) < 1 ? parseFloat(val.toFixed(3)) :
                                    Math.abs(val) < 10 ? parseFloat(val.toFixed(2)) : 
                                    Math.round(val);
                label.textContent = displayValue;
                
                this.gridGroup.appendChild(label);
            }
        }
    },

    getAdaptiveGridStep() {
        // Base grid step in pixels
        const pixelStep = 100 / this.zoomLevel;
        
        // Convert to current units
        const unitStep = pixelStep / this.unitFactors[this.currentUnits];
        
        // Round to nice values (1, 2, 5, 10, 20, 50, 100, etc.)
        const magnitude = Math.pow(10, Math.floor(Math.log10(unitStep)));
        const normalized = unitStep / magnitude;
        
        let niceStep;
        if (normalized < 1.5) {
            niceStep = 1;
        } else if (normalized < 3) {
            niceStep = 2;
        } else if (normalized < 7) {
            niceStep = 5;
        } else {
            niceStep = 10;
        }
        
        // Convert back to pixels
        return niceStep * magnitude * this.unitFactors[this.currentUnits];
    },

    formatUnitValue(value) {
        // Convert from pixels to current units and format
        const unitValue = value / this.unitFactors[this.currentUnits];
        
        // Determine number of decimal places based on value
        if (Math.abs(unitValue) >= 100) {
            return Math.round(unitValue);
        } else if (Math.abs(unitValue) >= 10) {
            return unitValue.toFixed(1);
        } else if (Math.abs(unitValue) >= 1) {
            return unitValue.toFixed(2);
        } else {
            return unitValue.toFixed(3);
        }
    },

    updateViewBox() {
        this.canvas.setAttribute('viewBox', 
            `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`);
        
        // Update zoom level based on viewBox width
        this.zoomLevel = 1200 / this.viewBox.width; // Base width is 1200
        
        // Update grid and axes with new zoom level
        this.updateGrid();
        this.updateAxes();
    },

    screenToSVG(clientX, clientY) {
        // Create a DOMPoint for the mouse position
        let point = new DOMPoint(clientX, clientY);

        // Get the matrix that converts Screen coords to SVG coords
        // .inverse() maps from Screen -> SVG
        let matrix = this.canvas.getScreenCTM().inverse();

        // Apply the transform
        let svgPoint = point.matrixTransform(matrix);

        return { x: svgPoint.x, y: svgPoint.y };
    },

    svgToScreen(svgX, svgY) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Calculate normalized position (0 to 1) within viewBox
        const xNormalized = (svgX - this.viewBox.x) / this.viewBox.width;
        const yNormalized = (svgY - this.viewBox.y) / this.viewBox.height;
        
        // Convert to screen coordinates
        const screenX = rect.left + (xNormalized * rect.width);
        const screenY = rect.top + (yNormalized * rect.height);
        
        return { x: screenX, y: screenY };
    },

    updateCanvasCursor() {
        if (this.canvasMode === 'pan') {
            this.canvasContainer.style.cursor = 'grab';
        } else if (this.currentTool === 'select') {
            this.canvasContainer.style.cursor = 'crosshair';
        } else {
            this.canvasContainer.style.cursor = 'crosshair';
        }
    },

    handleWheel(e) {
        // Only zoom when Ctrl key is pressed (standard zoom gesture)
        if (!e.ctrlKey) {
            // Allow normal scrolling without zooming
            return;
        }
        
        // Prevent default behavior to avoid browser zoom
        e.preventDefault();
        
        // Determine zoom factor based on scroll direction
        let zoomFactor;
        if (e.deltaY !== 0) {
            // Vertical scroll - zoom in/out
            zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
        } else if (e.deltaX !== 0) {
            // Horizontal scroll - zoom in/out (but only when Ctrl is pressed)
            zoomFactor = e.deltaX > 0 ? 1.1 : 0.9;
        } else {
            // No scroll delta, don't zoom
            return;
        }
        
        const svgPoint = this.screenToSVG(e.clientX, e.clientY);
        
        // Calculate new viewBox dimensions
        const newWidth = this.viewBox.width * zoomFactor;
        const newHeight = this.viewBox.height * zoomFactor;
        
        // Calculate the mouse position relative to the viewBox
        const mouseX = (svgPoint.x - this.viewBox.x) / this.viewBox.width;
        const mouseY = (svgPoint.y - this.viewBox.y) / this.viewBox.height;
        
        // Adjust viewBox to zoom toward mouse position
        this.viewBox.x = svgPoint.x - mouseX * newWidth;
        this.viewBox.y = svgPoint.y - mouseY * newHeight;
        this.viewBox.width = newWidth;
        this.viewBox.height = newHeight;
        
        this.zoomLevel = 1200 / this.viewBox.width; // Base width is 1200
        
        this.updateViewBox();
    },

    startPanning(clientX, clientY) {
        this.isPanning = true;
        this.panStartX = clientX;
        this.panStartY = clientY;
        this.canvasContainer.classList.add('panning');
        this.canvasContainer.style.cursor = 'grabbing';
    },

    pan(clientX, clientY) {
        if (!this.isPanning) return;
        
        const dx = clientX - this.panStartX;
        const dy = clientY - this.panStartY;
        
        // Convert screen delta to SVG delta
        const svgDeltaX = (dx / this.canvas.clientWidth) * this.viewBox.width;
        const svgDeltaY = (dy / this.canvas.clientHeight) * this.viewBox.height;
        
        // Update viewBox
        this.viewBox.x -= svgDeltaX;
        this.viewBox.y -= svgDeltaY;
        
        this.panStartX = clientX;
        this.panStartY = clientY;
        
        this.updateViewBox();
    },

    stopPanning() {
        this.isPanning = false;
        this.canvasContainer.classList.remove('panning');
        this.updateCanvasCursor();
    },

    zoomIn() {
        // Zoom in = smaller viewBox (objects appear larger)
        this.zoomAtCenter(0.8); // Changed from 1.2 to 0.8
    },

    zoomOut() {
        // Zoom out = larger viewBox (objects appear smaller)
        this.zoomAtCenter(1.2); // Changed from 0.8 to 1.2
    },

    zoomAtCenter(zoomFactor) {
        const centerX = this.viewBox.x + this.viewBox.width / 2;
        const centerY = this.viewBox.y + this.viewBox.height / 2;
        
        this.viewBox.width *= zoomFactor;
        this.viewBox.height *= zoomFactor;
        this.viewBox.x = centerX - this.viewBox.width / 2;
        this.viewBox.y = centerY - this.viewBox.height / 2;
        
        this.updateViewBox(); // This will update grid and axes with new zoom level
    },

    resetZoom() {
        // Get actual available space
        const rect = this.canvasContainer.getBoundingClientRect();
        
        // Reset to 1:1 scale, centered at 0,0
        this.viewBox = {
            x: -rect.width / 2,
            y: -rect.height / 2,
            width: rect.width,
            height: rect.height
        };
        
        this.zoomLevel = 1;
        this.updateViewBox();
    }



    // Menu Functions (stubs)
    // printDocument() {
    //     window.print();
    // },

    zoomToElement(element) {
        if (!element.getBBox) return;
        
        // Calculate Global Bounding Box (accounting for transforms)
        const bbox = element.getBBox();
        const globalBox = this.getElementBoundingBoxInCanvasSpace(element, bbox); // Method exists from previous steps
        
        // Determine Padding (e.g., 20% of size)
        const padding = Math.max(globalBox.width, globalBox.height) * 0.4;
        
        // Set ViewBox centered on element
        this.viewBox = {
            x: globalBox.x - padding,
            y: globalBox.y - padding,
            width: globalBox.width + (padding * 2),
            height: globalBox.height + (padding * 2)
        };
        
        this.updateViewBox();
        this.selectElement(element);
    }

    // 2. Show Splitter Menu,

    updateStatusBarMode() {
        const modeText = this.canvasMode === 'select' ? 'Select Mode' : 'Pan Mode';
        const gridText = this.gridEnabled ? 'Grid On' : 'Grid Off';
        const snapText = this.snapEnabled ? 'Snap On' : 'Snap Off';
        
        // Update the unit info in status bar to include mode
        document.getElementById('unitInfo').textContent = 
            `Units: ${this.getUnitDisplayName()} | Mode: ${modeText} | ${gridText} | ${snapText} | Drag background to pan | Ctrl+Scroll to zoom`;
    }

});
