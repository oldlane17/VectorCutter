/**
 * VectorCutter - SVG Editor Module
 * Module: editor-properties.js
 * Description: Properties Sidebar, Dimension Form Controls, LaTeX MathJax Rendering & Styles
 */

Object.assign(SVGEditor.prototype, {
    updateContextMenu() {
        const contextProperties = document.getElementById('contextProperties');
        const elementsList = document.getElementById('elementsList');
        const elementCount = document.getElementById('elementCount');
        
        if (!contextProperties || !elementsList || !elementCount) return;
        
        // Update element list
        this.updateElementsList(elementsList, elementCount);
        

        this.updateElementsListHighlight();
        // Update context properties
        if (this.selectedElements.length === 1) {
            this.updateSingleElementProperties(contextProperties);
        } else if (this.selectedElements.length > 1) {
            this.updateMultipleElementsProperties(contextProperties);
        } else {
            this.showNoSelectionMessage(contextProperties);
        }
    },

    updateContextMenuRotationCenter() {
        if (this.selectedElements.length === 1) {
            const element = this.selectedElements[0];
            const tagName = element.tagName.toLowerCase();
            const transform = element.getAttribute('transform') || '';
            
            let rotationCenterX, rotationCenterY;
            
            if (transform && transform.includes('rotate')) {
                const match = transform.match(/rotate\(([-\d.]+)(?:,\s*([-\d.]+),\s*([-\d.]+))?\)/);
                if (match && match[2] && match[3]) {
                    rotationCenterX = parseFloat(match[2]);
                    rotationCenterY = parseFloat(match[3]);
                    
                    // Update hidden rotation center inputs
                    const centerXInput = document.getElementById('contextRectRotationCenterX');
                    const centerYInput = document.getElementById('contextRectRotationCenterY');
                    
                    if (centerXInput && centerYInput) {
                        centerXInput.value = rotationCenterX;
                        centerYInput.value = rotationCenterY;
                    }
                }
            }
        }
    }
    // --- REPLACE THIS METHOD IN SVGEditor CLASS ---,

    updateRotationCenterDot(bbox, element) {
        const ns = "http://www.w3.org/2000/svg";
        
        // Remove existing
        const existingDot = this.selectionGroup.querySelector('.rotation-center-dot');
        if (existingDot) {
            existingDot.remove();
        }
        
        // Default to Geometric Center
        let centerX = bbox.x + bbox.width / 2;
        let centerY = bbox.y + bbox.height / 2;
        
        // FIX: If we have a single element with a specific rotation pivot, use that
        if (element) {
            const transform = element.getAttribute('transform') || '';
            const match = transform.match(/rotate\(([-\d.]+)(?:,\s*([-\d.]+),\s*([-\d.]+))?\)/);
            
            if (match) {
                // match[1] is angle
                // match[2] is cx, match[3] is cy
                if (match[2] && match[3]) {
                    const pivotX = parseFloat(match[2]);
                    const pivotY = parseFloat(match[3]);
                    
                    if (!isNaN(pivotX) && !isNaN(pivotY)) {
                        // Use the EXPLICIT pivot point defined in the transform
                        centerX = pivotX;
                        centerY = pivotY;
                    }
                }
            }
        }
        
        const centerDot = document.createElementNS(ns, 'circle');
        centerDot.setAttribute('class', 'selection-handle rotation-center-dot');
        centerDot.setAttribute('cx', centerX);
        centerDot.setAttribute('cy', centerY);
        centerDot.setAttribute('r', 3);
        centerDot.setAttribute('fill', 'blue');
        centerDot.setAttribute('stroke', 'white');
        centerDot.setAttribute('stroke-width', 1);
        
        // Ensure the dot ignores pointer events so you can click objects behind it
        centerDot.style.pointerEvents = 'none'; 
        
        this.selectionGroup.appendChild(centerDot);
    },

    updateContextMenuValues() {
        if (this.selectedElements.length === 0) return;
        
        if (this.selectedElements.length === 1) {
            const element = this.selectedElements[0];
            const tagName = element.tagName.toLowerCase();
            
            // Check types
            const isLatex = element.getAttribute('data-type') === 'latex';
            const isStructure = element.getAttribute('data-type') === 'structure';
            
            const bbox = element.getBBox();
            const transform = element.getAttribute('transform') || '';
            
            let rotation = 0;
            let rotationCenterX, rotationCenterY;
            
            // 1. Parse Rotation Angle (We always need the angle)
            if (transform && transform.includes('rotate')) {
                const match = transform.match(/rotate\(([-\d.]+)(?:,\s*([-\d.]+),\s*([-\d.]+))?\)/);
                if (match) {
                    rotation = parseFloat(match[1]);
                    // Only use these as Global Center IF it's a standard element (not structure/latex)
                    if (!isStructure && !isLatex && match[2] && match[3]) {
                        rotationCenterX = parseFloat(match[2]);
                        rotationCenterY = parseFloat(match[3]);
                    }
                }
            }
            
            // 2. Calculate Global Center Logic
            // For Structures/Latex, we ignore the rotate() pivot (which is local) 
            // and calculate Global Center = Translate + (LocalCenter * Scale)
            if (isStructure || isLatex || rotationCenterX === undefined) {
                rotationCenterX = this.getElementCenterX(element);
                rotationCenterY = this.getElementCenterY(element);
            }

            // --- SPECIFIC HANDLER FOR STRUCTURES ---
            if (isStructure) {
                let scaleX = 1;
                let scaleY = 1;
                // Update regex to catch both scales
                const sm = transform.match(/scale\(([-\d.]+)(?:,\s*([-\d.]+))?\)/);
                if (sm) {
                    scaleX = parseFloat(sm[1]);
                    scaleY = sm[2] ? parseFloat(sm[2]) : scaleX;
                }

                // Visual Dimensions
                const visualWidth = bbox.width * scaleX;
                const visualHeight = bbox.height * scaleY;

                // Update Inputs with calculated GLOBAL values
                this.updateInputValue('contextStructureCenterX', this.formatUnitValue(rotationCenterX));
                this.updateInputValue('contextStructureCenterY', this.formatUnitValue(rotationCenterY));
                this.updateInputValue('contextStructureWidth', this.formatUnitValue(visualWidth));
                this.updateInputValue('contextStructureHeight', this.formatUnitValue(visualHeight));
                this.updateInputValue('contextStructureRotation', Math.round(rotation));
                
                this.updateStyleInputs(element);
                return; 
            }

            // --- SPECIFIC HANDLER FOR LATEX/TEXT ---
            if (tagName === 'text' || isLatex) {
                let scale = 1;
                if (isLatex) {
                    const sm = transform.match(/scale\(([-\d.]+)/);
                    if (sm) scale = parseFloat(sm[1]);
                }

                const visualWidth = bbox.width * scale;
                const visualHeight = bbox.height * scale;
                
                this.updateInputValue('contextTextCenterX', this.formatUnitValue(rotationCenterX));
                this.updateInputValue('contextTextCenterY', this.formatUnitValue(rotationCenterY));
                this.updateInputValue('contextTextWidth', this.formatUnitValue(visualWidth));
                this.updateInputValue('contextTextHeight', this.formatUnitValue(visualHeight));
                
                // ... (rest of text update logic) ...
                let fontSizeVal;
                if (isLatex) {
                    fontSizeVal = visualHeight; // Approx proxy
                } else {
                    fontSizeVal = parseFloat(element.getAttribute('font-size') || 16);
                }
                this.updateInputValue('contextTextFontSize', Math.round(fontSizeVal));
                this.updateInputValue('contextTextContent', isLatex ? element.getAttribute('data-latex') : element.textContent);
                
                this.updateStyleInputs(element);
                return;
            }

            // ... (The rest of your existing switch(tagName) for rect, circle, etc. goes here) ...
            switch(tagName) {
                case 'rect':
                    // ... your existing rect logic ...
                    const rW = parseFloat(element.getAttribute('width') || 0);
                    // Use the calculated rotationCenterX/Y from step 2
                    this.updateInputValue('contextRectCenterX', this.formatUnitValue(rotationCenterX));
                    this.updateInputValue('contextRectCenterY', this.formatUnitValue(rotationCenterY));
                    this.updateInputValue('contextRectWidth', this.formatUnitValue(rW));
                    this.updateInputValue('contextRectHeight', this.formatUnitValue(parseFloat(element.getAttribute('height'))));
                    this.updateInputValue('contextRectRotation', Math.round(rotation));
                    break;
                
                // ... copy your existing circle, ellipse, line, path cases here ...
                // Just ensure they use rotationCenterX/Y variables we calculated above
                case 'circle':
                    this.updateInputValue('contextCircleCenterX', this.formatUnitValue(rotationCenterX));
                    this.updateInputValue('contextCircleCenterY', this.formatUnitValue(rotationCenterY));
                    this.updateInputValue('contextCircleR', this.formatUnitValue(parseFloat(element.getAttribute('r'))));
                    this.updateInputValue('contextCircleRotation', Math.round(rotation));
                    break;
                
                case 'ellipse':
                    this.updateInputValue('contextEllipseCenterX', this.formatUnitValue(rotationCenterX));
                    this.updateInputValue('contextEllipseCenterY', this.formatUnitValue(rotationCenterY));
                    this.updateInputValue('contextEllipseRX', this.formatUnitValue(parseFloat(element.getAttribute('rx'))));
                    this.updateInputValue('contextEllipseRY', this.formatUnitValue(parseFloat(element.getAttribute('ry'))));
                    this.updateInputValue('contextEllipseRotation', Math.round(rotation));
                    break;

                case 'line':
                    const lx1 = parseFloat(element.getAttribute('x1'));
                    const ly1 = parseFloat(element.getAttribute('y1'));
                    const lx2 = parseFloat(element.getAttribute('x2'));
                    const ly2 = parseFloat(element.getAttribute('y2'));
                    this.updateInputValue('contextLineX1', this.formatUnitValue(lx1));
                    this.updateInputValue('contextLineY1', this.formatUnitValue(ly1));
                    this.updateInputValue('contextLineX2', this.formatUnitValue(lx2));
                    this.updateInputValue('contextLineY2', this.formatUnitValue(ly2));
                    this.updateInputValue('contextLineCenterX', this.formatUnitValue(rotationCenterX));
                    this.updateInputValue('contextLineCenterY', this.formatUnitValue(rotationCenterY));
                    this.updateInputValue('contextLineRotation', Math.round(rotation));
                    break;

                case 'path':
                    if (element.getAttribute('data-type') === 'curve') {
                        // ... your existing curve logic ...
                        const d = element.getAttribute('d') || '';
                        const nums = d.match(/[+-]?\d*\.?\d+/g);
                        if (nums && nums.length >= 6) {
                            const vals = nums.map(parseFloat);
                            this.updateInputValue('contextCurveX1', this.formatUnitValue(vals[0]));
                            this.updateInputValue('contextCurveY1', this.formatUnitValue(vals[1]));
                            this.updateInputValue('contextCurveCX', this.formatUnitValue(vals[2]));
                            this.updateInputValue('contextCurveCY', this.formatUnitValue(vals[3]));
                            this.updateInputValue('contextCurveX2', this.formatUnitValue(vals[4]));
                            this.updateInputValue('contextCurveY2', this.formatUnitValue(vals[5]));
                            this.updateInputValue('contextCurveRotation', Math.round(rotation));
                        }
                    } else {
                        this.updateInputValue('contextPathCenterX', this.formatUnitValue(rotationCenterX));
                        this.updateInputValue('contextPathCenterY', this.formatUnitValue(rotationCenterY));
                        this.updateInputValue('contextPathWidth', this.formatUnitValue(bbox.width));
                        this.updateInputValue('contextPathHeight', this.formatUnitValue(bbox.height));
                        this.updateInputValue('contextPathRotation', Math.round(rotation));
                        this.updateInputValue('contextPathData', element.getAttribute('d'));
                    }
                    break;
            }
            this.updateStyleInputs(element);
        }
    },

    updatePropertiesFromContext() {
        // Update the left sidebar controls to match (if they still exist)
        // This ensures consistency if you still have the left sidebar visible
        if (this.selectedElements.length === 1) {
            const element = this.selectedElements[0];
            
            // Update left sidebar if elements exist
            const fillColorInput = document.getElementById('fillColor');
            const strokeColorInput = document.getElementById('strokeColor');
            const strokeWidthInput = document.getElementById('strokeWidth');
            const opacityInput = document.getElementById('opacity');
            
            if (fillColorInput) {
                fillColorInput.value = element.getAttribute('fill') || '#4CAF50';
            }
            if (strokeColorInput) {
                strokeColorInput.value = element.getAttribute('stroke') || '#000000';
            }
            if (strokeWidthInput) {
                strokeWidthInput.value = element.getAttribute('stroke-width') || '2';
            }
            if (opacityInput) {
                opacityInput.value = element.getAttribute('opacity') || '1';
            }
        }
    },

    updateProperties() {
        if (!this.selectedElement) return;

        if (!this.laserMode) {
            this.properties.fill = document.getElementById('fillColor').value;
            this.properties.stroke = document.getElementById('strokeColor').value;
            this.properties.strokeWidth = document.getElementById('strokeWidth').value;
            this.properties.opacity = document.getElementById('opacity').value;
        }

        this.applyProperties(this.selectedElement);
        
        // Save original values for when laser mode is turned off
        if (!this.laserMode) {
            this.selectedElement.dataset.originalFill = this.properties.fill;
            this.selectedElement.dataset.originalStroke = this.properties.stroke;
        }
    },

    updateSingleElementProperties(contextProperties) {
        const element = this.selectedElements[0];
        const tagName = element.tagName.toLowerCase();
        const isLatex = element.getAttribute('data-type') === 'latex';
        const isStructure = element.getAttribute('data-type') === 'structure';
        
        let propertiesHTML = ``;
        
        // Handle LaTeX explicitly, or fall back to standard tag switches
        if (isStructure) {
            // NEW: Handle Structures separately
            propertiesHTML += this.getStructureProperties(element);

        } else if (isLatex) {
            propertiesHTML += this.getTextProperties(element); 
        } else if (tagName === 'g') {
            // Fallback for generic groups
            propertiesHTML += this.getTextProperties(element);
        } else {
            switch(tagName) {
                case 'rect':
                    propertiesHTML += this.getRectProperties(element);
                    break;
                case 'circle':
                    propertiesHTML += this.getCircleProperties(element);
                    break;
                case 'ellipse':
                    propertiesHTML += this.getEllipseProperties(element);
                    break;
                case 'line':
                    propertiesHTML += this.getLineProperties(element);
                    break;
                case 'text':
                    propertiesHTML += this.getTextProperties(element);
                    break;
                case 'path':
                    // check if it is our specific curve type
                    if (element.getAttribute('data-type') === 'curve') {
                        propertiesHTML += this.getCurveProperties(element);
                    } else {
                        propertiesHTML += this.getPathProperties(element);
                    }
                    break;
            }
        }
        
        // Add style properties (Fill, Stroke, etc.)
        propertiesHTML += this.getStyleProperties(element);
        
        // Add transform summary
        const transform = element.getAttribute('transform');
        if (transform) {
            propertiesHTML += `
                <div class="element-property-group">
                    <h4>Transform</h4>
                    <div class="element-property">
                        <span class="property-label">String:</span>
                        <span class="property-value" style="font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${transform}</span>
                    </div>
                </div>
            `;
        }
        
        // Add Info Header
        let displayType = tagName;
        if(isLatex) displayType = "latex (group)";
        
        let infohtml = `
            <div class="element-property-group">
                <h4>Element Info</h4>
                <div class="element-property">
                    <span class="property-label">Type:</span>
                    <span class="property-value">${displayType}</span>
                </div>
            </div>
        `;
        propertiesHTML += infohtml; // Append at end or beginning as you prefer
        
        contextProperties.innerHTML = propertiesHTML;
        
        // IMPORTANT: Add event listeners after HTML is set
        setTimeout(() => {
            this.addPropertyEventListeners(element);
        }, 0);
    },

    updateMultipleElementsProperties(contextProperties) {
        const bbox = this.getGroupBoundingBox();
        
        contextProperties.innerHTML = `
            <div class="element-property-group">
                <h4>Selection Info</h4>
                <div class="element-property">
                    <span class="property-label">Selected Elements:</span>
                    <span class="property-value">${this.selectedElements.length}</span>
                </div>
            </div>
            <div class="element-property-group">
                <h4>Bounding Box</h4>
                <div class="element-property">
                    <span class="property-label">X:</span>
                    <span class="property-value">${this.formatUnitValue(bbox.x)}</span>
                </div>
                <div class="element-property">
                    <span class="property-label">Y:</span>
                    <span class="property-value">${this.formatUnitValue(bbox.y)}</span>
                </div>
                <div class="element-property">
                    <span class="property-label">Width:</span>
                    <span class="property-value">${this.formatUnitValue(bbox.width)}</span>
                </div>
                <div class="element-property">
                    <span class="property-label">Height:</span>
                    <span class="property-value">${this.formatUnitValue(bbox.height)}</span>
                </div>
            </div>
        `;
    },

    showNoSelectionMessage(contextProperties) {
        contextProperties.innerHTML = `
            <div class="no-selection">
                <p>No element selected</p>
                <p>Select an element to view its properties</p>
            </div>
        `;
    },

    addPropertyEventListeners(element) {
        // Fill Color
        this.addInputWithEditingState('contextFillColor', () => {
            if (!this.laserMode) {
                const input = document.getElementById('contextFillColor');
                if (input) {
                    this.selectedElements.forEach(el => {
                        this.updateElementStyleRecursive(el, 'fill', input.value, false);
                    });
                }
            }
        });
        
        // Stroke Color
        this.addInputWithEditingState('contextStrokeColor', () => {
            if (!this.laserMode) {
                const input = document.getElementById('contextStrokeColor');
                if (input) {
                    this.selectedElements.forEach(el => {
                        this.updateElementStyleRecursive(el, 'stroke', input.value, false);
                    });
                }
            }
        });
        
        // Stroke Width
        this.addInputWithEditingState('contextStrokeWidth', () => {
            if (!this.laserMode) {
                const input = document.getElementById('contextStrokeWidth');
                if (input) {
                    this.selectedElements.forEach(el => {
                        this.updateElementStyleRecursive(el, 'stroke-width', input.value, false);
                    });
                }
            }
        });
        
        // Opacity
        this.addInputWithEditingState('contextOpacity', () => {
            const input = document.getElementById('contextOpacity');
            if (input) {
                this.selectedElements.forEach(el => {
                    this.updateElementStyleRecursive(el, 'opacity', input.value, false);
                });
            }
        });
        
        // Also add coordinate change listeners (Existing logic)
        this.addCoordinateEventListeners(element);
    },

    addCoordinateEventListeners(element) {
        const tagName = element.tagName.toLowerCase();
        const isLatex = element.getAttribute('data-type') === 'latex';
        const isStructure = element.getAttribute('data-type') === 'structure';


        if (isStructure) {
            this.addStructureCoordinateListeners(element); // NEW
            return;
        }
        // --- FIX: Route generic groups to Text/Group listeners ---
        if (isLatex || tagName === 'g') {
            this.addTextCoordinateListeners(element);
            return;
        }
        
        switch(tagName) {
            case 'rect':
                this.addRectCoordinateListeners(element);
                break;
            case 'circle':
                this.addCircleCoordinateListeners(element);
                break;
            case 'ellipse':
                this.addEllipseCoordinateListeners(element);
                break;
            case 'line':
                this.addLineCoordinateListeners(element);
                break;
            case 'text':
                this.addTextCoordinateListeners(element);
                break;
            case 'path':
                 if (element.getAttribute('data-type') === 'curve') {
                     // Assuming you have this method from previous steps
                     if(this.addCurveCoordinateListeners) this.addCurveCoordinateListeners(element);
                 } else {
                     this.addPathCoordinateListeners(element);
                 }
                break;
        }
    },

    addCenterCoordinateListeners(element) {
        const tagName = element.tagName.toLowerCase();
        const centerXId = `context${tagName.charAt(0).toUpperCase() + tagName.slice(1)}CenterX`;
        const centerYId = `context${tagName.charAt(0).toUpperCase() + tagName.slice(1)}CenterY`;
        
        const centerXInput = document.getElementById(centerXId);
        const centerYInput = document.getElementById(centerYId);
        
        if (centerXInput && centerYInput) {
            const updateCenter = () => {
                const centerX = parseFloat(centerXInput.value) * this.unitFactors[this.currentUnits];
                const centerY = parseFloat(centerYInput.value) * this.unitFactors[this.currentUnits];
                
                this.selectedElements.forEach(el => {
                    this.moveElement(el, centerX, centerY);
                });
                
                this.updateSelectionHandles();
                this.updateContextMenuValues();
            };
            
            centerXInput.addEventListener('change', updateCenter);
            centerYInput.addEventListener('change', updateCenter);
        }
    }
    
    // Rectangle coordinate listeners
    // Rectangle coordinate listeners (using center coordinates)
// Update the updateRect function to be more efficient,

    addRectCoordinateListeners(element) {
        let pendingUpdate = null;
        
        const updateRect = () => {
            // Clear any pending update
            if (pendingUpdate) {
                clearTimeout(pendingUpdate);
                pendingUpdate = null;
            }
            
            const rectCenterX = document.getElementById('contextRectCenterX');
            const rectCenterY = document.getElementById('contextRectCenterY');
            const rectWidth = document.getElementById('contextRectWidth');
            const rectHeight = document.getElementById('contextRectHeight');
            const rectRotation = document.getElementById('contextRectRotation');
            
            // Update immediately - don't check for editing state
            if (rectCenterX && rectCenterY && rectWidth && rectHeight) {
                try {
                    const centerX = parseFloat(rectCenterX.value) * this.unitFactors[this.currentUnits];
                    const centerY = parseFloat(rectCenterY.value) * this.unitFactors[this.currentUnits];
                    const width = parseFloat(rectWidth.value) * this.unitFactors[this.currentUnits];
                    const height = parseFloat(rectHeight.value) * this.unitFactors[this.currentUnits];
                    
                    // Validate values
                    if (isNaN(centerX) || isNaN(centerY) || isNaN(width) || isNaN(height)) {
                        return;
                    }
                    
                    // Ensure positive dimensions
                    const validWidth = Math.max(0.1, width);
                    const validHeight = Math.max(0.1, height);
                    
                    // Calculate top-left corner from center
                    const x = centerX - validWidth / 2;
                    const y = centerY - validHeight / 2;
                    
                    this.selectedElements.forEach(el => {
                        if (el.tagName.toLowerCase() === 'rect') {
                            el.setAttribute('x', x);
                            el.setAttribute('y', y);
                            el.setAttribute('width', validWidth);
                            el.setAttribute('height', validHeight);
                            
                            if (rectRotation) {
                                const rotation = parseFloat(rectRotation.value);
                                if (!isNaN(rotation)) {
                                    if (rotation !== 0) {
                                        el.setAttribute('transform', `rotate(${rotation}, ${centerX}, ${centerY})`);
                                    } else {
                                        el.removeAttribute('transform');
                                    }
                                }
                            }
                        }
                    });
                    
                    // Update selection handles
                    this.updateSelectionHandles();
                    
                    // Update other context menu values after a small delay
                    pendingUpdate = setTimeout(() => {
                        this.updateContextMenuValues();
                    }, 100);
                    
                } catch (error) {
                    console.error('Error updating rectangle:', error);
                }
            }
        };
        
        // Add all rectangle inputs with immediate updates
        this.addInputWithEditingState('contextRectCenterX', updateRect);
        this.addInputWithEditingState('contextRectCenterY', updateRect);
        this.addInputWithEditingState('contextRectWidth', updateRect);
        this.addInputWithEditingState('contextRectHeight', updateRect);
        this.addInputWithEditingState('contextRectRotation', updateRect);
    }
    // You'll need to update the getRectProperties method to include inputs:,

    addCircleCoordinateListeners(element) {
        let pendingUpdate = null;
        
        const updateCircle = () => {
            // Clear any pending update
            if (pendingUpdate) {
                clearTimeout(pendingUpdate);
                pendingUpdate = null;
            }
            
            const circleCenterX = document.getElementById('contextCircleCenterX');
            const circleCenterY = document.getElementById('contextCircleCenterY');
            const circleR = document.getElementById('contextCircleR');
            const circleRotation = document.getElementById('contextCircleRotation');
            
            // Update immediately - don't check for editing state
            if (circleCenterX && circleCenterY && circleR) {
                try {
                    const centerX = parseFloat(circleCenterX.value) * this.unitFactors[this.currentUnits];
                    const centerY = parseFloat(circleCenterY.value) * this.unitFactors[this.currentUnits];
                    let r = parseFloat(circleR.value) * this.unitFactors[this.currentUnits];
                    
                    // Validate values
                    if (isNaN(centerX) || isNaN(centerY) || isNaN(r)) {
                        return;
                    }
                    
                    // Ensure positive radius
                    r = Math.max(0.1, r);
                    
                    this.selectedElements.forEach(el => {
                        if (el.tagName.toLowerCase() === 'circle') {
                            el.setAttribute('cx', centerX);
                            el.setAttribute('cy', centerY);
                            el.setAttribute('r', r);
                            
                            if (circleRotation) {
                                const rotation = parseFloat(circleRotation.value);
                                if (!isNaN(rotation)) {
                                    if (rotation !== 0) {
                                        el.setAttribute('transform', `rotate(${rotation}, ${centerX}, ${centerY})`);
                                    } else {
                                        el.removeAttribute('transform');
                                    }
                                }
                            }
                        }
                    });
                    
                    // Update selection handles
                    this.updateSelectionHandles();
                    
                    // Update other context menu values after a small delay
                    pendingUpdate = setTimeout(() => {
                        this.updateContextMenuValues();
                    }, 100);
                    
                } catch (error) {
                    console.error('Error updating circle:', error);
                }
            }
        };
        
        // Add all circle inputs with immediate updates
        this.addInputWithEditingState('contextCircleCenterX', updateCircle);
        this.addInputWithEditingState('contextCircleCenterY', updateCircle);
        this.addInputWithEditingState('contextCircleR', updateCircle);
        this.addInputWithEditingState('contextCircleRotation', updateCircle);
    },

    addEllipseCoordinateListeners(element) {
        let pendingUpdate = null;
        
        const updateEllipse = () => {
            // Clear any pending update
            if (pendingUpdate) {
                clearTimeout(pendingUpdate);
                pendingUpdate = null;
            }
            
            const ellipseCenterX = document.getElementById('contextEllipseCenterX');
            const ellipseCenterY = document.getElementById('contextEllipseCenterY');
            const ellipseRX = document.getElementById('contextEllipseRX');
            const ellipseRY = document.getElementById('contextEllipseRY');
            const ellipseRotation = document.getElementById('contextEllipseRotation');
            
            // Update immediately - don't check for editing state
            if (ellipseCenterX && ellipseCenterY && ellipseRX && ellipseRY) {
                try {
                    const centerX = parseFloat(ellipseCenterX.value) * this.unitFactors[this.currentUnits];
                    const centerY = parseFloat(ellipseCenterY.value) * this.unitFactors[this.currentUnits];
                    let rx = parseFloat(ellipseRX.value) * this.unitFactors[this.currentUnits];
                    let ry = parseFloat(ellipseRY.value) * this.unitFactors[this.currentUnits];
                    
                    // Validate values
                    if (isNaN(centerX) || isNaN(centerY) || isNaN(rx) || isNaN(ry)) {
                        return;
                    }
                    
                    // Ensure positive radii
                    rx = Math.max(0.1, rx);
                    ry = Math.max(0.1, ry);
                    
                    this.selectedElements.forEach(el => {
                        if (el.tagName.toLowerCase() === 'ellipse') {
                            el.setAttribute('cx', centerX);
                            el.setAttribute('cy', centerY);
                            el.setAttribute('rx', rx);
                            el.setAttribute('ry', ry);
                            
                            if (ellipseRotation) {
                                const rotation = parseFloat(ellipseRotation.value);
                                if (!isNaN(rotation)) {
                                    if (rotation !== 0) {
                                        el.setAttribute('transform', `rotate(${rotation}, ${centerX}, ${centerY})`);
                                    } else {
                                        el.removeAttribute('transform');
                                    }
                                }
                            }
                        }
                    });
                    
                    // Update selection handles
                    this.updateSelectionHandles();
                    
                    // Update other context menu values after a small delay
                    pendingUpdate = setTimeout(() => {
                        this.updateContextMenuValues();
                    }, 100);
                    
                } catch (error) {
                    console.error('Error updating ellipse:', error);
                }
            }
        };
        
        // Add all ellipse inputs with immediate updates
        this.addInputWithEditingState('contextEllipseCenterX', updateEllipse);
        this.addInputWithEditingState('contextEllipseCenterY', updateEllipse);
        this.addInputWithEditingState('contextEllipseRX', updateEllipse);
        this.addInputWithEditingState('contextEllipseRY', updateEllipse);
        this.addInputWithEditingState('contextEllipseRotation', updateEllipse);
    }

    // Text coordinate listeners
    // Text coordinate listeners - updated to handle both position and center
    // Updated: Fixes Font Family changing and maintains previous geometry/content logic
    // Updated: Fixes Font Family changing, updates selection area, and maintains previous geometry logic,

    addTextCoordinateListeners(element) {
        let pendingUpdate = null;
        
        const updateText = async () => {
            if (pendingUpdate) clearTimeout(pendingUpdate);
            
            const textContentInput = document.getElementById('contextTextContent');
            const textFontSizeInput = document.getElementById('contextTextFontSize');
            const textWidthInput = document.getElementById('contextTextWidth');
            const textHeightInput = document.getElementById('contextTextHeight');
            const textCenterXInput = document.getElementById('contextTextCenterX');
            const textCenterYInput = document.getElementById('contextTextCenterY');
            
            if (!textContentInput) return;

            const rawText = textContentInput.value;
            const isNowLatex = this.isLatexString(rawText);
            const currentIsLatex = element.getAttribute('data-type') === 'latex';
            const bbox = element.getBBox();

            // Detect active input
            const activeId = document.activeElement ? document.activeElement.id : '';
            const isWidthEdit = activeId === 'contextTextWidth';
            const isHeightEdit = activeId === 'contextTextHeight';
            const isFontEdit = activeId === 'contextTextFontSize';
            
            // --- 1. HANDLE DIMENSION/FONT SIZE UPDATES ---
            if ((isWidthEdit || isHeightEdit || isFontEdit) && bbox.width > 0 && bbox.height > 0) {
                
                if (currentIsLatex) {
                    let newScale = 1;
                    const t = element.getAttribute('transform') || '';
                    const sm = t.match(/scale\(([-\d.]+)/);
                    const currentScale = sm ? parseFloat(sm[1]) : 1;
                    
                    if (isWidthEdit) {
                        const targetW = parseFloat(textWidthInput.value) * this.unitFactors[this.currentUnits];
                        newScale = targetW / bbox.width;
                    } else if (isHeightEdit) {
                        const targetH = parseFloat(textHeightInput.value) * this.unitFactors[this.currentUnits];
                        newScale = targetH / bbox.height;
                    } else if (isFontEdit) {
                        newScale = parseFloat(textFontSizeInput.value) / 1000;
                    } else {
                        newScale = currentScale;
                    }

                    let newTransform = t.includes('scale') ? t.replace(/scale\([^\)]+\)/, '') : t;
                    newTransform = newTransform.trim() + ` scale(${newScale})`;
                    element.setAttribute('transform', newTransform);
                    
                    // Update inputs to reflect new reality
                    const s = newScale;
                    if(!isWidthEdit && textWidthInput) this.updateInputValue('contextTextWidth', this.formatUnitValue(bbox.width * s));
                    if(!isHeightEdit && textHeightInput) this.updateInputValue('contextTextHeight', this.formatUnitValue(bbox.height * s));
                    if(!isFontEdit && textFontSizeInput) this.updateInputValue('contextTextFontSize', Math.round(s * 1000));

                } else {
                    // Standard Text Logic
                    const currentFontSize = parseFloat(element.getAttribute('font-size') || 16);
                    let newFontSize = currentFontSize;
                    
                    if (isWidthEdit) {
                        const targetW = parseFloat(textWidthInput.value) * this.unitFactors[this.currentUnits];
                        newFontSize = currentFontSize * (targetW / bbox.width);
                    } else if (isHeightEdit) {
                        const targetH = parseFloat(textHeightInput.value) * this.unitFactors[this.currentUnits];
                        newFontSize = currentFontSize * (targetH / bbox.height);
                    } else if (isFontEdit) {
                        newFontSize = parseFloat(textFontSizeInput.value);
                    }
                    
                    element.setAttribute('font-size', newFontSize);
                    
                    const ratio = newFontSize / currentFontSize;
                    if(!isWidthEdit && textWidthInput) this.updateInputValue('contextTextWidth', this.formatUnitValue(bbox.width * ratio));
                    if(!isHeightEdit && textHeightInput) this.updateInputValue('contextTextHeight', this.formatUnitValue(bbox.height * ratio));
                }
            }

            // --- 2. HANDLE CONTENT CHANGE ---
            if (isNowLatex) {
                const oldContent = currentIsLatex ? element.getAttribute('data-latex') : element.textContent;
                
                if (!currentIsLatex || oldContent !== rawText) {
                    let currentX, currentY;
                    if (currentIsLatex) {
                        const t = element.getAttribute('transform') || '';
                        const tm = t.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
                        currentX = tm ? parseFloat(tm[1]) : 0;
                        currentY = tm ? parseFloat(tm[2]) : 0;
                    } else {
                        currentX = parseFloat(element.getAttribute('x')) || 0;
                        currentY = parseFloat(element.getAttribute('y')) || 0;
                    }

                    let fontSize = 16;
                    if (textFontSizeInput && textFontSizeInput.value) {
                        fontSize = parseFloat(textFontSizeInput.value);
                    } else if (currentIsLatex) {
                        const t = element.getAttribute('transform') || '';
                        const sm = t.match(/scale\(([-\d.]+)/);
                        const s = sm ? parseFloat(sm[1]) : 1;
                        fontSize = s * 1000;
                    }

                    const newElement = await this.createLatexElement(rawText, currentX, currentY, fontSize, '#000000');

                    if (newElement) {
                        const oldTransform = element.getAttribute('transform') || '';
                        const rotMatch = oldTransform.match(/rotate\(([-\d.]+)/);
                        if (rotMatch) {
                            const t = newElement.getAttribute('transform');
                            const parts = t.split('scale');
                            newElement.setAttribute('transform', `${parts[0]} rotate(${rotMatch[1]}) scale${parts[1]}`);
                        }

                        const activeEl = document.activeElement;
                        const wasTextContent = activeEl && activeEl.id === 'contextTextContent';
                        const selStart = wasTextContent ? activeEl.selectionStart : null;
                        const selEnd = wasTextContent ? activeEl.selectionEnd : null;

                        element.parentNode.replaceChild(newElement, element);
                        this.selectedElements = [newElement];
                        this.selectedElement = newElement;
                        this.selectElement(newElement);

                        if (wasTextContent) {
                            const textInput = document.getElementById('contextTextContent');
                            if (textInput) {
                                textInput.focus();
                                if (selStart !== null && selEnd !== null) {
                                    textInput.setSelectionRange(selStart, selEnd);
                                }
                            }
                        }
                        return;
                    }
                }
            } else if (currentIsLatex && !isNowLatex) {
                // Switch from Latex to Text
                const activeEl = document.activeElement;
                const wasTextContent = activeEl && activeEl.id === 'contextTextContent';
                const selStart = wasTextContent ? activeEl.selectionStart : null;
                const selEnd = wasTextContent ? activeEl.selectionEnd : null;

                const ns = "http://www.w3.org/2000/svg";
                const newText = document.createElementNS(ns, 'text');
                const t = element.getAttribute('transform') || '';
                const tm = t.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
                newText.setAttribute('x', tm ? tm[1] : 0);
                newText.setAttribute('y', tm ? tm[2] : 0);
                newText.textContent = rawText;
                newText.setAttribute('font-size', textFontSizeInput ? textFontSizeInput.value : 16);
                newText.setAttribute('fill', '#000000');
                newText.setAttribute('font-family', 'Arial');
                element.parentNode.replaceChild(newText, element);
                this.selectedElements = [newText];
                this.selectedElement = newText;
                this.selectElement(newText);

                if (wasTextContent) {
                    const textInput = document.getElementById('contextTextContent');
                    if (textInput) {
                        textInput.focus();
                        if (selStart !== null && selEnd !== null) {
                            textInput.setSelectionRange(selStart, selEnd);
                        }
                    }
                }
                return;
            } else if (!currentIsLatex) {
                // Standard Text Update
                if (element.textContent !== rawText) {
                    element.textContent = ''; 
                    const lines = rawText.split('\n');
                    const currentX = element.getAttribute('x') || '0';
                    lines.forEach((line, i) => {
                        const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                        tspan.textContent = line;
                        tspan.setAttribute('x', currentX);
                        if (i > 0) tspan.setAttribute('dy', '1.2em');
                        element.appendChild(tspan);
                    });
                }
            }

            // --- 3. HANDLE CENTER POSITION UPDATES ---
            const isCenterEdit = activeId === 'contextTextCenterX' || activeId === 'contextTextCenterY';
            if (isCenterEdit && textCenterXInput && textCenterYInput) {
                 const targetCX = parseFloat(textCenterXInput.value) * this.unitFactors[this.currentUnits];
                 const targetCY = parseFloat(textCenterYInput.value) * this.unitFactors[this.currentUnits];
                 this.moveElement(element, targetCX, targetCY);
            }

            // If editing text content, update the displayed width & height inputs without jumping
            if (activeId === 'contextTextContent') {
                try {
                    const newBbox = element.getBBox();
                    if (newBbox && newBbox.width > 0) {
                        const twInput = document.getElementById('contextTextWidth');
                        const thInput = document.getElementById('contextTextHeight');
                        if (twInput) twInput.value = this.formatUnitValue(newBbox.width);
                        if (thInput) thInput.value = this.formatUnitValue(newBbox.height);
                    }
                } catch(e) {}
            }
            
            this.updateSelectionHandles();
        };

        // Attach listeners for geometry and content
        this.addInputWithEditingState('contextTextContent', () => {
            if (pendingUpdate) clearTimeout(pendingUpdate);
            pendingUpdate = setTimeout(updateText, 500);
        });
        this.addInputWithEditingState('contextTextWidth', updateText);
        this.addInputWithEditingState('contextTextHeight', updateText);
        this.addInputWithEditingState('contextTextFontSize', updateText);
        this.addInputWithEditingState('contextTextCenterX', updateText);
        this.addInputWithEditingState('contextTextCenterY', updateText);

        // FIX: Add Font Family Listener with UI updates
        const textFontFamilyInput = document.getElementById('contextTextFontFamily');
        if (textFontFamilyInput) {
            textFontFamilyInput.addEventListener('change', () => {
                element.setAttribute('font-family', textFontFamilyInput.value);
                // Trigger updates to resize the selection box and update width/height inputs
                this.updateSelectionHandles();
                this.updateContextMenuValues();
            });
        }
    }
    // Line coordinate listeners - updated to handle center,

    addLineCoordinateListeners(element) {
        let pendingUpdate = null;
        
        const updateLine = () => {
            if (pendingUpdate) clearTimeout(pendingUpdate);
            
            const lineX1 = document.getElementById('contextLineX1');
            const lineY1 = document.getElementById('contextLineY1');
            const lineX2 = document.getElementById('contextLineX2');
            const lineY2 = document.getElementById('contextLineY2');
            const lineCenterX = document.getElementById('contextLineCenterX');
            const lineCenterY = document.getElementById('contextLineCenterY');
            const lineRotation = document.getElementById('contextLineRotation');
            
            const activeId = document.activeElement ? document.activeElement.id : '';
            const isGeometryEdit = ['contextLineX1','contextLineY1','contextLineX2','contextLineY2'].includes(activeId);
            const isTransformEdit = ['contextLineCenterX','contextLineCenterY','contextLineRotation'].includes(activeId);

            try {
                // 1. HANDLE GEOMETRY (Start/End Points)
                // If editing geometry, we ONLY update attributes. We do NOT touch the transform.
                // This keeps the rotation pivot where it is, preventing the line from "jumping".
                if (isGeometryEdit && lineX1 && lineY1 && lineX2 && lineY2) {
                    const x1 = parseFloat(lineX1.value) * this.unitFactors[this.currentUnits];
                    const y1 = parseFloat(lineY1.value) * this.unitFactors[this.currentUnits];
                    const x2 = parseFloat(lineX2.value) * this.unitFactors[this.currentUnits];
                    const y2 = parseFloat(lineY2.value) * this.unitFactors[this.currentUnits];

                    if (!isNaN(x1)) element.setAttribute('x1', x1);
                    if (!isNaN(y1)) element.setAttribute('y1', y1);
                    if (!isNaN(x2)) element.setAttribute('x2', x2);
                    if (!isNaN(y2)) element.setAttribute('y2', y2);
                    
                    // We do NOT update the transform here. 
                    // The line will expand/contract relative to the existing rotation pivot.
                }

                // 2. HANDLE CENTER MOVEMENT (Move the whole line)
                else if ((activeId === 'contextLineCenterX' || activeId === 'contextLineCenterY') && lineCenterX && lineCenterY) {
                    const targetCX = parseFloat(lineCenterX.value) * this.unitFactors[this.currentUnits];
                    const targetCY = parseFloat(lineCenterY.value) * this.unitFactors[this.currentUnits];
                    
                    // Calculate current global center
                    const currentCX = this.getElementCenterX(element);
                    const currentCY = this.getElementCenterY(element);
                    
                    const dx = targetCX - currentCX;
                    const dy = targetCY - currentCY;
                    
                    if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
                        this.moveElement(element, targetCX, targetCY);
                    }
                }

                // 3. HANDLE ROTATION (Rotate around current center)
                else if (activeId === 'contextLineRotation' && lineRotation) {
                    const rotation = parseFloat(lineRotation.value);
                    if (!isNaN(rotation)) {
                        // For rotation input, we DO rotate around the current geometric center
                        const currentX1 = parseFloat(element.getAttribute('x1'));
                        const currentY1 = parseFloat(element.getAttribute('y1'));
                        const currentX2 = parseFloat(element.getAttribute('x2'));
                        const currentY2 = parseFloat(element.getAttribute('y2'));
                        const cx = (currentX1 + currentX2) / 2;
                        const cy = (currentY1 + currentY2) / 2;
                        
                        if (rotation !== 0) {
                            element.setAttribute('transform', `rotate(${rotation}, ${cx}, ${cy})`);
                        } else {
                            element.removeAttribute('transform');
                        }
                    }
                }
                
                this.updateSelectionHandles();
                
                // Update values in panel if they changed indirectly (debounced)
                pendingUpdate = setTimeout(() => {
                    this.updateContextMenuValues();
                }, 100);
                
            } catch (error) {
                console.error('Error updating line:', error);
            }
        };
        
        // Add listeners
        this.addInputWithEditingState('contextLineX1', updateLine);
        this.addInputWithEditingState('contextLineY1', updateLine);
        this.addInputWithEditingState('contextLineX2', updateLine);
        this.addInputWithEditingState('contextLineY2', updateLine);
        this.addInputWithEditingState('contextLineCenterX', updateLine);
        this.addInputWithEditingState('contextLineCenterY', updateLine);
        this.addInputWithEditingState('contextLineRotation', updateLine);
    },

    CoordinateListeners(element) {
        let pendingUpdate = null;
        
        const updateCurve = () => {
            if (pendingUpdate) clearTimeout(pendingUpdate);
            
            // Get inputs
            const x1In = document.getElementById('contextCurveX1');
            const y1In = document.getElementById('contextCurveY1');
            const cxIn = document.getElementById('contextCurveCX');
            const cyIn = document.getElementById('contextCurveCY');
            const x2In = document.getElementById('contextCurveX2');
            const y2In = document.getElementById('contextCurveY2');
            const rotIn = document.getElementById('contextCurveRotation');

            // Safety check: ensure all inputs exist
            if (!x1In || !y1In || !cxIn || !cyIn || !x2In || !y2In) return;

            // Parse values
            const x1 = parseFloat(x1In.value) * this.unitFactors[this.currentUnits];
            const y1 = parseFloat(y1In.value) * this.unitFactors[this.currentUnits];
            const cx = parseFloat(cxIn.value) * this.unitFactors[this.currentUnits];
            const cy = parseFloat(cyIn.value) * this.unitFactors[this.currentUnits];
            const x2 = parseFloat(x2In.value) * this.unitFactors[this.currentUnits];
            const y2 = parseFloat(y2In.value) * this.unitFactors[this.currentUnits];

            // VALIDATION: Check for NaNs to prevent "M NaN NaN..."
            if (isNaN(x1) || isNaN(y1) || isNaN(cx) || isNaN(cy) || isNaN(x2) || isNaN(y2)) {
                console.warn("Invalid curve coordinates detected");
                return;
            }

            this.selectedElements.forEach(el => {
                if (el.tagName.toLowerCase() === 'path') {
                    // Apply new path data
                    const newD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
                    el.setAttribute('d', newD);
                    
                    // Apply Rotation
                    if (rotIn) {
                        const rot = parseFloat(rotIn.value);
                        if (!isNaN(rot) && rot !== 0) {
                            const bbox = el.getBBox();
                            const centerX = bbox.x + bbox.width / 2;
                            const centerY = bbox.y + bbox.height / 2;
                            el.setAttribute('transform', `rotate(${rot}, ${centerX}, ${centerY})`);
                        } else {
                            el.removeAttribute('transform');
                        }
                    }
                }
            });
            
            this.updateSelectionHandles();
            
            // Debounce the context menu value update to prevent cursor jumping
            pendingUpdate = setTimeout(() => {
                this.updateContextMenuValues();
            }, 100);
        };

        // Add listeners
        this.addInputWithEditingState('contextCurveX1', updateCurve);
        this.addInputWithEditingState('contextCurveY1', updateCurve);
        this.addInputWithEditingState('contextCurveCX', updateCurve);
        this.addInputWithEditingState('contextCurveCY', updateCurve);
        this.addInputWithEditingState('contextCurveX2', updateCurve);
        this.addInputWithEditingState('contextCurveY2', updateCurve);
        this.addInputWithEditingState('contextCurveRotation', updateCurve);
    }
    // Path coordinate listeners,

    addPathCoordinateListeners(element) {
        let pendingUpdate = null;
        let pendingDataUpdate = null;
        
        const updatePathDimensions = () => {
            // Clear any pending update
            if (pendingUpdate) {
                clearTimeout(pendingUpdate);
                pendingUpdate = null;
            }
            
            const pathCenterX = document.getElementById('contextPathCenterX');
            const pathCenterY = document.getElementById('contextPathCenterY');
            const pathWidth = document.getElementById('contextPathWidth');
            const pathHeight = document.getElementById('contextPathHeight');
            const pathRotation = document.getElementById('contextPathRotation');
            
            // Update immediately for dimensions
            if (pathWidth && pathHeight && pathCenterX && pathCenterY) {
                try {
                    const targetWidth = parseFloat(pathWidth.value) * this.unitFactors[this.currentUnits];
                    const targetHeight = parseFloat(pathHeight.value) * this.unitFactors[this.currentUnits];
                    const targetCenterX = parseFloat(pathCenterX.value) * this.unitFactors[this.currentUnits];
                    const targetCenterY = parseFloat(pathCenterY.value) * this.unitFactors[this.currentUnits];
                    
                    // Validate values
                    if (isNaN(targetWidth) || isNaN(targetHeight) || 
                        isNaN(targetCenterX) || isNaN(targetCenterY)) {
                        return;
                    }
                    
                    this.selectedElements.forEach(el => {
                        if (el.tagName.toLowerCase() === 'path') {
                            const bbox = el.getBBox();
                            const currentWidth = bbox.width;
                            const currentHeight = bbox.height;
                            const currentCenterX = bbox.x + currentWidth / 2;
                            const currentCenterY = bbox.y + currentHeight / 2;
                            
                            // Calculate scale factors
                            const scaleX = targetWidth / currentWidth;
                            const scaleY = targetHeight / currentHeight;
                            
                            // Scale the path relative to its current center
                            this.scaleElementRelativeToPoint(el, 
                                { d: el.getAttribute('d') || '' }, 
                                scaleX, scaleY, currentCenterX, currentCenterY);
                            
                            // Then move to target center
                            const dx = targetCenterX - currentCenterX;
                            const dy = targetCenterY - currentCenterY;
                            this.translatePath(el, dx, dy);
                            
                            // Update rotation
                            if (pathRotation) {
                                const rotation = parseFloat(pathRotation.value);
                                if (!isNaN(rotation)) {
                                    const newBbox = el.getBBox();
                                    const newCenterX = newBbox.x + newBbox.width / 2;
                                    const newCenterY = newBbox.y + newBbox.height / 2;
                                    
                                    if (rotation !== 0) {
                                        el.setAttribute('transform', `rotate(${rotation}, ${newCenterX}, ${newCenterY})`);
                                    } else {
                                        el.removeAttribute('transform');
                                    }
                                }
                            }
                        }
                    });
                    
                    // Update selection handles
                    this.updateSelectionHandles();
                    
                    // Update other context menu values after a small delay
                    pendingUpdate = setTimeout(() => {
                        this.updateContextMenuValues();
                    }, 100);
                    
                } catch (error) {
                    console.error('Error updating path dimensions:', error);
                }
            }
        };
        
        const updatePathData = () => {
            // Clear any pending update
            if (pendingDataUpdate) {
                clearTimeout(pendingDataUpdate);
                pendingDataUpdate = null;
            }
            
            const pathData = document.getElementById('contextPathData');
            
            // Update immediately for path data
            if (pathData) {
                try {
                    this.selectedElements.forEach(el => {
                        if (el.tagName.toLowerCase() === 'path') {
                            el.setAttribute('d', pathData.value);
                        }
                    });
                    
                    // Update selection handles
                    this.updateSelectionHandles();
                    
                    // Update other context menu values after a small delay
                    pendingDataUpdate = setTimeout(() => {
                        this.updateContextMenuValues();
                    }, 100);
                    
                } catch (error) {
                    console.error('Error updating path data:', error);
                }
            }
        };
        
        // Add listeners for dimension inputs
        this.addInputWithEditingState('contextPathCenterX', updatePathDimensions);
        this.addInputWithEditingState('contextPathCenterY', updatePathDimensions);
        this.addInputWithEditingState('contextPathWidth', updatePathDimensions);
        this.addInputWithEditingState('contextPathHeight', updatePathDimensions);
        this.addInputWithEditingState('contextPathRotation', updatePathDimensions);
        
        // Special handling for path data (textarea)
        const pathData = document.getElementById('contextPathData');
        if (pathData) {
            // For textarea, we want immediate updates on input
            pathData.addEventListener('focus', () => {
                this.startEditingInput('contextPathData');
            });
            
            pathData.addEventListener('blur', () => {
                this.stopEditingInput('contextPathData');
                updatePathData();
            });
            
            // Update on every keystroke for path data
            pathData.addEventListener('input', () => {
                this.selectedElements.forEach(el => {
                    if (el.tagName.toLowerCase() === 'path') {
                        el.setAttribute('d', pathData.value);
                    }
                });
                this.updateSelectionHandles();
            });
            
            pathData.addEventListener('keydown', (e) => {
                // Allow navigation and text editing shortcuts
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                    e.stopPropagation();
                    return;
                }
                if ((e.ctrlKey || e.metaKey) && 
                    ['a', 'c', 'x', 'v', 'z', 'y'].includes(e.key.toLowerCase())) {
                    e.stopPropagation();
                    return;
                }
            });
        }
    },

    addCurveCoordinateListeners(element) {
        let pendingUpdate = null;
        
        const updateCurve = () => {
            if (pendingUpdate) clearTimeout(pendingUpdate);
            
            const x1In = document.getElementById('contextCurveX1');
            const y1In = document.getElementById('contextCurveY1');
            const cxIn = document.getElementById('contextCurveCX');
            const cyIn = document.getElementById('contextCurveCY');
            const x2In = document.getElementById('contextCurveX2');
            const y2In = document.getElementById('contextCurveY2');
            const rotIn = document.getElementById('contextCurveRotation');

            // Detect active input to avoid overwriting or feedback loops
            const activeId = document.activeElement ? document.activeElement.id : '';
            const isGeometryEdit = ['contextCurveX1','contextCurveY1','contextCurveCX','contextCurveCY','contextCurveX2','contextCurveY2'].includes(activeId);

            if (isGeometryEdit && x1In && y1In && cxIn && cyIn && x2In && y2In) {
                const x1 = parseFloat(x1In.value) * this.unitFactors[this.currentUnits];
                const y1 = parseFloat(y1In.value) * this.unitFactors[this.currentUnits];
                const cx = parseFloat(cxIn.value) * this.unitFactors[this.currentUnits];
                const cy = parseFloat(cyIn.value) * this.unitFactors[this.currentUnits];
                const x2 = parseFloat(x2In.value) * this.unitFactors[this.currentUnits];
                const y2 = parseFloat(y2In.value) * this.unitFactors[this.currentUnits];

                if (!isNaN(x1) && !isNaN(y1) && !isNaN(cx) && !isNaN(cy) && !isNaN(x2) && !isNaN(y2)) {
                    const newD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
                    element.setAttribute('d', newD);
                    
                    // Do NOT update transform/rotation here. 
                    // This ensures the curve points move locally while the rotation pivot stays fixed.
                }
            } else if (activeId === 'contextCurveRotation' && rotIn) {
                const rot = parseFloat(rotIn.value);
                if (!isNaN(rot)) {
                    // Calculate current geometric center for the rotation pivot
                    const bbox = element.getBBox();
                    const centerX = bbox.x + bbox.width / 2;
                    const centerY = bbox.y + bbox.height / 2;
                    
                    if (rot !== 0) {
                        element.setAttribute('transform', `rotate(${rot}, ${centerX}, ${centerY})`);
                    } else {
                        element.removeAttribute('transform');
                    }
                }
            }

            this.updateSelectionHandles();
            
            pendingUpdate = setTimeout(() => {
                this.updateContextMenuValues();
            }, 100);
        };

        this.addInputWithEditingState('contextCurveX1', updateCurve);
        this.addInputWithEditingState('contextCurveY1', updateCurve);
        this.addInputWithEditingState('contextCurveCX', updateCurve);
        this.addInputWithEditingState('contextCurveCY', updateCurve);
        this.addInputWithEditingState('contextCurveX2', updateCurve);
        this.addInputWithEditingState('contextCurveY2', updateCurve);
        this.addInputWithEditingState('contextCurveRotation', updateCurve);
    },

    addStructureCoordinateListeners(element) {
        let pendingUpdate = null;

        const updateStructure = () => {
            if (pendingUpdate) clearTimeout(pendingUpdate);

            const widthInput = document.getElementById('contextStructureWidth');
            const heightInput = document.getElementById('contextStructureHeight');
            const cxInput = document.getElementById('contextStructureCenterX');
            const cyInput = document.getElementById('contextStructureCenterY');
            const rotInput = document.getElementById('contextStructureRotation');

            if (!widthInput || !cxInput) return;

            const activeId = document.activeElement ? document.activeElement.id : '';
            const bbox = element.getBBox();
            const t = element.getAttribute('transform') || '';

            // 1. Robustly Parse Current Transform State
            let tx = 0, ty = 0, sx = 1, sy = 1, rot = 0;

            // Matches scientific notation and various spacings
            const tm = t.match(/translate\(([^,)\s]+)(?:[\s,]+([^)\s]+))?\)/);
            if (tm) { tx = parseFloat(tm[1]); ty = tm[2] ? parseFloat(tm[2]) : 0; }

            const sm = t.match(/scale\(([^,)\s]+)(?:[\s,]+([^)\s]+))?\)/);
            if (sm) { sx = parseFloat(sm[1]); sy = sm[2] ? parseFloat(sm[2]) : sx; }

            const rm = t.match(/rotate\(([-\d.]+)/);
            if (rm) { rot = parseFloat(rm[1]); }

            // 2. Calculate Local Geometric Center (Unscaled)
            // Crucial: Includes bbox.x/y in case internal path is offset
            const localCx = bbox.x + bbox.width / 2;
            const localCy = bbox.y + bbox.height / 2;

            // 3. Handle Dimension Changes (Updating Scale)
            if (activeId === 'contextStructureWidth' || activeId === 'contextStructureHeight') {
                if (activeId === 'contextStructureWidth') {
                    const targetW = parseFloat(widthInput.value) * this.unitFactors[this.currentUnits];
                    const newSx = targetW / bbox.width;
                    // Maintain position: Adjust tx so visual center stays put? 
                    // Usually width change expands from center, but simple scale expands from 0,0.
                    // Let's keep simple scale logic but update sx.
                    sx = newSx;
                    // Auto-update height to maintain aspect ratio (optional, but standard for structures)
                    sy = newSx; 
                    this.updateInputValue('contextStructureHeight', this.formatUnitValue(bbox.height * sy));
                } else {
                    const targetH = parseFloat(heightInput.value) * this.unitFactors[this.currentUnits];
                    const newSy = targetH / bbox.height;
                    sy = newSy;
                    sx = newSy; // Maintain aspect
                    this.updateInputValue('contextStructureWidth', this.formatUnitValue(bbox.width * sx));
                }
                // If we scaled, we must re-calculate translation to keep the center in place?
                // Actually, the standard behavior for these inputs is usually scaling around the current center.
                // Current Visual Center:
                const oldVisualCx = tx + localCx * (parseFloat(sm ? sm[1] : 1));
                const oldVisualCy = ty + localCy * (parseFloat(sm ? (sm[2]||sm[1]) : 1));
                
                // New Translate needed to keep that center:
                tx = oldVisualCx - (localCx * sx);
                ty = oldVisualCy - (localCy * sy);
            }

            // 4. Handle Position Changes (Updating Translate)
            if (activeId === 'contextStructureCenterX' || activeId === 'contextStructureCenterY') {
                const targetCX = parseFloat(cxInput.value) * this.unitFactors[this.currentUnits];
                const targetCY = parseFloat(cyInput.value) * this.unitFactors[this.currentUnits];

                // Formula: NewTranslate = TargetCenter - (LocalCenter * Scale)
                tx = targetCX - (localCx * sx);
                ty = targetCY - (localCy * sy);
            }

            // 5. Handle Rotation
            if (activeId === 'contextStructureRotation') {
                const r = parseFloat(rotInput.value);
                if (!isNaN(r)) rot = r;
            }

            // 6. Construct New Transform
            // We rotate around the SCALED Local Center (Pivot)
            const pivotX = localCx * sx;
            const pivotY = localCy * sy;

            const newTransform = `translate(${tx}, ${ty}) rotate(${rot}, ${pivotX}, ${pivotY}) scale(${sx}, ${sy})`;
            element.setAttribute('transform', newTransform);

            this.updateSelectionHandles();
        };

        // Attach listeners
        this.addInputWithEditingState('contextStructureWidth', updateStructure);
        this.addInputWithEditingState('contextStructureHeight', updateStructure);
        this.addInputWithEditingState('contextStructureCenterX', updateStructure);
        this.addInputWithEditingState('contextStructureCenterY', updateStructure);
        this.addInputWithEditingState('contextStructureRotation', updateStructure);
    },

    getRectProperties(element) {
        const x = parseFloat(element.getAttribute('x') || 0);
        const y = parseFloat(element.getAttribute('y') || 0);
        const width = parseFloat(element.getAttribute('width') || 0);
        const height = parseFloat(element.getAttribute('height') || 0);
        const transform = element.getAttribute('transform') || '';
        
        // Calculate center from top-left corner
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        
        let rotation = 0;
        let rotationCenterX = centerX;
        let rotationCenterY = centerY;
        
        if (transform && transform.includes('rotate')) {
            const match = transform.match(/rotate\(([-\d.]+)(?:,\s*([-\d.]+),\s*([-\d.]+))?\)/);
            if (match) {
                rotation = parseFloat(match[1]);
                if (match[2] && match[3]) {
                    rotationCenterX = parseFloat(match[2]);
                    rotationCenterY = parseFloat(match[3]);
                }
            }
        }
        
        return `
            <div class="element-property-group">
                <h4>Position (Center-based)</h4>
                <div class="element-property">
                    <span class="property-label">Center X:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextRectCenterX" 
                            value="${this.formatUnitValue(rotationCenterX)}" 
                            step="0.1"
                            data-property="center-x">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Center Y:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextRectCenterY" 
                            value="${this.formatUnitValue(rotationCenterY)}" 
                            step="0.1"
                            data-property="center-y">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Width:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextRectWidth" 
                            value="${this.formatUnitValue(width)}" 
                            step="0.1"
                            min="0.1"
                            data-property="width">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Height:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextRectHeight" 
                            value="${this.formatUnitValue(height)}" 
                            step="0.1"
                            min="0.1"
                            data-property="height">
                    </span>
                </div>
            </div>
            <div class="element-property-group">
                <h4>Transform</h4>
                <div class="element-property">
                    <span class="property-label">Rotation:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextRectRotation" 
                            value="${rotation}" 
                            step="1"
                            data-property="rotation">
                    </span>
                </div>
            </div>
        `;
    },

    getCircleProperties(element) {
        const cx = parseFloat(element.getAttribute('cx') || 0);
        const cy = parseFloat(element.getAttribute('cy') || 0);
        const r = parseFloat(element.getAttribute('r') || 0);
        const transform = element.getAttribute('transform') || '';
        
        let rotation = 0;
        let rotationCenterX = cx;
        let rotationCenterY = cy;
        
        if (transform && transform.includes('rotate')) {
            const match = transform.match(/rotate\(([-\d.]+)(?:,\s*([-\d.]+),\s*([-\d.]+))?\)/);
            if (match) {
                rotation = parseFloat(match[1]);
                if (match[2] && match[3]) {
                    rotationCenterX = parseFloat(match[2]);
                    rotationCenterY = parseFloat(match[3]);
                }
            }
        }
        
        return `
            <div class="element-property-group">
                <h4>Position</h4>
                <div class="element-property">
                    <span class="property-label">Center X:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextCircleCenterX" 
                            value="${this.formatUnitValue(rotationCenterX)}" 
                            step="0.1"
                            data-property="center-x">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Center Y:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextCircleCenterY" 
                            value="${this.formatUnitValue(rotationCenterY)}" 
                            step="0.1"
                            data-property="center-y">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Radius:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextCircleR" 
                            value="${this.formatUnitValue(r)}" 
                            step="0.1"
                            min="0.1"
                            data-property="r">
                    </span>
                </div>
            </div>
            <div class="element-property-group">
                <h4>Rotation</h4>
                <div class="element-property">
                    <span class="property-label">Rotation:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextCircleRotation" 
                            value="${rotation}" 
                            step="1"
                            data-property="rotation">
                    </span>
                </div>
            </div>
        `;
    },

    getEllipseProperties(element) {
        const cx = parseFloat(element.getAttribute('cx') || 0);
        const cy = parseFloat(element.getAttribute('cy') || 0);
        const rx = parseFloat(element.getAttribute('rx') || 0);
        const ry = parseFloat(element.getAttribute('ry') || 0);
        const transform = element.getAttribute('transform') || '';
        
        let rotation = 0;
        let rotationCenterX = cx;
        let rotationCenterY = cy;
        
        if (transform && transform.includes('rotate')) {
            const match = transform.match(/rotate\(([-\d.]+)(?:,\s*([-\d.]+),\s*([-\d.]+))?\)/);
            if (match) {
                rotation = parseFloat(match[1]);
                if (match[2] && match[3]) {
                    rotationCenterX = parseFloat(match[2]);
                    rotationCenterY = parseFloat(match[3]);
                }
            }
        }
        
        return `
            <div class="element-property-group">
                <h4>Position</h4>
                <div class="element-property">
                    <span class="property-label">Center X:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextEllipseCenterX" 
                            value="${this.formatUnitValue(rotationCenterX)}" 
                            step="0.1"
                            data-property="center-x">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Center Y:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextEllipseCenterY" 
                            value="${this.formatUnitValue(rotationCenterY)}" 
                            step="0.1"
                            data-property="center-y">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Radius X:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextEllipseRX" 
                            value="${this.formatUnitValue(rx)}" 
                            step="0.1"
                            min="0.1"
                            data-property="rx">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Radius Y:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextEllipseRY" 
                            value="${this.formatUnitValue(ry)}" 
                            step="0.1"
                            min="0.1"
                            data-property="ry">
                    </span>
                </div>
            </div>
            <div class="element-property-group">
                <h4>Rotation</h4>
                <div class="element-property">
                    <span class="property-label">Rotation:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextEllipseRotation" 
                            value="${rotation}" 
                            step="1"
                            data-property="rotation">
                    </span>
                </div>
            </div>
        `;
    },

    getCurveProperties(element) {
        const d = element.getAttribute('d') || '';
        const match = d.match(/^M\s*([\d.-]+)[\s,]+([\d.-]+)\s*Q\s*([\d.-]+)[\s,]+([\d.-]+)\s*([\d.-]+)[\s,]+([\d.-]+)$/i);
        
        if (!match) return this.getPathProperties(element);

        const x1 = parseFloat(match[1]);
        const y1 = parseFloat(match[2]);
        const cx = parseFloat(match[3]);
        const cy = parseFloat(match[4]);
        const x2 = parseFloat(match[5]);
        const y2 = parseFloat(match[6]);

        const transform = element.getAttribute('transform') || '';
        let rotation = 0;
        
        if (transform && transform.includes('rotate')) {
            const match = transform.match(/rotate\(([-\d.]+)(?:,\s*([-\d.]+),\s*([-\d.]+))?\)/);
            if (match) {
                rotation = parseFloat(match[1]);
            }
        }

        return `
            <div class="element-property-group">
                <h4>Curve Geometry</h4>
                <div class="element-property">
                    <span class="property-label">Start X:</span>
                    <span class="property-value">
                        <input type="number" id="contextCurveX1" value="${this.formatUnitValue(x1)}" step="0.1" data-property="x1">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Start Y:</span>
                    <span class="property-value">
                        <input type="number" id="contextCurveY1" value="${this.formatUnitValue(y1)}" step="0.1" data-property="y1">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Control X:</span>
                    <span class="property-value">
                        <input type="number" id="contextCurveCX" value="${this.formatUnitValue(cx)}" step="0.1" data-property="cx">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Control Y:</span>
                    <span class="property-value">
                        <input type="number" id="contextCurveCY" value="${this.formatUnitValue(cy)}" step="0.1" data-property="cy">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">End X:</span>
                    <span class="property-value">
                        <input type="number" id="contextCurveX2" value="${this.formatUnitValue(x2)}" step="0.1" data-property="x2">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">End Y:</span>
                    <span class="property-value">
                        <input type="number" id="contextCurveY2" value="${this.formatUnitValue(y2)}" step="0.1" data-property="y2">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Rotation:</span>
                    <span class="property-value">
                        <input type="number" id="contextCurveRotation" value="${rotation}" step="1" data-property="rotation">
                    </span>
                </div>
            </div>
        `;
    },

    getLineProperties(element) {
        const x1 = parseFloat(element.getAttribute('x1') || 0);
        const y1 = parseFloat(element.getAttribute('y1') || 0);
        const x2 = parseFloat(element.getAttribute('x2') || 0);
        const y2 = parseFloat(element.getAttribute('y2') || 0);
        const transform = element.getAttribute('transform') || '';
        
        // Parse rotation and rotation center
        let rotation = 0;
        const lineCenterX = (x1 + x2) / 2;
        const lineCenterY = (y1 + y2) / 2;
        let rotationCenterX = lineCenterX;
        let rotationCenterY = lineCenterY;
        
        if (transform && transform.includes('rotate')) {
            const match = transform.match(/rotate\(([-\d.]+)(?:,\s*([-\d.]+),\s*([-\d.]+))?\)/);
            if (match) {
                rotation = parseFloat(match[1]);
                if (match[2] && match[3]) {
                    rotationCenterX = parseFloat(match[2]);
                    rotationCenterY = parseFloat(match[3]);
                }
            }
        }
        
        return `
            <div class="element-property-group">
                <h4>Geometry</h4>
                <div class="element-property">
                    <span class="property-label">Start X:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextLineX1" 
                            value="${this.formatUnitValue(x1)}" 
                            step="0.1"
                            data-property="x1">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Start Y:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextLineY1" 
                            value="${this.formatUnitValue(y1)}" 
                            step="0.1"
                            data-property="y1">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">End X:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextLineX2" 
                            value="${this.formatUnitValue(x2)}" 
                            step="0.1"
                            data-property="x2">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">End Y:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextLineY2" 
                            value="${this.formatUnitValue(y2)}" 
                            step="0.1"
                            data-property="y2">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Center X:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextLineCenterX" 
                            value="${this.formatUnitValue(rotationCenterX)}" 
                            step="0.1"
                            data-property="center-x">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Center Y:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextLineCenterY" 
                            value="${this.formatUnitValue(rotationCenterY)}" 
                            step="0.1"
                            data-property="center-y">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Rotation:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextLineRotation" 
                            value="${rotation}" 
                            step="1"
                            data-property="rotation">
                    </span>
                </div>
            </div>
        `;
    },

    getTextProperties(element) {
        // Check if this is a LaTeX group or standard text
        const isLatex = element.getAttribute('data-type') === 'latex';
        
        let textContent = '';
        let fontFamily = 'Arial';
        let fontSize = 16;
        
        // Get geometric info
        const bbox = element.getBBox();
        
        // Calculate VISUAL Position and Size (accounting for transforms)
        let scaleX = 1;
        let scaleY = 1;
        let x = 0;
        let y = 0;
        
        if (isLatex) {
            const transform = element.getAttribute('transform') || '';
            
            // Parse Translate
            const translateMatch = transform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
            if (translateMatch) {
                x = parseFloat(translateMatch[1]);
                y = parseFloat(translateMatch[2]);
            }
            
            // Parse Scale (Handle both uniform "scale(s)" and non-uniform "scale(sx, sy)")
            const scaleMatch = transform.match(/scale\(([-\d.]+)(?:,\s*([-\d.]+))?\)/);
            if (scaleMatch) {
                scaleX = parseFloat(scaleMatch[1]);
                scaleY = scaleMatch[2] ? parseFloat(scaleMatch[2]) : scaleX;
            }
            
            // LaTeX "FontSize" proxy is the visual height
            fontSize = bbox.height * scaleY;
            textContent = element.getAttribute('data-latex') || '';
        } else {
            // Standard Text
            x = parseFloat(element.getAttribute('x') || 0);
            y = parseFloat(element.getAttribute('y') || 0);
            textContent = element.textContent || '';
            const tspans = element.querySelectorAll('tspan');
            if (tspans.length > 0) {
                textContent = Array.from(tspans).map(t => t.textContent).join('\n');
            }
            fontSize = parseFloat(element.getAttribute('font-size') || 16);
            fontFamily = element.getAttribute('font-family') || 'Arial';
        }

        // Calculate visual dimensions
        const visualWidth = bbox.width * scaleX;
        const visualHeight = bbox.height * scaleY;
        
        // Visual Center (for the center inputs)
        const centerX = x + (bbox.x + bbox.width/2) * scaleX;
        const centerY = y + (bbox.y + bbox.height/2) * scaleY;

        return `
            <div class="element-property-group">
                <h4>${isLatex ? 'LaTeX Object' : 'Text'} Geometry</h4>
                <div class="element-property">
                    <span class="property-label">Width:</span>
                    <span class="property-value">
                        <input type="number" id="contextTextWidth" value="${this.formatUnitValue(visualWidth)}" step="0.1" min="0.1">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Height:</span>
                    <span class="property-value">
                        <input type="number" id="contextTextHeight" value="${this.formatUnitValue(visualHeight)}" step="0.1" min="0.1">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Center X:</span>
                    <span class="property-value">
                        <input type="number" id="contextTextCenterX" value="${this.formatUnitValue(centerX)}" step="0.1">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Center Y:</span>
                    <span class="property-value">
                        <input type="number" id="contextTextCenterY" value="${this.formatUnitValue(centerY)}" step="0.1">
                    </span>
                </div>
            </div>
            <div class="element-property-group">
                <h4>Content ${isLatex ? '(LaTeX)' : ''}</h4>
                ${!isLatex ? `
                <div class="element-property">
                    <span class="property-label">Font Size:</span>
                    <span class="property-value">
                        <input type="number" id="contextTextFontSize" value="${Math.round(fontSize)}" step="1" min="1">
                    </span>
                </div>` : ''}
                 <div class="element-property">
                    <span class="property-value" style="width: 100%;">
                        <textarea id="contextTextContent" 
                            rows="3" 
                            style="width: 100%; font-size: 12px; font-family: ${isLatex ? 'monospace' : 'inherit'}"
                            placeholder="${isLatex ? '$$ \\frac{a}{b} $$' : 'Enter text...'}">${textContent}</textarea>
                    </span>
                </div>
                 ${!isLatex ? `
                <div class="element-property">
                    <span class="property-label">Font:</span>
                    <span class="property-value">
                        <select id="contextTextFontFamily">
                            <option value="Arial" ${fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
                            <option value="Times New Roman" ${fontFamily === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
                            <option value="Courier New" ${fontFamily === 'Courier New' ? 'selected' : ''}>Courier New</option>
                        </select>
                    </span>
                </div>` : '<div style="font-size:10px; color:#666; margin-top:5px;">Edit dimensions to scale, or content to update render.</div>'}
            </div>
        `;
    }
    // Check if string is wrapped in $$...$$,

    isLatexString(str) {
        // Fix: Only check start. This prevents showing raw "$$..." while typing the end.
        return str.trim().startsWith('$$');
    }

    // Convert LaTeX string to SVG Element,

    async createLatexElement(latexString, x, y, fontSize, fill) {
        if (!window.MathJax) {
            console.warn('MathJax not loaded');
            return null;
        }

        try {
            // Fix: Robustly strip leading/trailing $$ so they are never rendered
            let cleanTex = latexString.trim();
            if (cleanTex.startsWith('$$')) cleanTex = cleanTex.substring(2);
            if (cleanTex.endsWith('$$')) cleanTex = cleanTex.substring(0, cleanTex.length - 2);
            
            cleanTex = cleanTex.trim();
            if (cleanTex === '') return null; // Don't render empty blocks

            const svgContainer = await MathJax.tex2svgPromise(cleanTex);
            const mathSvg = svgContainer.querySelector('svg');
            
            if (!mathSvg) return null;

            const ns = "http://www.w3.org/2000/svg";
            const group = document.createElementNS(ns, 'g');
            
            group.setAttribute('data-type', 'latex');
            // Store the original string (with $$) for the editor input
            group.setAttribute('data-latex', latexString);
            
            group.setAttribute('fill', '#000000');
            group.setAttribute('stroke', 'none');
            
            const innerG = mathSvg.querySelector('g');
            if (innerG) {
                const clone = innerG.cloneNode(true);
                clone.setAttribute('fill', 'inherit'); 
                group.appendChild(clone);
                
                const defs = mathSvg.querySelector('defs');
                if (defs) {
                    let canvasDefs = this.canvas.querySelector('defs');
                    if (!canvasDefs) {
                        canvasDefs = document.createElementNS(ns, 'defs');
                        this.canvas.insertBefore(canvasDefs, this.canvas.firstChild);
                    }
                    Array.from(defs.children).forEach(def => {
                        if (!document.getElementById(def.id)) {
                            canvasDefs.appendChild(def.cloneNode(true));
                        }
                    });
                }
            }

            const scale = fontSize / 1000;
            group.setAttribute('transform', `translate(${x}, ${y}) scale(${scale})`);
            
            return group;
        } catch (err) {
            console.error('MathJax conversion failed:', err);
            return null;
        }
    },

    getPathProperties(element) {
        const d = element.getAttribute('d') || '';
        const bbox = element.getBBox();
        const transform = element.getAttribute('transform') || '';
        
        // Parse rotation and rotation center
        let rotation = 0;
        let rotationCenterX = bbox.x + bbox.width / 2;
        let rotationCenterY = bbox.y + bbox.height / 2;
        
        if (transform && transform.includes('rotate')) {
            const match = transform.match(/rotate\(([-\d.]+)(?:,\s*([-\d.]+),\s*([-\d.]+))?\)/);
            if (match) {
                rotation = parseFloat(match[1]);
                if (match[2] && match[3]) {
                    rotationCenterX = parseFloat(match[2]);
                    rotationCenterY = parseFloat(match[3]);
                }
            }
        }
        
        // Count path commands
        const commandCount = d.match(/[MmLlHhVvCcSsQqTtAaZz]/g)?.length || 0;
        
        return `
            <div class="element-property-group">
                <h4>Bounding Box</h4>
                <div class="element-property">
                    <span class="property-label">Center X:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextPathCenterX" 
                            value="${this.formatUnitValue(rotationCenterX)}" 
                            step="0.1"
                            data-property="center-x">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Center Y:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextPathCenterY" 
                            value="${this.formatUnitValue(rotationCenterY)}" 
                            step="0.1"
                            data-property="center-y">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Width:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextPathWidth" 
                            value="${this.formatUnitValue(bbox.width)}" 
                            step="0.1"
                            min="0.1"
                            data-property="width">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Height:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextPathHeight" 
                            value="${this.formatUnitValue(bbox.height)}" 
                            step="0.1"
                            min="0.1"
                            data-property="height">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Rotation:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextPathRotation" 
                            value="${rotation}" 
                            step="1"
                            data-property="rotation">
                    </span>
                </div>
            </div>
            <div class="element-property-group">
                <h4>Path Info</h4>
                <div class="element-property">
                    <span class="property-label">Commands:</span>
                    <span class="property-value">${commandCount}</span>
                </div>
                <div class="element-property">
                    <span class="property-label">Path Data:</span>
                    <span class="property-value">
                        <textarea id="contextPathData" 
                                rows="3" 
                                style="width: 100%; font-size: 11px; font-family: monospace;"
                                data-property="d">${d}</textarea>
                    </span>
                </div>
            </div>
        `;
    },

    getStructureProperties(element) {
        // Get geometric info using bounding box
        const bbox = element.getBBox();
        const transform = element.getAttribute('transform') || '';
        
        // Parse Transform to get visual position/scale
        let tx = 0, ty = 0, scaleX = 1, scaleY = 1, rotation = 0;
        
        const translateMatch = transform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
        if (translateMatch) {
            tx = parseFloat(translateMatch[1]);
            ty = parseFloat(translateMatch[2]);
        }
        
        const scaleMatch = transform.match(/scale\(([-\d.]+)(?:,\s*([-\d.]+))?\)/);
        if (scaleMatch) {
            scaleX = parseFloat(scaleMatch[1]);
            scaleY = scaleMatch[2] ? parseFloat(scaleMatch[2]) : scaleX;
        }

        const rotateMatch = transform.match(/rotate\(([-\d.]+)/);
        if (rotateMatch) {
            rotation = parseFloat(rotateMatch[1]);
        }

        // Calculate Visual Properties
        const width = bbox.width * scaleX;
        const height = bbox.height * scaleY;
        const centerX = tx + (bbox.x + bbox.width/2) * scaleX;
        const centerY = ty + (bbox.y + bbox.height/2) * scaleY;

        return `
            <div class="element-property-group">
                <h4>Structure Properties</h4>
                <div class="element-property">
                    <span class="property-label">Width:</span>
                    <span class="property-value">
                        <input type="number" id="contextStructureWidth" value="${this.formatUnitValue(width)}" step="0.1" min="0.1">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Height:</span>
                    <span class="property-value">
                        <input type="number" id="contextStructureHeight" value="${this.formatUnitValue(height)}" step="0.1" min="0.1">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Center X:</span>
                    <span class="property-value">
                        <input type="number" id="contextStructureCenterX" value="${this.formatUnitValue(centerX)}" step="0.1">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Center Y:</span>
                    <span class="property-value">
                        <input type="number" id="contextStructureCenterY" value="${this.formatUnitValue(centerY)}" step="0.1">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Rotation:</span>
                    <span class="property-value">
                        <input type="number" id="contextStructureRotation" value="${Math.round(rotation)}" step="1">
                    </span>
                </div>
            </div>
            <div class="element-property-group">
                <h4>Info</h4>
                <div class="element-property">
                    <span class="property-label" style="width:100%">Imported SVG Group</span>
                </div>
            </div>
        `;
    },

    getStyleProperties(element) {
        const fill = element.getAttribute('fill') || 'none';
        const stroke = element.getAttribute('stroke') || 'none';
        const strokeWidth = element.getAttribute('stroke-width') || '0';
        const opacity = element.getAttribute('opacity') || '1';
        
        // Check if laser mode is enabled
        const isLaserMode = this.laserMode;
        const fillDisabled = isLaserMode ? 'disabled' : '';
        const strokeDisabled = isLaserMode ? 'disabled' : '';
        
        return `
            <div class="element-property-group">
                <h4>Style</h4>
                <div class="element-property">
                    <span class="property-label">Fill:</span>
                    <span class="property-value">
                        <input type="color" 
                            id="contextFillColor" 
                            value="${fill !== 'none' ? fill : '#4CAF50'}" 
                            ${fillDisabled}
                            data-property="fill">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Stroke:</span>
                    <span class="property-value">
                        <input type="color" 
                            id="contextStrokeColor" 
                            value="${stroke !== 'none' ? stroke : '#000000'}" 
                            ${strokeDisabled}
                            data-property="stroke">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Stroke Width:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextStrokeWidth" 
                            value="${strokeWidth}" 
                            min="0" 
                            max="50" 
                            step="0.1"
                            data-property="stroke-width">
                    </span>
                </div>
                <div class="element-property">
                    <span class="property-label">Opacity:</span>
                    <span class="property-value">
                        <input type="number" 
                            id="contextOpacity" 
                            value="${opacity}" 
                            min="0" 
                            max="1" 
                            step="0.1"
                            data-property="opacity">
                    </span>
                </div>
            </div>
        `;
    },

    updateStyleInputs(element) {
        const fill = element.getAttribute('fill') || 'none';
        const stroke = element.getAttribute('stroke') || 'none';
        const strokeWidth = element.getAttribute('stroke-width') || '0';
        const opacity = element.getAttribute('opacity') || '1';
        
        // Update style inputs if they exist and user is not editing them
        this.updateInputValue('contextFillColor', fill !== 'none' ? fill : '#4CAF50');
        this.updateInputValue('contextStrokeColor', stroke !== 'none' ? stroke : '#000000');
        this.updateInputValue('contextStrokeWidth', strokeWidth);
        this.updateInputValue('contextOpacity', opacity);
    }

    // Add this to your class or script,

    startEditingInput(inputId) {
        this.editingInputs.add(inputId);
    },

    stopEditingInput(inputId) {
        this.editingInputs.delete(inputId);
    },

    isEditingInput(inputId) {
        return this.editingInputs.has(inputId);
    }

    // Update the updateInputValue method again:,

    updateInputValue(inputId, value) {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        // Convert value to string for comparison
        const valueStr = value.toString();
        
        // Don't update if:
        // 1. User is currently editing this input
        // 2. The value hasn't changed
        // 3. The input is currently focused (even if not in editingInputs set)
        if (this.isEditingInput(inputId) || 
            document.activeElement === input || 
            input.value === valueStr) {
            return;
        }
        
        // Update the value
        input.value = valueStr;
    },

    addInputWithEditingState(inputId, onChangeCallback) {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        let updateTimeout = null;
        let lastValue = input.value;
        
        const handleFocus = () => {
            this.startEditingInput(inputId);
            lastValue = input.value; // Store initial value
        };
        
        const handleBlur = () => {
            this.stopEditingInput(inputId);
            // Clear any pending timeout
            if (updateTimeout) {
                clearTimeout(updateTimeout);
                updateTimeout = null;
            }
            // If value changed since focus, trigger update
            if (input.value !== lastValue && onChangeCallback) {
                onChangeCallback();
            }
        };
        
        const handleInput = () => {
            // Debounce the update to improve performance but update immediately
            if (updateTimeout) {
                clearTimeout(updateTimeout);
            }
            
            // Update immediately for certain inputs (e.g., text content)
            if (input.type === 'text' || input.type === 'textarea' || 
                inputId.includes('Content') || inputId.includes('Data')) {
                // Update immediately for text fields
                if (onChangeCallback) onChangeCallback();
            } else {
                // For numeric fields, debounce to avoid too many updates
                updateTimeout = setTimeout(() => {
                    if (onChangeCallback) onChangeCallback();
                    updateTimeout = null;
                }, 50); // 50ms debounce for numbers
            }
        };
        
        const handleKeydown = (e) => {
            // Allow navigation within input
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                e.stopPropagation();
                return;
            }
            
            // Allow text selection and editing shortcuts
            if ((e.ctrlKey || e.metaKey) && 
                ['a', 'c', 'x', 'v', 'z', 'y'].includes(e.key.toLowerCase())) {
                e.stopPropagation();
                return;
            }
            
            // For Tab key, let it work normally but stop propagation
            if (e.key === 'Tab') {
                e.stopPropagation();
            }
            
            // Enter key to commit changes
            if (e.key === 'Enter') {
                // In textarea, allow Enter to insert newline unless Ctrl/Meta is pressed
                if (input.tagName === 'TEXTAREA' && !e.ctrlKey && !e.metaKey) {
                    e.stopPropagation();
                    return;
                }
                if (updateTimeout) {
                    clearTimeout(updateTimeout);
                    updateTimeout = null;
                }
                if (onChangeCallback) onChangeCallback();
                input.blur(); // Move focus away
            }
        };
        
        input.addEventListener('focus', handleFocus);
        input.addEventListener('blur', handleBlur);
        input.addEventListener('input', handleInput);
        input.addEventListener('keydown', handleKeydown);
        
        // For select elements, also add change event
        if (input.tagName === 'SELECT') {
            input.addEventListener('change', () => {
                if (onChangeCallback) onChangeCallback();
            });
        }
        
        return input;
    },

    updateUnitInfo() {
        this.updateStatusBarMode();
    },

    getUnitDisplayName() {
        switch(this.currentUnits) {
            case 'px': return 'Pixels (px)';
            case 'mm': return 'Millimeters (mm)';
            case 'cm': return 'Centimeters (cm)';
            case 'in': return 'Inches (in)';
            default: return 'Pixels (px)';
        }
    },

    getElementType(element) {
        if (!element) return '';
        if (element.getAttribute('data-type') === 'curve') {
            return 'curve';
        }
        return element.tagName.toLowerCase();
    },

    getElementDisplayName(element, index) {
        const tagName = element.tagName.toLowerCase();
        const type = element.getAttribute('data-type'); // Check for custom types
        
        // 1. Handle Structures
        if (type === 'structure') {
            return `Structure #${index + 1}`;
        }

        // 2. Handle LaTeX
        if (type === 'latex') {
            const raw = element.getAttribute('data-latex') || '';
            // Clean up string for display
            const clean = raw.replace(/\$\$/g, '').trim().substring(0, 15);
            return `LaTeX: ${clean}...`;
        }

        // 3. Handle Standard Groups
        if (tagName === 'g') {
            return `Group #${index + 1}`;
        }

        const baseName = tagName.charAt(0).toUpperCase() + tagName.slice(1);
        
        switch(tagName) {
            case 'rect':
                const width = parseFloat(element.getAttribute('width') || 0);
                const height = parseFloat(element.getAttribute('height') || 0);
                return `${baseName} (${this.formatUnitValue(width)}×${this.formatUnitValue(height)})`;
                
            case 'circle':
                const r = parseFloat(element.getAttribute('r') || 0);
                return `${baseName} (R:${this.formatUnitValue(r)})`;
                
            case 'ellipse':
                const rx = parseFloat(element.getAttribute('rx') || 0);
                const ry = parseFloat(element.getAttribute('ry') || 0);
                return `${baseName} (${this.formatUnitValue(rx)}×${this.formatUnitValue(ry)})`;
                
            case 'line':
                return `${baseName} (Line)`;
                
            case 'text':
                const text = element.textContent || '';
                return `${baseName}: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`;
                
            case 'path':
                if (element.getAttribute('data-type') === 'curve') return `Curve #${index + 1}`;
                return `${baseName} (Path)`;
                
            default:
                return `${baseName} ${index + 1}`;
        }
    },

    getElementIcon(tagName) {
        const icons = {
            'rect': '▭',
            'circle': '●',
            'ellipse': '◯',
            'line': '╱',
            'path': '⌒',
            'text': 'T',
            'polygon': '△',
            'polyline': '⌓',
            'g': '◳',         // Icon for Groups
            'latex': 'Σ',    // Icon for LaTeX
            'structure': '❖' // Icon for Structures
        };
        
        // Check if we are dealing with a group, check context for specific icon
        // (This method receives string tagName, so we handle logic in the loop or make this context aware. 
        // However, for simplicity, we usually pass the string. 
        // To support dynamic icons based on attributes, we update the caller.)
        
        return icons[tagName.toLowerCase()] || '◼';
    }

    // --- ADD THESE METHODS TO SVGEditor ---

    // 1. Zoom/Locate Element,

    setupTooltips() {
        const tooltip = document.getElementById('global-tooltip');
        const tools = document.querySelectorAll('.tool[data-title]');

        tools.forEach(tool => {
            tool.addEventListener('mouseenter', (e) => {
                const title = tool.getAttribute('data-title');
                if (!title) return;

                // Set text
                tooltip.textContent = title;
                tooltip.classList.add('visible');

                // Calculate Position
                const rect = tool.getBoundingClientRect();
                
                // Position: Right of the sidebar button (rect.right + gap)
                // Vertically centered to the button
                const top = rect.top + (rect.height / 2) - (tooltip.offsetHeight / 2);
                const left = rect.right + 10; // 10px gap

                tooltip.style.top = `${top}px`;
                tooltip.style.left = `${left}px`;
            });

            tool.addEventListener('mouseleave', () => {
                tooltip.classList.remove('visible');
            });
        });
    }
    
    
    // Helper method to update input value without triggering change event,

    applyProperties(element) {
        if (this.laserMode) {
            element.setAttribute('fill', 'none');
            element.setAttribute('stroke', '#000000');
            element.setAttribute('stroke-width', '1');
        } else {
            // Get values from context menu if available, otherwise use defaults
            const fillColorInput = document.getElementById('contextFillColor');
            const strokeColorInput = document.getElementById('contextStrokeColor');
            const strokeWidthInput = document.getElementById('contextStrokeWidth');
            const opacityInput = document.getElementById('contextOpacity');
            
            const fill = fillColorInput ? fillColorInput.value : this.properties.fill;
            const stroke = strokeColorInput ? strokeColorInput.value : this.properties.stroke;
            const strokeWidth = strokeWidthInput ? strokeWidthInput.value : this.properties.strokeWidth;
            const opacity = opacityInput ? opacityInput.value : this.properties.opacity;
            
            element.setAttribute('fill', fill);
            element.setAttribute('stroke', stroke);
            element.setAttribute('stroke-width', strokeWidth);
            element.setAttribute('opacity', opacity);
        }
        // Removed this.saveState() to prevent saving during intermediate creation steps
    }

});
