/**
 * VectorCutter - SVG Editor Module
 * Module: editor-selection.js
 * Description: Selection Marquee, Multi-Selection, Bounding Boxes, Handles & Snapping
 */

Object.assign(SVGEditor.prototype, {
    startAreaSelection(clientX, clientY) {
        const svgPoint = this.screenToSVG(clientX, clientY);
        this.selectionRectStart = svgPoint;
        this.isSelecting = true;
        
        // Create selection rectangle
        const ns = "http://www.w3.org/2000/svg";
        this.selectionRectElement = document.createElementNS(ns, 'rect');
        this.selectionRectElement.setAttribute('class', 'selection-area');
        this.selectionRectElement.setAttribute('x', svgPoint.x);
        this.selectionRectElement.setAttribute('y', svgPoint.y);
        this.selectionRectElement.setAttribute('width', '0');
        this.selectionRectElement.setAttribute('height', '0');
        this.selectionRectElement.setAttribute('fill', 'rgba(0, 122, 204, 0.1)');
        this.selectionRectElement.setAttribute('stroke', '#007acc');
        this.selectionRectElement.setAttribute('stroke-width', '1');
        this.selectionRectElement.setAttribute('stroke-dasharray', '5,5');
        this.canvas.appendChild(this.selectionRectElement);
    },

    finishAreaSelection() {
        if (!this.selectionRectStart || !this.selectionRectElement) return;
        
        // Safety check for the selection rect itself
        if (typeof this.selectionRectElement.getBBox !== 'function') return;
        
        const rect = this.selectionRectElement.getBBox();
        
        this.clearSelection();
        
        const allElements = Array.from(this.canvas.children).filter(child => {
            // 1. Must be a visual SVG element (Has getBBox)
            // This includes <g>, <path>, <rect>, etc., but excludes <style>, <defs>
            if (!(child instanceof SVGGraphicsElement)) return false;

            // 2. Filter out Editor UI components
            if (child.classList.contains('axis-line') || 
                child.classList.contains('axis-label') || 
                child.classList.contains('grid-label') ||
                child.classList.contains('selection-group') ||
                child.classList.contains('selection-area') ||
                child.classList.contains('grid-group') ||
                child.classList.contains('axes-group') ||
                child === this.selectionRectElement) {
                return false;
            }

            // 3. We NOW ALLOW 'g' (groups) so you can work with imported files
            return true; 
        });
        
        allElements.forEach(element => {
            try {
                const bbox = element.getBBox();
                if (this.rectanglesIntersect(rect, bbox)) {
                    this.selectedElements.push(element);
                    element.style.outline = '2px dashed #007acc';
                }
            } catch (e) {
                // Silently skip elements that fail calculation
            }
        });
        
        if (this.selectionRectElement.parentNode) {
            this.selectionRectElement.parentNode.removeChild(this.selectionRectElement);
        }
        
        this.selectionRectStart = null;
        this.selectionRectElement = null;
        this.isSelecting = false;
        
        if (this.selectedElements.length > 0) {
            this.updateSelectionHandles();
            this.updateContextMenu(); // Update the sidebar
        }
    },

    updateAreaSelection(clientX, clientY) {
        if (!this.selectionRectStart || !this.selectionRectElement) return;
        
        const svgPoint = this.screenToSVG(clientX, clientY);
        const x = Math.min(this.selectionRectStart.x, svgPoint.x);
        const y = Math.min(this.selectionRectStart.y, svgPoint.y);
        const width = Math.abs(svgPoint.x - this.selectionRectStart.x);
        const height = Math.abs(svgPoint.y - this.selectionRectStart.y);
        
        this.selectionRectElement.setAttribute('x', x);
        this.selectionRectElement.setAttribute('y', y);
        this.selectionRectElement.setAttribute('width', width);
        this.selectionRectElement.setAttribute('height', height);
    },

    rectanglesIntersect(rect1, rect2) {
        return !(rect2.x > rect1.x + rect1.width || 
                rect2.x + rect2.width < rect1.x || 
                rect2.y > rect1.y + rect1.height ||
                rect2.y + rect2.height < rect1.y);
    },

    selectElement(element) {
        // Remove ALL selection visuals first
        this.removeSelectionHandles();
        
        // Clear outline from previous element
        if (this.selectedElement) {
            this.selectedElement.style.outline = 'none';
        }

        // Clear any existing outlines from multi-selection
        this.selectedElements.forEach(el => {
            if (el !== element) {
                el.style.outline = 'none';
            }
        });

        this.selectedElement = element;
        this.selectedElements = [element];
        
        if (element && element !== this.canvas && !element.classList.contains('axis-line') && 
            !element.classList.contains('axis-label') && !element.classList.contains('grid-label')) {
            
            // Apply outline
            element.style.outline = '2px dashed #007acc';
            
            // Create selection handles
            this.createSelectionHandles(element);
            
            // Update context menu
            this.updateContextMenu();
            
            // IMPORTANT: Also update the context menu values immediately
            this.updateContextMenuValues();
            
            // Update element list highlight
            this.updateElementsListHighlight();
        } else {
            // Show "no selection" in context menu
            this.updateContextMenu();
            this.removeSelectionHandles();
        }
    }
    
    // Add new method to get transformed bounding box,

    selectAllElements() {
        // 1. Get all valid user elements (groups, paths, shapes, etc.)
        const allElements = this.getUserElements();
        
        if (allElements.length === 0) return;

        // 2. Clear any partial existing selection visuals first
        this.selectedElements.forEach(el => el.style.outline = 'none');
        
        // 3. Update Internal State
        // Create a shallow copy to ensure array integrity
        this.selectedElements = [...allElements];
        
        // 4. Update Visuals (Outlines)
        this.selectedElements.forEach(element => {
            element.style.outline = '2px dashed #007acc';
        });
        
        // 5. Update Editor UI Components
        // This draws the big bounding box around everything
        this.updateSelectionHandles();
        
        // This updates the Sidebar (Properties & Element List)
        this.updateContextMenu();
        
        // This specifically highlights the rows in the Element List
        this.updateElementsListHighlight();
        
        // 6. Focus the container so keyboard shortcuts (like Delete) work immediately
        this.canvasContainer.focus();
    },

    selectAll() {
        // For demonstration, we'll select all non-axis elements
        const allElements = this.canvas.querySelectorAll('*');
        allElements.forEach(element => {
            if (!element.classList.contains('axis-line') && 
                !element.classList.contains('axis-label') && 
                !element.classList.contains('grid-label')) {
                element.style.outline = '2px dashed #007acc';
            }
        });
    },

    clearSelection() {
        // Clear outline from all elements
        this.selectedElements.forEach(element => {
            element.style.outline = 'none';
        });
        this.selectedElements = [];
        this.selectedElement = null;
        this.removeSelectionHandles();
        
        // Clear editing state
        this.editingInputs.clear();
        
        // Clear selection group transform
        if (this.selectionGroup) {
            this.selectionGroup.removeAttribute('transform');
        }
        
        // Update context menu to show "no selection"
        this.updateContextMenu();
    },

    deleteSelectedElements() {
        // Delete with confirmation for Del key
        this.performDeleteElements(true);
    },

    performDeleteElements(askConfirm = true) {
        if (this.selectedElements.length === 0) return;

        if (askConfirm && !confirm(`Delete ${this.selectedElements.length} selected element(s)?`)) {
            return;
        }

        this.selectedElements.forEach(element => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        
        this.clearSelection();
        this.saveState();
        this.updateContextMenu();
    },

    getUserElements() {
        const allElements = Array.from(this.canvas.children);
        return allElements.filter(child => {
            // 1. Must be a visual element
            if (!(child instanceof SVGGraphicsElement)) return false;

            // 2. Filter out UI
            if (child.classList.contains('axis-line') || 
                child.classList.contains('axis-label') || 
                child.classList.contains('grid-label') ||
                child.classList.contains('grid-line') ||
                child.classList.contains('selection-group') ||
                child.classList.contains('selection-area') ||
                child.classList.contains('grid-group') || 
                child.classList.contains('axes-group')) {
                return false;
            }
            
            // 3. Keep Groups! (Removed the child.tagName !== 'g' check)
            
            return true;
        });
    },

    getUserElementsBBox() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const elements = this.getUserElements();
        
        if (elements.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

        let hasValidElement = false;

        // Helper to transform a point by a matrix
        const transformPoint = (x, y, matrix) => {
            const pt = this.canvas.createSVGPoint();
            pt.x = x;
            pt.y = y;
            return pt.matrixTransform(matrix);
        };

        elements.forEach(el => {
            try {
                // 1. Get the local bounding box (untransformed)
                const bbox = el.getBBox();
                if (bbox.width === 0 && bbox.height === 0) return;

                // 2. Calculate the Matrix: Element Local Space -> SVG Root Space
                // logic: (Root -> Screen)^-1  *  (Element -> Screen) = Element -> Root
                const rootCTM = this.canvas.getScreenCTM();
                const elCTM = el.getScreenCTM();
                
                if (!rootCTM || !elCTM) return;
                
                const matrix = rootCTM.inverse().multiply(elCTM);

                // 3. Define the 4 corners of the element's bounding box
                const corners = [
                    { x: bbox.x, y: bbox.y },                           // Top-Left
                    { x: bbox.x + bbox.width, y: bbox.y },              // Top-Right
                    { x: bbox.x + bbox.width, y: bbox.y + bbox.height },// Bottom-Right
                    { x: bbox.x, y: bbox.y + bbox.height }              // Bottom-Left
                ];

                // 4. Transform corners to Root Space and expand bounds
                corners.forEach(p => {
                    const globalPt = transformPoint(p.x, p.y, matrix);
                    if (globalPt.x < minX) minX = globalPt.x;
                    if (globalPt.y < minY) minY = globalPt.y;
                    if (globalPt.x > maxX) maxX = globalPt.x;
                    if (globalPt.y > maxY) maxY = globalPt.y;
                });

                hasValidElement = true;
            } catch(e) {
                console.warn("Error calculating bbox for element", el, e);
            }
        });

        if (!hasValidElement) return { x: 0, y: 0, width: 100, height: 100 };

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    },

    getElementBoundingBoxInCanvasSpace(element, bbox) {
        const transform = element.getAttribute('transform');
        
        // If no transform, return original
        if (!transform) {
            return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
        }

        // Create a transformation matrix from the string
        // We use an SVGPoint and matrix math to get precise bounds
        const ns = "http://www.w3.org/2000/svg";
        const svg = this.canvas; // Use the main canvas for point creation
        
        // Create points for the 4 corners
        const pts = [
            svg.createSVGPoint(), svg.createSVGPoint(),
            svg.createSVGPoint(), svg.createSVGPoint()
        ];
        
        pts[0].x = bbox.x;              pts[0].y = bbox.y;
        pts[1].x = bbox.x + bbox.width; pts[1].y = bbox.y;
        pts[2].x = bbox.x + bbox.width; pts[2].y = bbox.y + bbox.height;
        pts[3].x = bbox.x;              pts[3].y = bbox.y + bbox.height;

        // Get the matrix for this element
        // Note: getCTM() returns matrix relative to viewport, which is what we want for global coords
        // IF the element is a direct child of the SVG. 
        // Since our structure is flat (Canvas -> Element), getCTM works perfectly.
        const matrix = element.getCTM();

        // Map points
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        pts.forEach(pt => {
            const globalPt = pt.matrixTransform(matrix);
            minX = Math.min(minX, globalPt.x);
            minY = Math.min(minY, globalPt.y);
            maxX = Math.max(maxX, globalPt.x);
            maxY = Math.max(maxY, globalPt.y);
        });

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
    // 1. UPDATED: Normalizes coordinates so the export is tight to the elements,

    getTransformedBBox(element) {
        const bbox = element.getBBox();
        const transform = element.getAttribute('transform');
        
        if (!transform) {
            return {
                x: bbox.x,
                y: bbox.y,
                width: bbox.width,
                height: bbox.height,
                rotation: 0
            };
        }
        
        // Parse rotation transform
        let rotation = 0;
        const rotateMatch = transform.match(/rotate\(([-\d.]+)(?:,\s*([-\d.]+),\s*([-\d.]+))?\)/);
        if (rotateMatch) {
            rotation = parseFloat(rotateMatch[1]);
        }
        
        return {
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height,
            rotation: rotation
        };
    },

    getBoundingBox(element) {
        // First, get the transformed bounding box for rotation handling
        const tbbox = this.getTransformedBBox(element);
        
        // If element is rotated, we need to get the actual bounding box
        const transform = element.getAttribute('transform');
        if (transform && transform.includes('rotate')) {
            // Get the actual bounding box after transformation
            const bbox = element.getBBox();
            return {
                x: bbox.x,
                y: bbox.y,
                width: bbox.width,
                height: bbox.height,
                rotation: tbbox.rotation || 0
            };
        }
        
        // For non-rotated elements, use getBBox directly
        const bbox = element.getBBox();
        return {
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height,
            rotation: 0
        };
    },

    getGroupBoundingBox() {
        if (this.selectedElements.length === 0) return null;
        
        // Filter out elements without getBBox
        const validElements = this.selectedElements.filter(el => this.hasGetBBox(el));
        if (validElements.length === 0) return null;
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        validElements.forEach(element => {
            try {
                const bbox = element.getBBox();
                minX = Math.min(minX, bbox.x);
                minY = Math.min(minY, bbox.y);
                maxX = Math.max(maxX, bbox.x + bbox.width);
                maxY = Math.max(maxY, bbox.y + bbox.height);
            } catch (error) {
                console.warn('Error getting BBox:', error);
            }
        });
        
        if (minX === Infinity) return null;
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    },

    hasGetBBox(element) {
        return element && element.getBBox && typeof element.getBBox === 'function';
    }

    // Update getGroupBoundingBox to use safe method:,

    getElementCorners(element) {
        let bbox;
        try {
            bbox = element.getBBox();
        } catch(e) {
            return [];
        }

        // Default corners (untransformed)
        // For LaTeX <g>, these are usually near (0,0) before transform
        const corners = [
            {x: bbox.x, y: bbox.y},
            {x: bbox.x + bbox.width, y: bbox.y},
            {x: bbox.x + bbox.width, y: bbox.y + bbox.height},
            {x: bbox.x, y: bbox.y + bbox.height}
        ];

        const transform = element.getAttribute('transform') || '';
        const isLatex = element.getAttribute('data-type') === 'latex';

        // --- 1. HANDLE LATEX / GROUP TRANSFORMS ---
        // Order: Translate -> Rotate -> Scale
        if (isLatex || element.tagName === 'g') {
            let tx = 0, ty = 0, sx = 1, sy = 1, rot = 0;
            let rcx = 0, rcy = 0; // Rotation center

            // Parse Translate
            const tm = transform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
            if (tm) { tx = parseFloat(tm[1]); ty = parseFloat(tm[2]); }

            // Parse Rotate
            const rm = transform.match(/rotate\(([-\d.]+)(?:,\s*([-\d.]+),\s*([-\d.]+))?\)/);
            if (rm) { 
                rot = parseFloat(rm[1]) * Math.PI / 180; 
                // Note: For our LaTeX, we usually rotate around anchor (0,0 of local) 
                // unless specified otherwise.
                if(rm[2]) { rcx = parseFloat(rm[2]); rcy = parseFloat(rm[3]); }
            }

            // Parse Scale
            const sm = transform.match(/scale\(([-\d.]+)(?:,\s*([-\d.]+))?\)/);
            if (sm) { 
                sx = parseFloat(sm[1]); 
                sy = sm[2] ? parseFloat(sm[2]) : sx; 
            }

            // Apply Transform to Corners
            return corners.map(p => {
                // 1. Scale
                let nx = p.x * sx;
                let ny = p.y * sy;
                
                // 2. Rotate
                if (rot !== 0) {
                    // Rotate around local center (rcx, rcy) relative to translate point
                    // But usually LaTeX rotates around its insertion point (0,0)
                    // Standard 2D rotation:
                    const dx = nx; 
                    const dy = ny;
                    nx = dx * Math.cos(rot) - dy * Math.sin(rot);
                    ny = dx * Math.sin(rot) + dy * Math.cos(rot);
                }

                // 3. Translate
                nx += tx;
                ny += ty;

                return { x: nx, y: ny };
            });
        }

        // --- 2. STANDARD SVG ELEMENTS (Rotate only usually) ---
        if (transform.includes('rotate')) {
            const match = transform.match(/rotate\(([-\d.]+)(?:,\s*([-\d.]+),\s*([-\d.]+))?\)/);
            if (match) {
                const angle = parseFloat(match[1]) * Math.PI / 180;
                let cx, cy;
                
                if (match[2] && match[3]) {
                    cx = parseFloat(match[2]);
                    cy = parseFloat(match[3]);
                } else {
                    cx = bbox.x + bbox.width / 2;
                    cy = bbox.y + bbox.height / 2;
                }

                return corners.map(p => {
                    const dx = p.x - cx;
                    const dy = p.y - cy;
                    return {
                        x: cx + dx * Math.cos(angle) - dy * Math.sin(angle),
                        y: cy + dx * Math.sin(angle) + dy * Math.cos(angle)
                    };
                });
            }
        }

        return corners;
    },

    calculateSelectionBounds() {
        if (this.selectedElements.length === 0) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        this.selectedElements.forEach(element => {
            // Get points for the element (corners of bbox, transformed)
            const points = this.getElementCorners(element);
            
            points.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });
        });

        if (minX === Infinity) return null;

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    },

    createSelectionHandles(element) {
        const ns = "http://www.w3.org/2000/svg";
        
        // 1. Clear previous handles
        while (this.selectionGroup.firstChild) {
            this.selectionGroup.removeChild(this.selectionGroup.firstChild);
        }
        
        const bbox = element.getBBox();
        const isLatex = element.getAttribute('data-type') === 'latex';
        const isStructure = element.getAttribute('data-type') === 'structure';
        const transform = element.getAttribute('transform') || '';

        // 2. Parse Transform
        let tx = 0, ty = 0, sx = 1, sy = 1, rotation = 0;
        const tm = transform.match(/translate\(([^,)\s]+)(?:[\s,]+([^)\s]+))?\)/);
        if (tm) { tx = parseFloat(tm[1]); ty = tm[2] ? parseFloat(tm[2]) : 0; }
        const sm = transform.match(/scale\(([^,)\s]+)(?:[\s,]+([^)\s]+))?\)/);
        if (sm) { sx = parseFloat(sm[1]); sy = sm[2] ? parseFloat(sm[2]) : sx; }
        const rm = transform.match(/rotate\(([-\d.]+)/);
        if (rm) rotation = parseFloat(rm[1]);

        // 3. Setup Selection Group
        // We apply ONLY Translate and Rotate to the group. Scale is handled by the Rect/Handles.
        this.selectionGroup.setAttribute('transform', `translate(${tx}, ${ty}) rotate(${rotation}, ${ (bbox.x + bbox.width/2)*sx }, ${ (bbox.y + bbox.height/2)*sy })`);

        // 4. Calculate Visual Bounds (Scaled)
        const vx = bbox.x * sx;
        const vy = bbox.y * sy;
        const vw = bbox.width * sx;
        const vh = bbox.height * sy;

        this.selectionRect = document.createElementNS(ns, 'rect');
        this.selectionRect.setAttribute('class', 'selection-rect');
        this.selectionRect.setAttribute('x', vx);
        this.selectionRect.setAttribute('y', vy);
        this.selectionRect.setAttribute('width', vw);
        this.selectionRect.setAttribute('height', vh);
        this.selectionGroup.appendChild(this.selectionRect);

        // 5. Create Handles (Divide radius by Zoom to keep them consistent)
        // We use a constant visual size (e.g., 5px) regardless of zoom
        const handleRadius = 5 / this.zoomLevel;

        const handlePositions = [
            { type: 'nw', cx: vx, cy: vy },
            { type: 'n',  cx: vx + vw / 2, cy: vy },
            { type: 'ne', cx: vx + vw, cy: vy },
            { type: 'w',  cx: vx, cy: vy + vh / 2 },
            { type: 'e',  cx: vx + vw, cy: vy + vh / 2 },
            { type: 'sw', cx: vx, cy: vy + vh },
            { type: 's',  cx: vx + vw / 2, cy: vy + vh },
            { type: 'se', cx: vx + vw, cy: vy + vh }
        ];

        handlePositions.forEach(pos => {
            const handle = document.createElementNS(ns, 'circle');
            handle.setAttribute('class', 'selection-handle resize');
            handle.setAttribute('cx', pos.cx);
            handle.setAttribute('cy', pos.cy);
            handle.setAttribute('r', handleRadius);
            handle.setAttribute('data-handle', pos.type);
            this.selectionGroup.appendChild(handle);
        });

        // 6. Rotate Handle
        this.rotateHandle = document.createElementNS(ns, 'circle');
        this.rotateHandle.setAttribute('class', 'selection-handle rotate');
        this.rotateHandle.setAttribute('cx', vx + vw / 2);
        this.rotateHandle.setAttribute('cy', vy - (30 / this.zoomLevel));
        this.rotateHandle.setAttribute('r', handleRadius);
        this.selectionGroup.appendChild(this.rotateHandle);

        // 7. Update the Blue Center Dot
        this.updateRotationCenterDot({x: vx, y: vy, width: vw, height: vh}, element);
    }
    // Update the updateSelectionHandles method:,

    updateSelectionHandles() {
        // Clear previous handles
        this.removeSelectionHandles();
        
        if (this.selectedElements.length === 0) return;
        
        // Filter out any non-SVG elements or elements without getBBox
        const validElements = this.selectedElements.filter(element => 
            element && element.getBBox && typeof element.getBBox === 'function'
        );
        
        if (validElements.length === 0) return;
        
        // Calculate bounding box for all selected elements
        let bbox;
        // NEW: We need to capture the single element reference for later
        let singleElement = null;
        if (validElements.length === 1) {
            // For single element, use its getBBox directly
            const element = validElements[0];
            try {
                const rawBBox = element.getBBox();
                bbox = {
                    x: rawBBox.x,
                    y: rawBBox.y,
                    width: rawBBox.width,
                    height: rawBBox.height
                };
            } catch (error) {
                bbox = { x: 0, y: 0, width: 100, height: 100 };
            }
        } else {
            // For multiple elements
            bbox = this.calculateSelectionBounds();
        }
        
        if (!bbox) {
            bbox = { x: 0, y: 0, width: 100, height: 100 };
        }
        
        const ns = "http://www.w3.org/2000/svg";
        
        // 1. Create selection rectangle
        this.selectionRect = document.createElementNS(ns, 'rect');
        this.selectionRect.setAttribute('class', 'selection-rect');
        this.selectionRect.setAttribute('x', bbox.x);
        this.selectionRect.setAttribute('y', bbox.y);
        this.selectionRect.setAttribute('width', bbox.width);
        this.selectionRect.setAttribute('height', bbox.height);
        this.selectionGroup.appendChild(this.selectionRect);
        
        // 2. Create resize handles
        const handlePositions = [
            { type: 'nw', x: bbox.x, y: bbox.y, class: 'resize resize-nw' },
            { type: 'n', x: bbox.x + bbox.width / 2, y: bbox.y, class: 'resize resize-n' },
            { type: 'ne', x: bbox.x + bbox.width, y: bbox.y, class: 'resize resize-ne' },
            { type: 'w', x: bbox.x, y: bbox.y + bbox.height / 2, class: 'resize resize-w' },
            { type: 'e', x: bbox.x + bbox.width, y: bbox.y + bbox.height / 2, class: 'resize resize-e' },
            { type: 'sw', x: bbox.x, y: bbox.y + bbox.height, class: 'resize resize-sw' },
            { type: 's', x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height, class: 'resize resize-s' },
            { type: 'se', x: bbox.x + bbox.width, y: bbox.y + bbox.height, class: 'resize resize-se' }
        ];
        
        this.resizeHandles = [];
        handlePositions.forEach(pos => {
            const handle = document.createElementNS(ns, 'circle');
            handle.setAttribute('class', `selection-handle ${pos.class}`);
            handle.setAttribute('cx', pos.x);
            handle.setAttribute('cy', pos.y);
            handle.setAttribute('r', 4);
            handle.setAttribute('data-handle', pos.type);
            this.selectionGroup.appendChild(handle);
            this.resizeHandles.push(handle);
        });
        
        // 3. Create rotation handle
        const centerX = bbox.x + bbox.width / 2;
        const topY = bbox.y - 30;
        
        this.rotateHandle = document.createElementNS(ns, 'circle');
        this.rotateHandle.setAttribute('class', 'selection-handle rotate');
        this.rotateHandle.setAttribute('cx', centerX);
        this.rotateHandle.setAttribute('cy', topY);
        this.rotateHandle.setAttribute('r', 4);
        this.selectionGroup.appendChild(this.rotateHandle);
        
        // 4. Add blue rotation center dot
        this.updateRotationCenterDot(bbox, singleElement);
        
        // 5. Check if we need to apply transforms or add CURVE HANDLES
        if (validElements.length === 1) {
            const element = validElements[0];
            const transform = element.getAttribute('transform') || '';
            
            if (transform) {
                this.selectionGroup.setAttribute('transform', transform);
            }

            // --- FIX START: Add Curve Control Handle ---
            if (this.getElementType(element) === 'curve') {
                const d = element.getAttribute('d') || '';
                const nums = d.match(/[+-]?\d*\.?\d+/g);
                
                if (nums && nums.length >= 6) {
                    const vals = nums.map(parseFloat);
                    const x1 = vals[0];
                    const y1 = vals[1];
                    const cx = vals[2];
                    const cy = vals[3];
                    const x2 = vals[4];
                    const y2 = vals[5];

                    // Calculate t=0.5 point for the handle
                    const midX = 0.25 * x1 + 0.5 * cx + 0.25 * x2;
                    const midY = 0.25 * y1 + 0.5 * cy + 0.25 * y2;

                    const curveHandle = document.createElementNS(ns, 'circle');
                    curveHandle.setAttribute('class', 'selection-handle curve-control');
                    curveHandle.setAttribute('cx', midX);
                    curveHandle.setAttribute('cy', midY);
                    curveHandle.setAttribute('r', 6);
                    curveHandle.setAttribute('fill', 'orange');
                    curveHandle.setAttribute('stroke', 'white');
                    curveHandle.setAttribute('stroke-width', '1');
                    curveHandle.style.cursor = 'grab';
                    
                    // Note: transform is already applied to the selectionGroup above
                    this.selectionGroup.appendChild(curveHandle);
                }
            }
            // --- FIX END ---
        }
    },

    removeSelectionHandles() {
        // Clear all selection handles
        while (this.selectionGroup.firstChild) {
            this.selectionGroup.removeChild(this.selectionGroup.firstChild);
        }
        this.selectionRect = null;
        this.resizeHandles = [];
        this.rotateHandle = null;
        // Remove any transform from selection group
        this.selectionGroup.removeAttribute('transform');
    },

    findSnapTarget(x, y, excludeElement) {
        if (!this.snapEnabled) return { x, y, snapped: false };
        
        // Threshold calculation (15 pixels radius converted to SVG units)
        const screenRect = this.canvas.getBoundingClientRect();
        const svgThreshold = 15 * (this.viewBox.width / screenRect.width);
        
        let closest = { x, y, snapped: false };
        let minDistance = svgThreshold;

        // 1. Check Object Snapping (Corners/Endpoints)
        const elements = this.getUserElements();
        elements.forEach(el => {
            if (el === excludeElement || el === this.selectionRectElement) return;
            const points = this.getTransformedPoints(el);
            points.forEach(p => {
                const dist = Math.sqrt((p.x - x)**2 + (p.y - y)**2);
                if (dist < minDistance) {
                    minDistance = dist;
                    closest = { x: p.x, y: p.y, snapped: true };
                }
            });
        });

        // 2. Fallback to Grid Snapping if no object snap found
        if (!closest.snapped && this.gridEnabled) {
            const gridStep = this.getAdaptiveGridStep(); // This returns pixels
            // Simple grid snap
            const gridX = Math.round(x / gridStep) * gridStep;
            const gridY = Math.round(y / gridStep) * gridStep;
            
            const dist = Math.sqrt((gridX - x)**2 + (gridY - y)**2);
            if (dist < minDistance) {
                closest = { x: gridX, y: gridY, snapped: true };
            }
        }
        
        return closest;
    }

});
