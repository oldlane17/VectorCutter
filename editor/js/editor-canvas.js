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

        // Refresh selection handles so they stay constant screen size
        if (this.selectedElements && this.selectedElements.length > 0 && !this.isDragging && !this.isResizing && !this.isRotating) {
            this.updateSelectionHandles();
        }
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

    initScrollMode() {
        const savedMode = localStorage.getItem('vc_scroll_mode') || 'trackpad';
        this.scrollMode = savedMode;
        this.updateScrollModeUI();
    },

    setScrollMode(mode, persist = true) {
        this.scrollMode = mode;
        if (persist) {
            localStorage.setItem('vc_scroll_mode', mode);
        }
        this.updateScrollModeUI();
        this.updateStatusBarMode();
    },

    updateScrollModeUI() {
        const checkTrackpad = document.getElementById('checkScrollTrackpad');
        const checkMouse = document.getElementById('checkScrollMouse');
        if (checkTrackpad) {
            checkTrackpad.textContent = this.scrollMode === 'trackpad' ? '✓ ' : '';
        }
        if (checkMouse) {
            checkMouse.textContent = this.scrollMode === 'mouse' ? '✓ ' : '';
        }
    },

    handleWheel(e) {
        e.preventDefault();
        e.stopPropagation();

        if (!this.hasDetectedScrollMode && !localStorage.getItem('vc_scroll_mode')) {
            const isFractional = (e.deltaY % 1 !== 0) || (e.deltaX % 1 !== 0);
            const hasHorizontal = Math.abs(e.deltaX) > 0;
            const isPixelMode = e.deltaMode === 0 && Math.abs(e.deltaY) < 50;
            if (isFractional || hasHorizontal || isPixelMode) {
                this.setScrollMode('trackpad', true);
            } else {
                this.setScrollMode('mouse', true);
            }
            this.hasDetectedScrollMode = true;
        }

        let dx = e.deltaX;
        let dy = e.deltaY;
        if (e.deltaMode === 1) {
            dx *= 24;
            dy *= 24;
        } else if (e.deltaMode === 2) {
            dx *= 400;
            dy *= 400;
        }

        const isZoomGesture = e.ctrlKey || e.metaKey;

        if (this.scrollMode === 'trackpad') {
            if (isZoomGesture) {
                const zoomFactor = Math.min(Math.max(Math.exp(dy * 0.005), 0.7), 1.4);
                this.zoomTowards(e.clientX, e.clientY, zoomFactor);
            } else if (e.shiftKey) {
                this.panBy(dy !== 0 ? dy : dx, 0);
            } else {
                this.panBy(dx, dy);
            }
        } else {
            if (isZoomGesture) {
                const zoomFactor = Math.min(Math.max(Math.exp(dy * 0.005), 0.7), 1.4);
                this.zoomTowards(e.clientX, e.clientY, zoomFactor);
            } else if (e.shiftKey) {
                this.panBy(dy !== 0 ? dy : dx, 0);
            } else if (e.altKey) {
                this.panBy(0, dy !== 0 ? dy : dx);
            } else {
                const zoomFactor = dy > 0 ? 1.15 : 0.87;
                this.zoomTowards(e.clientX, e.clientY, zoomFactor);
            }
        }
    },

    panBy(screenDx, screenDy) {
        const rect = this.canvas.getBoundingClientRect();
        const clientW = rect.width || this.canvas.clientWidth || 1;
        const clientH = rect.height || this.canvas.clientHeight || 1;
        const scaleX = this.viewBox.width / clientW;
        const scaleY = this.viewBox.height / clientH;
        this.viewBox.x += screenDx * scaleX;
        this.viewBox.y += screenDy * scaleY;
        this.updateViewBox();
    },

    zoomTowards(clientX, clientY, factor) {
        const svgPoint = this.screenToSVG(clientX, clientY);
        const minWidth = 12;
        const maxWidth = 120000;

        let newWidth = this.viewBox.width * factor;
        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;

        const actualFactor = newWidth / this.viewBox.width;
        const newHeight = this.viewBox.height * actualFactor;

        const mouseX = (svgPoint.x - this.viewBox.x) / this.viewBox.width;
        const mouseY = (svgPoint.y - this.viewBox.y) / this.viewBox.height;

        this.viewBox.x = svgPoint.x - mouseX * newWidth;
        this.viewBox.y = svgPoint.y - mouseY * newHeight;
        this.viewBox.width = newWidth;
        this.viewBox.height = newHeight;
        this.zoomLevel = 1200 / this.viewBox.width;
        this.updateViewBox();
    },

    startPanning(clientX, clientY) {
        this.isPanning = true;
        this.panStartX = clientX;
        this.panStartY = clientY;
        this.canvasContainer.classList.add('panning');
        this.canvasContainer.style.cursor = 'grabbing';
    },

    pan(clientX, clientY) {
        if (!this.isPanning) return;
        
        const dx = clientX - this.panStartX;
        const dy = clientY - this.panStartY;
        
        const scaleX = this.viewBox.width / (this.canvas.clientWidth || 1);
        const scaleY = this.viewBox.height / (this.canvas.clientHeight || 1);
        
        this.viewBox.x -= dx * scaleX;
        this.viewBox.y -= dy * scaleY;
        
        this.panStartX = clientX;
        this.panStartY = clientY;
        
        this.updateViewBox();
    },

    stopPanning() {
        this.isPanning = false;
        this.canvasContainer.classList.remove('panning');
        this.updateCanvasCursor();
    },

    zoomIn() {
        this.zoomAtCenter(0.8);
    },

    zoomOut() {
        this.zoomAtCenter(1.2);
    },

    zoomAtCenter(zoomFactor) {
        const centerX = this.viewBox.x + this.viewBox.width / 2;
        const centerY = this.viewBox.y + this.viewBox.height / 2;
        
        const minWidth = 12;
        const maxWidth = 120000;
        let newWidth = this.viewBox.width * zoomFactor;
        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;
        const actualFactor = newWidth / this.viewBox.width;
        const newHeight = this.viewBox.height * actualFactor;

        this.viewBox.width = newWidth;
        this.viewBox.height = newHeight;
        this.viewBox.x = centerX - newWidth / 2;
        this.viewBox.y = centerY - newHeight / 2;
        this.zoomLevel = 1200 / this.viewBox.width;
        
        this.updateViewBox();
    },

    resetZoom() {
        const rect = this.canvasContainer.getBoundingClientRect();
        this.viewBox = {
            x: -rect.width / 2,
            y: -rect.height / 2,
            width: rect.width || 1200,
            height: rect.height || 900
        };
        this.zoomLevel = 1;
        this.updateViewBox();
    },

    zoomToRealSize() {
        const rect = this.canvasContainer.getBoundingClientRect();
        const clientW = rect.width || this.canvas.clientWidth || 1200;
        const clientH = rect.height || this.canvas.clientHeight || 900;
        
        const dpmm = parseFloat(localStorage.getItem('vc_screen_dpmm')) || (96 / 25.4);
        const svgUnitsPerMm = this.unitFactors['mm'] || 3.779527559;
        
        const targetViewWidth = (clientW / dpmm) * svgUnitsPerMm;
        const targetViewHeight = (clientH / dpmm) * svgUnitsPerMm;
        
        const centerX = this.viewBox.x + this.viewBox.width / 2;
        const centerY = this.viewBox.y + this.viewBox.height / 2;
        
        this.viewBox = {
            x: centerX - targetViewWidth / 2,
            y: centerY - targetViewHeight / 2,
            width: targetViewWidth,
            height: targetViewHeight
        };
        this.zoomLevel = 1200 / this.viewBox.width;
        this.updateViewBox();
    },

    showCalibrateScreenDialog() {
        let modal = document.getElementById('calibrateModal');
        if (!modal) return;
        
        const slider = document.getElementById('calibrateSlider');
        const card = document.getElementById('calibrateCard');
        const widthVal = document.getElementById('calibrateWidthVal');
        const dpiVal = document.getElementById('calibrateDpiVal');
        
        const currentDpmm = parseFloat(localStorage.getItem('vc_screen_dpmm')) || (96 / 25.4);
        const currentCardWidthPx = Math.round(85.6 * currentDpmm);
        
        const updateCard = (px) => {
            const w = Math.max(150, Math.min(800, px));
            const h = Math.round(w * (53.98 / 85.6));
            if (card) {
                card.style.width = w + "px";
                card.style.height = h + "px";
            }
            if (widthVal) widthVal.textContent = w;
            const dpi = Math.round((w / 85.6) * 25.4);
            if (dpiVal) dpiVal.textContent = dpi + " DPI";
        };
        
        if (slider) {
            slider.value = currentCardWidthPx;
            updateCard(currentCardWidthPx);
            slider.oninput = (e) => updateCard(parseFloat(e.target.value));
        }
        
        const saveBtn = document.getElementById('calibrateSaveBtn');
        if (saveBtn) {
            saveBtn.onclick = () => {
                const w = parseFloat(slider.value);
                const newDpmm = w / 85.6;
                localStorage.setItem('vc_screen_dpmm', newDpmm);
                modal.style.display = 'none';
                this.zoomToRealSize();
            };
        }
        
        const resetBtn = document.getElementById('calibrateResetBtn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                const defaultPx = Math.round(85.6 * (96 / 25.4));
                slider.value = defaultPx;
                updateCard(defaultPx);
            };
        }
        
        const cancelBtn = document.getElementById('calibrateCancelBtn');
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                modal.style.display = 'none';
            };
        }
        
        modal.style.display = 'flex';
    },

    zoomToFitAll() {
        const bbox = this.getUserElementsBBox();
        if (!bbox || (bbox.width === 0 && bbox.height === 0)) {
            this.resetZoom();
            return;
        }
        
        const clientW = this.canvasContainer.clientWidth || 1200;
        const clientH = this.canvasContainer.clientHeight || 900;
        const aspect = clientW / clientH;
        
        const padding = Math.max(bbox.width, bbox.height) * 0.15 + 30;
        let fitW = bbox.width + padding * 2;
        let fitH = bbox.height + padding * 2;
        
        if (fitW / fitH > aspect) {
            fitH = fitW / aspect;
        } else {
            fitW = fitH * aspect;
        }
        
        const cx = bbox.x + bbox.width / 2;
        const cy = bbox.y + bbox.height / 2;
        
        this.viewBox = {
            x: cx - fitW / 2,
            y: cy - fitH / 2,
            width: fitW,
            height: fitH
        };
        this.zoomLevel = 1200 / this.viewBox.width;
        this.updateViewBox();
    },

    zoomToFitSelected() {
        if (!this.selectedElements || this.selectedElements.length === 0) {
            this.zoomToFitAll();
            return;
        }
        
        const bbox = this.getGroupBoundingBox();
        if (!bbox || (bbox.width === 0 && bbox.height === 0)) {
            this.zoomToFitAll();
            return;
        }
        
        const clientW = this.canvasContainer.clientWidth || 1200;
        const clientH = this.canvasContainer.clientHeight || 900;
        const aspect = clientW / clientH;
        
        const padding = Math.max(bbox.width, bbox.height) * 0.2 + 25;
        let fitW = bbox.width + padding * 2;
        let fitH = bbox.height + padding * 2;
        
        if (fitW / fitH > aspect) {
            fitH = fitW / aspect;
        } else {
            fitW = fitH * aspect;
        }
        
        const cx = bbox.x + bbox.width / 2;
        const cy = bbox.y + bbox.height / 2;
        
        this.viewBox = {
            x: cx - fitW / 2,
            y: cy - fitH / 2,
            width: fitW,
            height: fitH
        };
        this.zoomLevel = 1200 / this.viewBox.width;
        this.updateViewBox();
    },

    zoomToElement(element) {
        if (!element.getBBox) return;
        
        const bbox = element.getBBox();
        const globalBox = this.getElementBoundingBoxInCanvasSpace ? 
            this.getElementBoundingBoxInCanvasSpace(element, bbox) : bbox;
        
        const padding = Math.max(globalBox.width, globalBox.height) * 0.4 + 20;
        
        this.viewBox = {
            x: globalBox.x - padding,
            y: globalBox.y - padding,
            width: globalBox.width + (padding * 2),
            height: globalBox.height + (padding * 2)
        };
        this.zoomLevel = 1200 / this.viewBox.width;
        this.updateViewBox();
        this.selectElement(element);
    },

    updateStatusBarMode() {
        const modeText = this.canvasMode === 'select' ? 'Select Mode' : 'Pan Mode';
        const gridText = this.gridEnabled ? 'Grid On' : 'Grid Off';
        const snapText = this.snapEnabled ? 'Snap On' : 'Snap Off';
        const scrollText = this.scrollMode === 'trackpad' ? 'Trackpad: Scroll to Pan' : 'Mouse: Scroll to Zoom';
        
        const unitInfo = document.getElementById('unitInfo');
        if (unitInfo) {
            const uName = this.getUnitDisplayName ? this.getUnitDisplayName() : this.currentUnits;
            unitInfo.textContent = 
                'Units: ' + uName + ' | Mode: ' + modeText + ' | ' + gridText + ' | ' + snapText + ' | ' + scrollText;
        }
    }
});
