/**
 * VectorCutter - SVG Editor Module
 * Module: editor-transform.js
 * Description: Transformation, Resize, Rotation, Scaling, Mirroring/Flipping & Movement
 */

Object.assign(SVGEditor.prototype, {
    startResizing(handleType, clientX, clientY) {
        this.isResizing = true;
        this.resizeHandleType = handleType;
        this.initialMouseX = clientX;
        this.initialMouseY = clientY;
        
        // Capture SVG initial mouse for snapping delta calc
        this.initialMouseSVG = this.screenToSVG(clientX, clientY);
        
        this.initialElementStates = this.selectedElements.map(element => 
            this.getElementState(element)
        );
        
        this.initialGroupBbox = this.getGroupBoundingBox();
        
        this.initialSelectionBox = {
            x: this.selectionRect?.getAttribute('x') || 0,
            y: this.selectionRect?.getAttribute('y') || 0,
            width: this.selectionRect?.getAttribute('width') || 0,
            height: this.selectionRect?.getAttribute('height') || 0
        };
        
        if (this.selectedElements.length === 1) {
            const element = this.selectedElements[0];
            const tagName = element.tagName;
            
            if (tagName === 'rect') {
                const bbox = element.getBBox();
                this.resizeInfo = {
                    nw: { x: bbox.x, y: bbox.y },
                    ne: { x: bbox.x + bbox.width, y: bbox.y },
                    sw: { x: bbox.x, y: bbox.y + bbox.height },
                    se: { x: bbox.x + bbox.width, y: bbox.y + bbox.height }
                };
            } else if (tagName === 'line') {
                const x1 = parseFloat(element.getAttribute('x1') || 0);
                const y1 = parseFloat(element.getAttribute('y1') || 0);
                const x2 = parseFloat(element.getAttribute('x2') || 0);
                const y2 = parseFloat(element.getAttribute('y2') || 0);
                
                const bbox = element.getBBox();
                const minX = bbox.x;
                const maxX = bbox.x + bbox.width;
                const minY = bbox.y;
                const maxY = bbox.y + bbox.height;
                
                const endpoint1IsNW = Math.abs(x1 - minX) < 0.1 && Math.abs(y1 - minY) < 0.1;
                const endpoint1IsNE = Math.abs(x1 - maxX) < 0.1 && Math.abs(y1 - minY) < 0.1;
                const endpoint1IsSW = Math.abs(x1 - minX) < 0.1 && Math.abs(y1 - maxY) < 0.1;
                const endpoint1IsSE = Math.abs(x1 - maxX) < 0.1 && Math.abs(y1 - maxY) < 0.1;
                
                this.resizeInfo = {
                    endpoint1: { x: x1, y: y1 },
                    endpoint2: { x: x2, y: y2 },
                    endpoint1IsNW: endpoint1IsNW,
                    endpoint1IsNE: endpoint1IsNE,
                    endpoint1IsSW: endpoint1IsSW,
                    endpoint1IsSE: endpoint1IsSE
                };
            }
        }
    },

    resizeElement(currentClientX, currentClientY) {
        if (this.selectedElements.length === 0 || !this.initialElementStates) return;
        
        // Calculate raw delta in SVG units based on screen movement
        const screenDx = currentClientX - this.initialMouseX;
        const screenDy = currentClientY - this.initialMouseY;
        const rect = this.canvas.getBoundingClientRect();
        let svgDx = (screenDx / rect.width) * this.viewBox.width;
        let svgDy = (screenDy / rect.height) * this.viewBox.height;

        // Handle Snapping for Resize
        if (this.snapEnabled) {
            // Calculate current unsnapped mouse position in SVG
            const unsnappedMouseSVG = {
                x: this.initialMouseSVG.x + svgDx,
                y: this.initialMouseSVG.y + svgDy
            };
            
            // Find snap target for this mouse position
            const snap = this.findSnapTarget(unsnappedMouseSVG.x, unsnappedMouseSVG.y, this.selectedElements[0]);
            
            if (snap.snapped) {
                // Recalculate deltas to reach the snap point perfectly
                svgDx = snap.x - this.initialMouseSVG.x;
                svgDy = snap.y - this.initialMouseSVG.y;
            }
        }
        
        let groupRotation = 0;
        if (this.selectedElements.length === 1) {
            groupRotation = this.getElementRotation(this.selectedElements[0]);
        }
        
        let rawDx = svgDx;
        let rawDy = svgDy;
        let scaleX = 1;
        let scaleY = 1;

        if (groupRotation !== 0) {
            const rad = -groupRotation * Math.PI / 180;
            const localDx = svgDx * Math.cos(rad) - svgDy * Math.sin(rad);
            const localDy = svgDx * Math.sin(rad) + svgDy * Math.cos(rad);
            
            rawDx = localDx;
            rawDy = localDy;
        }
        
        this.selectedElements.forEach((element, index) => {
            const initialState = this.initialElementStates[index];
            const tagName = element.tagName;
            const isStructure = element.getAttribute('data-type') === 'structure'; // NEW CHECK
            
            if (tagName === 'rect') {
                this.resizeRectangleNonSymmetric(element, initialState, rawDx, rawDy, this.resizeHandleType);
            } else if (isStructure) {
                // NEW: Route structures to a rectangle-like resizing logic
                this.resizeStructureLikeRectangle(element, initialState, rawDx, rawDy, this.resizeHandleType);
            } else if (tagName === 'line') {
                this.resizeLineNonSymmetric(element, initialState, rawDx, rawDy, this.resizeHandleType);
            } else {
                switch(this.resizeHandleType) {
                    case 'nw':
                        scaleX = 1 - rawDx / this.initialGroupBbox.width;
                        scaleY = 1 - rawDy / this.initialGroupBbox.height;
                        break;
                    case 'n':
                        scaleY = 1 - rawDy / this.initialGroupBbox.height;
                        break;
                    case 'ne':
                        scaleX = 1 + rawDx / this.initialGroupBbox.width;
                        scaleY = 1 - rawDy / this.initialGroupBbox.height;
                        break;
                    case 'w':
                        scaleX = 1 - rawDx / this.initialGroupBbox.width;
                        break;
                    case 'e':
                        scaleX = 1 + rawDx / this.initialGroupBbox.width;
                        break;
                    case 'sw':
                        scaleX = 1 - rawDx / this.initialGroupBbox.width;
                        scaleY = 1 + rawDy / this.initialGroupBbox.height;
                        break;
                    case 's':
                        scaleY = 1 + rawDy / this.initialGroupBbox.height;
                        break;
                    case 'se':
                        scaleX = 1 + rawDx / this.initialGroupBbox.width;
                        scaleY = 1 + rawDy / this.initialGroupBbox.height;
                        break;
                }
                
                this.scaleElementRelativeToPoint(element, initialState, scaleX, scaleY, 
                    this.initialGroupBbox.x + this.initialGroupBbox.width/2, 
                    this.initialGroupBbox.y + this.initialGroupBbox.height/2);
            }
        });
        
        this.updateSelectionHandles();
        this.updateContextMenuValues();
    },

    resizeStructureLikeRectangle(element, initialState, dx, dy, handleType) {
        // 1. Get Initial State
        const oldTx = initialState.x; 
        const oldTy = initialState.y;
        const oldScaleX = initialState.scaleX || 1;
        const oldScaleY = initialState.scaleY || 1;
        const rotation = initialState.rotation || 0;

        // Local BBox (Unscaled)
        const bbox = element.getBBox();
        const localX = bbox.x;
        const localY = bbox.y;
        const localW = bbox.width;
        const localH = bbox.height;
        
        // 2. Determine Local Anchor Point (The point opposite to the handle)
        let anchorRelX = 0;
        let anchorRelY = 0;

        switch(handleType) {
            case 'nw': anchorRelX = localW; anchorRelY = localH; break; // Anchor SE
            case 'n':  anchorRelX = localW/2; anchorRelY = localH; break; // Anchor S
            case 'ne': anchorRelX = 0; anchorRelY = localH; break; // Anchor SW
            case 'w':  anchorRelX = localW; anchorRelY = localH/2; break; // Anchor E
            case 'e':  anchorRelX = 0; anchorRelY = localH/2; break; // Anchor W
            case 'sw': anchorRelX = localW; anchorRelY = 0; break; // Anchor NE
            case 's':  anchorRelX = localW/2; anchorRelY = 0; break; // Anchor N
            case 'se': anchorRelX = 0; anchorRelY = 0; break; // Anchor NW
        }

        // 3. Helper: Map Local Point to Global (accounting for SCALE pivot shift)
        const localToGlobal = (relX, relY, tx, ty, sx, sy, rot) => {
            // Scaled position relative to top-left of box
            const scaledX = relX * sx;
            const scaledY = relY * sy;

            // Visual Center of the SCALED box
            // We must rotate around the SCALED center
            const centerX = (localW * sx) / 2;
            const centerY = (localH * sy) / 2;

            const rad = rot * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            // Rotate point around the scaled center
            const dx = scaledX - centerX;
            const dy = scaledY - centerY;

            const rotatedX = centerX + (dx * cos - dy * sin);
            const rotatedY = centerY + (dx * sin + dy * cos);

            // Global pos = Origin + (BoxOffset * Scale) + RotatedPoint
            return {
                x: tx + (localX * sx) + rotatedX,
                y: ty + (localY * sy) + rotatedY
            };
        };

        // 4. Calculate Global Anchor (Fixed Point in World Space)
        const globalAnchor = localToGlobal(anchorRelX, anchorRelY, oldTx, oldTy, oldScaleX, oldScaleY, rotation);

        // 5. Calculate New Visual Size based on Deltas
        let dW = 0, dH = 0;
        switch(handleType) {
            case 'nw': dW = -dx; dH = -dy; break;
            case 'n':  dH = -dy; break;
            case 'ne': dW = dx;  dH = -dy; break;
            case 'w':  dW = -dx; break;
            case 'e':  dW = dx;  break;
            case 'sw': dW = -dx; dH = dy; break;
            case 's':  dH = dy;  break;
            case 'se': dW = dx;  dH = dy; break;
        }

        const curVisW = localW * oldScaleX;
        const curVisH = localH * oldScaleY;
        
        const newVisW = Math.max(1, curVisW + dW);
        const newVisH = Math.max(1, curVisH + dH);

        // 6. Calculate New Scales
        const newScaleX = newVisW / localW;
        const newScaleY = newVisH / localH;

        // 7. Calculate New Translate (Reverse Engineer)
        // Find where the anchor would be if we just scaled/rotated at 0,0
        const newAnchorOffset = localToGlobal(anchorRelX, anchorRelY, 0, 0, newScaleX, newScaleY, rotation);

        // Shift Translate so the anchor lands on GlobalAnchor
        const newTx = globalAnchor.x - newAnchorOffset.x;
        const newTy = globalAnchor.y - newAnchorOffset.y;

        // 8. Construct Transform
        // FIX IS HERE: We must rotate around the SCALED Center
        const localCx = localX + localW / 2;
        const localCy = localY + localH / 2;
        
        // Scale the rotation pivot coordinates by the new scale
        const pivotX = localCx * newScaleX;
        const pivotY = localCy * newScaleY;

        // Since 'rotate' happens AFTER 'scale' in the transform pipeline, 
        // the coordinate system is already scaled. 
        // Wait... SVG applies functions Right-to-Left. 
        // scale() applies first. The grid expands.
        // So 'rotate' needs coordinates in the SCALED grid? 
        // NO. If the grid expands, 50 becomes 100 on screen. 
        // If we say rotate(..., 50, 50) it rotates around 100, 100 on screen?
        // Actually, explicit <g> transforms are tricky.
        
        // Let's use the explicit order that matches our logic:
        // 1. Translate (Global placement)
        // 2. Rotate (Around visual center)
        // 3. Scale (Size adjustment)
        
        // To rotate around visual center:
        // Center is (localCx, localCy).
        // After scale(sx, sy), visual center is NOT at localCx, localCy.
        // It is at (localCx, localCy) in the *unscaled* system, which maps to *scaled* visual center.
        
        // The previous bug was assuming standard transform order logic applied cleanly.
        // Let's use the SCALED pivot logic:
        
        let newTransform = `translate(${newTx}, ${newTy})`;
        if (rotation !== 0) {
            // We use the SCALED pivot point to keep rotation centered
            newTransform += ` rotate(${rotation}, ${localCx * newScaleX}, ${localCy * newScaleY})`;
        }
        newTransform += ` scale(${newScaleX}, ${newScaleY})`;

        element.setAttribute('transform', newTransform);
    },

    resizeRectangleNonSymmetric(element, initialState, dx, dy, handleType) {
        // 1. Calculate delta in dimensions and local position based on handle
        let dX = 0;
        let dY = 0;
        let dW = 0;
        let dH = 0;

        // dx, dy are already in the local aligned coordinate system
        switch(handleType) {
            case 'nw': dX = dx; dY = dy; dW = -dx; dH = -dy; break;
            case 'n':  dY = dy; dH = -dy; break;
            case 'ne': dY = dy; dW = dx; dH = -dy; break;
            case 'w':  dX = dx; dW = -dx; break;
            case 'e':  dW = dx; break;
            case 'sw': dX = dx; dW = -dx; dH = dy; break;
            case 's':  dH = dy; break;
            case 'se': dW = dx; dH = dy; break;
        }

        // 2. Apply deltas to initial state
        let newW = initialState.width + dW;
        let newH = initialState.height + dH;
        let newX = initialState.x + dX;
        let newY = initialState.y + dY;

        // Constrain width
        if (newW < 0.1) {
            const offset = 0.1 - newW;
            newW = 0.1;
            // If we were moving the left edge ('w', 'nw', 'sw'), adjust X
            if (handleType.includes('w')) {
                newX -= offset;
            }
        }
        // Constrain height
        if (newH < 0.1) {
            const offset = 0.1 - newH;
            newH = 0.1;
            if (handleType.includes('n')) {
                newY -= offset;
            }
        }

        // 3. Calculate shifts to maintain world position
        const initialCx = initialState.x + initialState.width / 2;
        const initialCy = initialState.y + initialState.height / 2;
        const newLocalCx = newX + newW / 2;
        const newLocalCy = newY + newH / 2;
        
        // Vector from old geometric center to new geometric center (in local space)
        const deltaCx = newLocalCx - initialCx;
        const deltaCy = newLocalCy - initialCy;

        const rotation = initialState.rotation || 0;
        // Determine the world pivot point of the initial state
        // If the initial transform had an explicit center, use it. Otherwise use geometric center.
        const initialPivotX = (initialState.rotationCx !== undefined) ? initialState.rotationCx : initialCx;
        const initialPivotY = (initialState.rotationCy !== undefined) ? initialState.rotationCy : initialCy;

        // 4. Rotate the delta vector to world space
        const rad = rotation * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const worldDeltaX = deltaCx * cos - deltaCy * sin;
        const worldDeltaY = deltaCx * sin + deltaCy * cos;

        // 5. Calculate Old Geometric Center in World Space
        // We need this because the rotation pivot might not have been the center.
        // Vector from Pivot to Center (Local)
        const dx_p = initialCx - initialPivotX;
        const dy_p = initialCy - initialPivotY;
        // Rotate this vector to get world offset from pivot
        const oldGeoCenterWorldX = initialPivotX + dx_p * cos - dy_p * sin;
        const oldGeoCenterWorldY = initialPivotY + dx_p * sin + dy_p * cos;

        // 6. Calculate New Geometric Center in World Space
        const newGeoCenterWorldX = oldGeoCenterWorldX + worldDeltaX;
        const newGeoCenterWorldY = oldGeoCenterWorldY + worldDeltaY;

        // 7. Update attributes
        // We position the rect so its center aligns with newGeoCenterWorld
        // And we set the rotation pivot TO newGeoCenterWorld.
        element.setAttribute('width', newW);
        element.setAttribute('height', newH);
        element.setAttribute('x', newGeoCenterWorldX - newW / 2);
        element.setAttribute('y', newGeoCenterWorldY - newH / 2);
        
        if (rotation !== 0) {
            element.setAttribute('transform', `rotate(${rotation}, ${newGeoCenterWorldX}, ${newGeoCenterWorldY})`);
        } else {
            element.removeAttribute('transform');
        }

        this.updateContextMenuValues();
    }    
    
    // New method for non-symmetric line resizing
    // Alternative: Edge handles stretch line in one dimension only,

    resizeLineNonSymmetric(element, initialState, dx, dy, handleType) {
        let x1 = initialState.x1;
        let y1 = initialState.y1;
        let x2 = initialState.x2;
        let y2 = initialState.y2;
        
        // Get line center
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        
        // Determine which endpoints are on which sides
        const leftEndpoint = x1 <= x2 ? 0 : 1;
        const rightEndpoint = x1 >= x2 ? 0 : 1;
        const topEndpoint = y1 <= y2 ? 0 : 1;
        const bottomEndpoint = y1 >= y2 ? 0 : 1;
        
        switch(handleType) {
            case 'nw':
                // Move top-left corner
                if (leftEndpoint === 0 && topEndpoint === 0) {
                    x1 += dx;
                    y1 += dy;
                } else if (leftEndpoint === 1 && topEndpoint === 1) {
                    x2 += dx;
                    y2 += dy;
                }
                break;
            case 'n':
                // STRETCH vertically by moving the top endpoint(s)
                // Actually for a line, there's only one top endpoint
                if (topEndpoint === 0) {
                    y1 += dy;
                } else {
                    y2 += dy;
                }
                break;
            case 'ne':
                // Move top-right corner
                if (rightEndpoint === 0 && topEndpoint === 0) {
                    x1 += dx;
                    y1 += dy;
                } else if (rightEndpoint === 1 && topEndpoint === 1) {
                    x2 += dx;
                    y2 += dy;
                }
                break;
            case 'w':
                // STRETCH horizontally by moving the left endpoint
                if (leftEndpoint === 0) {
                    x1 += dx;
                } else {
                    x2 += dx;
                }
                break;
            case 'e':
                // STRETCH horizontally by moving the right endpoint
                if (rightEndpoint === 0) {
                    x1 += dx;
                } else {
                    x2 += dx;
                }
                break;
            case 'sw':
                // Move bottom-left corner
                if (leftEndpoint === 0 && bottomEndpoint === 0) {
                    x1 += dx;
                    y1 += dy;
                } else if (leftEndpoint === 1 && bottomEndpoint === 1) {
                    x2 += dx;
                    y2 += dy;
                }
                break;
            case 's':
                // STRETCH vertically by moving the bottom endpoint
                if (bottomEndpoint === 0) {
                    y1 += dy;
                } else {
                    y2 += dy;
                }
                break;
            case 'se':
                // Move bottom-right corner
                if (rightEndpoint === 0 && bottomEndpoint === 0) {
                    x1 += dx;
                    y1 += dy;
                } else if (rightEndpoint === 1 && bottomEndpoint === 1) {
                    x2 += dx;
                    y2 += dy;
                }
                break;
        }
        
        element.setAttribute('x1', x1);
        element.setAttribute('y1', y1);
        element.setAttribute('x2', x2);
        element.setAttribute('y2', y2);
        this.updateContextMenuValues();
    },

    scaleElementRelativeToPoint(element, initialState, scaleX, scaleY, centerX, centerY) {
        const tagName = element.tagName;
        const isLatex = element.getAttribute('data-type') === 'latex';
        const isStructure = element.getAttribute('data-type') === 'structure';
        
        // Force uniform scaling for LaTeX/Text to prevent distortion
        if (tagName === 'text' || isLatex || isStructure) {
            const uniformScale = Math.max(Math.abs(scaleX), Math.abs(scaleY));
            scaleX = uniformScale;
            scaleY = uniformScale;
        }

        if (isLatex || isStructure || tagName === 'g') {
            const bbox = initialState.bbox || element.getBBox();
            const oldScale = initialState.scaleX || 1;
            
            // Local center of the paths inside the group
            const localCx = bbox.x + bbox.width / 2;
            const localCy = bbox.y + bbox.height / 2;

            // Calculate current visual center in canvas space
            const currentVisCx = initialState.x + (localCx * oldScale);
            const currentVisCy = initialState.y + (localCy * oldScale);

            // New scale
            const newScale = oldScale * scaleX;

            // Where the center should be after scaling relative to the anchor (centerX/Y)
            const newVisCx = centerX + (currentVisCx - centerX) * scaleX;
            const newVisCy = centerY + (currentVisCy - centerY) * scaleY;

            // Back-calculate the new translation
            const newTx = newVisCx - (localCx * newScale);
            const newTy = newVisCy - (localCy * newScale);

            // Update Transform
            let newTransform = `translate(${newTx}, ${newTy})`;
            if (initialState.rotation) {
                // Rotate around the internal center
                newTransform += ` rotate(${initialState.rotation}, ${localCx * newScale}, ${localCy * newScale})`;
            }
            newTransform += ` scale(${newScale})`;
            
            element.setAttribute('transform', newTransform);
            return;
        }
        
        switch(tagName) {
            case 'text':
                const x = initialState.x;
                const y = initialState.y;
                const fontSize = initialState.fontSize || 16;
                // Scale position relative to fixed center
                const newX = centerX + (x - centerX) * scaleX;
                const newY = centerY + (y - centerY) * scaleY;
                const newFontSize = Math.max(1, fontSize * scaleX);
                element.setAttribute('x', newX);
                element.setAttribute('y', newY);
                element.setAttribute('font-size', newFontSize);
                const bbox = element.getBBox();
                this.updateElementTransform(element, bbox);
                break;
            
            
            case 'rect': {
                const x = initialState.x;
                const y = initialState.y;
                const width = initialState.width;
                const height = initialState.height;
                const newCenterX = centerX + ((x + width/2) - centerX) * scaleX;
                const newCenterY = centerY + ((y + height/2) - centerY) * scaleY;
                const newWidth = width * scaleX;
                const newHeight = height * scaleY;
                const newX = newCenterX - newWidth / 2;
                const newY = newCenterY - newHeight / 2;
                element.setAttribute('x', newX);
                element.setAttribute('y', newY);
                element.setAttribute('width', newWidth);
                element.setAttribute('height', newHeight);
                const bbox = element.getBBox();
                this.updateElementTransform(element, bbox);
                break;
            }
             case 'circle': {
                const cx = initialState.cx;
                const cy = initialState.cy;
                const r = initialState.r;
                const newCx = centerX + (cx - centerX) * scaleX;
                const newCy = centerY + (cy - centerY) * scaleY;
                const avgScale = (scaleX + scaleY) / 2;
                const newR = Math.max(0.1, r * avgScale);
                element.setAttribute('cx', newCx);
                element.setAttribute('cy', newCy);
                element.setAttribute('r', newR);
                const bbox = element.getBBox();
                this.updateElementTransform(element, bbox);
                break;
            }
            case 'ellipse': {
                const cx = initialState.cx;
                const cy = initialState.cy;
                const rx = initialState.rx;
                const ry = initialState.ry;
                const newCx = centerX + (cx - centerX) * scaleX;
                const newCy = centerY + (cy - centerY) * scaleY;
                const newRx = Math.max(0.1, rx * scaleX);
                const newRy = Math.max(0.1, ry * scaleY);
                element.setAttribute('cx', newCx);
                element.setAttribute('cy', newCy);
                element.setAttribute('rx', newRx);
                element.setAttribute('ry', newRy);
                const bbox = element.getBBox();
                this.updateElementTransform(element, bbox);
                break;
            }
            case 'line': {
                const x1 = initialState.x1;
                const y1 = initialState.y1;
                const x2 = initialState.x2;
                const y2 = initialState.y2;
                const lineCenterX = (x1 + x2) / 2;
                const lineCenterY = (y1 + y2) / 2;
                const newCenterX = centerX + (lineCenterX - centerX) * scaleX;
                const newCenterY = centerY + (lineCenterY - centerY) * scaleY;
                const newX1 = newCenterX + (x1 - lineCenterX) * scaleX;
                const newY1 = newCenterY + (y1 - lineCenterY) * scaleY;
                const newX2 = newCenterX + (x2 - lineCenterX) * scaleX;
                const newY2 = newCenterY + (y2 - lineCenterY) * scaleY;
                element.setAttribute('x1', newX1);
                element.setAttribute('y1', newY1);
                element.setAttribute('x2', newX2);
                element.setAttribute('y2', newY2);
                const bbox = element.getBBox();
                this.updateElementTransform(element, bbox);
                break;
            }
            case 'path': {
                const d = initialState.d;
                if (!d) break;
                const commands = this.parsePathCommands(d);
                let newPath = '';
                for (const cmd of commands) {
                    const type = cmd.type;
                    newPath += type;
                    if (type.toLowerCase() === 'h') {
                        for (let i = 0; i < cmd.values.length; i++) {
                            const x = centerX + (cmd.values[i] - centerX) * scaleX;
                            newPath += ` ${x}`;
                        }
                    } else if (type.toLowerCase() === 'v') {
                        for (let i = 0; i < cmd.values.length; i++) {
                            const y = centerY + (cmd.values[i] - centerY) * scaleY;
                            newPath += ` ${y}`;
                        }
                    } else if (type.toLowerCase() === 'a') {
                        for (let i = 0; i < cmd.values.length; i += 7) {
                            if (i + 6 < cmd.values.length) {
                                const rx = cmd.values[i] * scaleX;
                                const ry = cmd.values[i + 1] * scaleY;
                                const rotation = cmd.values[i + 2];
                                const largeArc = cmd.values[i + 3];
                                const sweep = cmd.values[i + 4];
                                const x = centerX + (cmd.values[i + 5] - centerX) * scaleX;
                                const y = centerY + (cmd.values[i + 6] - centerY) * scaleY;
                                newPath += ` ${rx} ${ry} ${rotation} ${largeArc} ${sweep} ${x} ${y}`;
                            }
                        }
                    } else {
                        for (let i = 0; i < cmd.values.length; i += 2) {
                            if (i + 1 < cmd.values.length) {
                                const x = centerX + (cmd.values[i] - centerX) * scaleX;
                                const y = centerY + (cmd.values[i + 1] - centerY) * scaleY;
                                newPath += ` ${x} ${y}`;
                            }
                        }
                    }
                    newPath += ' ';
                }
                element.setAttribute('d', newPath.trim());
                const bbox = element.getBBox();
                this.updateElementTransform(element, bbox);
                break;
            }
        }
    },

    scaleElementByPercentage(scaleFactor) {
        if (!this.selectedElement) return;
        const element = this.selectedElement;
        const tagName = element.tagName.toLowerCase();
        const isLatex = element.getAttribute('data-type') === 'latex';
        const isStructure = element.getAttribute('data-type') === 'structure';

        if (isLatex || isStructure || tagName === 'g') {
            const state = this.getElementState(element);
            const bbox = element.getBBox();

            // 1. Calculate the current visual center before scaling
            const oldVisualCenterX = state.x + (bbox.x + bbox.width / 2) * state.scaleX;
            const oldVisualCenterY = state.y + (bbox.y + bbox.height / 2) * state.scaleY;

            // 2. Apply new scale
            const newScaleX = state.scaleX * scaleFactor;
            const newScaleY = state.scaleY * scaleFactor;

            // 3. Adjust translation to keep the element centered at the same spot
            const newTx = oldVisualCenterX - (bbox.x + bbox.width / 2) * newScaleX;
            const newTy = oldVisualCenterY - (bbox.y + bbox.height / 2) * newScaleY;

            // 4. Update Transform
            const pivotX = (bbox.x + bbox.width / 2) * newScaleX;
            const pivotY = (bbox.y + bbox.height / 2) * newScaleY;

            element.setAttribute('transform', 
                `translate(${newTx}, ${newTy}) rotate(${state.rotation}, ${pivotX}, ${pivotY}) scale(${newScaleX}, ${newScaleY})`
            );
        } else {
            // Fallback for standard shapes (your existing switch logic)
            const originalState = this.getElementState(element);
            const bbox = element.getBBox();
            const centerX = bbox.x + bbox.width / 2;
            const centerY = bbox.y + bbox.height / 2;
        switch(tagName) {
            case 'rect': {
                const newW = state.width * scaleFactor;
                const newH = state.height * scaleFactor;
                const newX = centerX - newW / 2;
                const newY = centerY - newH / 2;
                
                element.setAttribute('width', newW);
                element.setAttribute('height', newH);
                element.setAttribute('x', newX);
                element.setAttribute('y', newY);
                
                // Update rotation to pivot around new center
                if (state.rotation !== 0) {
                    element.setAttribute('transform', `rotate(${state.rotation}, ${centerX}, ${centerY})`);
                }
                break;
            }

            case 'circle': {
                const newR = state.r * scaleFactor;
                element.setAttribute('r', Math.max(0.1, newR));
                break;
            }

            case 'ellipse': {
                const newRX = state.rx * scaleFactor;
                const newRY = state.ry * scaleFactor;
                element.setAttribute('rx', Math.max(0.1, newRX));
                element.setAttribute('ry', Math.max(0.1, newRY));
                break;
            }

            case 'line': {
                const dx1 = (state.x1 - centerX) * scaleFactor;
                const dy1 = (state.y1 - centerY) * scaleFactor;
                const dx2 = (state.x2 - centerX) * scaleFactor;
                const dy2 = (state.y2 - centerY) * scaleFactor;
                
                element.setAttribute('x1', centerX + dx1);
                element.setAttribute('y1', centerY + dy1);
                element.setAttribute('x2', centerX + dx2);
                element.setAttribute('y2', centerY + dy2);
                break;
            }

            case 'text': {
                const newFontSize = state.fontSize * scaleFactor;
                element.setAttribute('font-size', Math.max(1, newFontSize));
                
                // Adjust x/y to keep text centered (since text scales from its anchor)
                const oldX = state.x;
                const oldY = state.y;
                const newX = centerX + (oldX - centerX) * scaleFactor;
                const newY = centerY + (oldY - centerY) * scaleFactor;
                
                element.setAttribute('x', newX);
                element.setAttribute('y', newY);
                break;
            }

            case 'path': {
                const d = state.d;
                const commands = this.parsePathCommands(d);
                let newPath = '';

                for (const cmd of commands) {
                    newPath += cmd.type;
                    
                    // Paths use different numbers of values depending on command type
                    if (cmd.type.toLowerCase() === 'h') {
                        cmd.values.forEach(v => {
                            newPath += ` ${centerX + (v - centerX) * scaleFactor}`;
                        });
                    } else if (cmd.type.toLowerCase() === 'v') {
                        cmd.values.forEach(v => {
                            newPath += ` ${centerY + (v - centerY) * scaleFactor}`;
                        });
                    } else if (cmd.type.toLowerCase() === 'a') {
                        // Arc command: rx ry x-axis-rotation large-arc-flag sweep-flag x y
                        for (let i = 0; i < cmd.values.length; i += 7) {
                            newPath += ` ${cmd.values[i] * scaleFactor}`; // rx
                            newPath += ` ${cmd.values[i+1] * scaleFactor}`; // ry
                            newPath += ` ${cmd.values[i+2]}`; // rot (no change)
                            newPath += ` ${cmd.values[i+3]}`; // large-arc
                            newPath += ` ${cmd.values[i+4]}`; // sweep
                            newPath += ` ${centerX + (cmd.values[i+5] - centerX) * scaleFactor}`; // x
                            newPath += ` ${centerY + (cmd.values[i+6] - centerY) * scaleFactor}`; // y
                        }
                    } else {
                        // Standard x,y coordinate pairs (M, L, C, Q, S, T)
                        for (let i = 0; i < cmd.values.length; i += 2) {
                            newPath += ` ${centerX + (cmd.values[i] - centerX) * scaleFactor}`;
                            newPath += ` ${centerY + (cmd.values[i+1] - centerY) * scaleFactor}`;
                        }
                    }
                }
                element.setAttribute('d', newPath.trim());
                break;
            }
        }
    }

    // Refresh UI and Save to History
    this.updateSelectionHandles();
    this.updateContextMenuValues();
    this.saveState();
},

    showScaleDialog() {
        if (!this.selectedElement) {
            alert('Please select an element first.');
            return;
        }

        // Create scale dialog overlay
        const overlay = document.createElement('div');
        overlay.className = 'scale-modal-overlay';
        overlay.innerHTML = `
            <div class="scale-modal">
                <h3>Scale Element</h3>
                <div class="scale-input-group">
                    <label for="scalePercentage">Scale Percentage (%):</label>
                    <input type="number" id="scalePercentage" value="100" min="1" max="1000" step="1">
                </div>
                <div class="scale-modal-buttons">
                    <button id="applyScale">Apply</button>
                    <button id="cancelScale">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Focus the input
        setTimeout(() => {
            document.getElementById('scalePercentage').focus();
            document.getElementById('scalePercentage').select();
        }, 100);

        // Event listeners
        document.getElementById('applyScale').addEventListener('click', () => {
            const percentage = parseFloat(document.getElementById('scalePercentage').value);
            if (isNaN(percentage) || percentage <= 0) {
                alert('Please enter a valid positive number.');
                return;
            }
            this.scaleElementByPercentage(percentage / 100);
            document.body.removeChild(overlay);
        });

        document.getElementById('cancelScale').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });

        // Close when clicking outside the modal
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });

        // Close with Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    // 3. Scale Element by Percentage,

    startRotating(clientX, clientY) {
        if (this.selectedElements.length === 0) return;
        
        this.isRotating = true;
        
        // Clear state first to ensure no stale data
        this.rotationCenter = null;
        this.initialElementStates = null;
        this.initialElementCenters = null;
        this.initialElementRotations = null;
        this.initialMouseAngle = 0;

        try {
            // Initialize states and centers
            this.initialElementStates = this.selectedElements.map(element => 
                this.getElementState(element)
            );
            
            this.initialElementCenters = this.selectedElements.map(element => ({
                x: this.getElementCenterX(element),
                y: this.getElementCenterY(element)
            }));
            
            // Calculate center of the selection using correct bounding box
            const bounds = this.calculateSelectionBounds();
            
            if (bounds) {
                const centerX = bounds.x + bounds.width / 2;
                const centerY = bounds.y + bounds.height / 2;
                
                // Store the rotation center
                this.rotationCenter = { x: centerX, y: centerY };
                
                // Get initial mouse position in SVG coordinates
                const startPoint = this.screenToSVG(clientX, clientY);
                
                // Calculate initial angle in SVG coordinates (not screen coordinates)
                this.initialMouseAngle = Math.atan2(startPoint.y - centerY, startPoint.x - centerX);
                
                // Store initial rotation for each element
                this.initialElementRotations = this.selectedElements.map(element => {
                    const transform = element.getAttribute('transform');
                    if (transform && transform.includes('rotate')) {
                        const match = transform.match(/rotate\(([-\d.]+)/);
                        if (match) {
                            return parseFloat(match[1]);
                        }
                    }
                    return 0;
                });
            }
        } catch (e) {
            console.error("Error starting rotation:", e);
            this.isRotating = false;
        }
    },

    rotateElement(currentClientX, currentClientY) {
        if (this.selectedElements.length === 0 || !this.rotationCenter) return;
        
        const currentPoint = this.screenToSVG(currentClientX, currentClientY);
        const currentAngle = Math.atan2(
            currentPoint.y - this.rotationCenter.y,
            currentPoint.x - this.rotationCenter.x
        );
        let rotationDelta = (currentAngle - this.initialMouseAngle) * (180 / Math.PI);
        
        this.selectedElements.forEach((element, index) => {
            const state = this.initialElementStates[index];
            const newRotation = (this.initialElementRotations[index] || 0) + rotationDelta;
            
            if (element.tagName === 'g' || element.getAttribute('data-type')) {
                const bbox = element.getBBox();
                const localCx = bbox.x + bbox.width / 2;
                const localCy = bbox.y + bbox.height / 2;
                const sx = state.scaleX || 1;
                const sy = state.scaleY || 1;

                // Maintain visual center: NewTranslate = RotationCenter - (LocalCenter * Scale)
                // But since the group rotates around its visual center (Pivot), we simply set:
                const pivotX = localCx * sx;
                const pivotY = localCy * sy;

                // Format: translate -> rotate(angle, pivot) -> scale
                element.setAttribute('transform', 
                    `translate(${state.x}, ${state.y}) rotate(${newRotation}, ${pivotX}, ${pivotY}) scale(${sx}, ${sy})`
                );
            } else {
                // Standard shapes
                const cx = this.rotationCenter.x;
                const cy = this.rotationCenter.y;
                element.setAttribute('transform', `rotate(${newRotation}, ${cx}, ${cy})`);
            }
        });
        
        this.updateSelectionHandles();
        this.updateContextMenuValues();
    },

    rotateElementByAngle() {
        if (!this.selectedElement) return;

        const angleInput = prompt('Enter rotation angle in degrees:', '45');
        if (angleInput === null) return;
        const additionalAngle = parseFloat(angleInput);
        if (isNaN(additionalAngle)) return;

        const element = this.selectedElement;
        const state = this.getElementState(element);
        const bbox = element.getBBox();

        // Calculate new rotation
        const newRotation = (state.rotation || 0) + additionalAngle;

        if (element.getAttribute('data-type') === 'latex' || element.tagName === 'g') {
            // Calculate the center pivot based on the scaled local coordinates
            const pivotX = (bbox.x + bbox.width / 2) * state.scaleX;
            const pivotY = (bbox.y + bbox.height / 2) * state.scaleY;

            // Standardized transform order: translate -> rotate -> scale
            element.setAttribute('transform', 
                `translate(${state.x}, ${state.y}) rotate(${newRotation}, ${pivotX}, ${pivotY}) scale(${state.scaleX}, ${state.scaleY})`
            );
        } else {
            // Standard shape rotation
            const cx = bbox.x + bbox.width / 2;
            const cy = bbox.y + bbox.height / 2;
            element.setAttribute('transform', `rotate(${newRotation}, ${cx}, ${cy})`);
        }

        this.updateSelectionHandles();
        this.saveState();
    }


    // 2. Show Scale Dialog,

    getElementRotation(element) {
        if (!element) return 0;
        
        const transform = element.getAttribute('transform');
        if (!transform) return 0;
        
        // Look for rotate transformation
        const rotateMatch = transform.match(/rotate\(([-\d.]+)(?:,\s*([-\d.]+),\s*([-\d.]+))?\)/);
        if (rotateMatch) {
            return parseFloat(rotateMatch[1]);
        }
        
        return 0;
    },

    applyRotationToElement(element, angle, centerX, centerY) {
        // Get current transform
        const currentTransform = element.getAttribute('transform') || '';
        let currentRotation = 0;
        
        // Extract current rotation if exists
        if (currentTransform.includes('rotate')) {
            const match = currentTransform.match(/rotate\(([-\d.]+)(?:,\s*([-\d.]+),\s*([-\d.]+))?\)/);
            if (match) {
                currentRotation = parseFloat(match[1]);
            }
        }
        
        // Apply new rotation
        const newRotation = currentRotation + angle;
        element.setAttribute('transform', `rotate(${newRotation}, ${centerX}, ${centerY})`);
    },

    moveElement(element, targetCenterX, targetCenterY) {
        const isLatex = element.getAttribute('data-type') === 'latex';
        const isStructure = element.getAttribute('data-type') === 'structure';
        const isGroup = element.tagName.toLowerCase() === 'g';
        // -------------------------------
        
        if (isLatex || isGroup || isStructure) {
            const transform = element.getAttribute('transform') || '';
            
            // Safety check for BBox
            let bbox;
            try {
                bbox = element.getBBox();
            } catch(e) { return; }
            
            // 1. Get current Scale
            let scale = 1;
            const sm = transform.match(/scale\(([-\d.]+)(?:,\s*([-\d.]+))?\)/);
            if (sm) scale = parseFloat(sm[1]);

            // 2. Calculate Local Center
            const localCenterX = bbox.x + bbox.width / 2;
            const localCenterY = bbox.y + bbox.height / 2;
            
            // 3. Calculate New Translate (Origin)
            // To put the Visual Center at (TargetX, TargetY), the Origin must be offset
            // by the scaled distance to the local center.
            const newTx = targetCenterX - (localCenterX * scale);
            const newTy = targetCenterY - (localCenterY * scale);

            // 4. Reconstruct Transform preserving Rotation and Scale
            let newTransform = transform;
            
            // Replace or Append Translate
            if (newTransform.includes('translate')) {
                newTransform = newTransform.replace(/translate\([^\)]+\)/, `translate(${newTx}, ${newTy})`);
            } else {
                newTransform = `translate(${newTx}, ${newTy}) ` + newTransform;
            }
            
            element.setAttribute('transform', newTransform);

        } else {
            // Standard Elements: Calculate delta from current center to target center
            const currentCenterX = this.getElementCenterX(element);
            const currentCenterY = this.getElementCenterY(element);
            const dx = targetCenterX - currentCenterX;
            const dy = targetCenterY - currentCenterY;
            
            this.moveElementBy(element, dx, dy);
            
            // Handle Rotation Center update for standard elements
            const transform = element.getAttribute('transform') || '';
            if (transform.includes('rotate')) {
                const match = transform.match(/rotate\(([-\d.]+)/);
                if (match) {
                    const angle = parseFloat(match[1]);
                    // Rotate around the NEW center
                    element.setAttribute('transform', `rotate(${angle}, ${targetCenterX}, ${targetCenterY})`);
                }
            }
        }
        
        this.updateContextMenuValues();
    },

    moveElementBy(element, dx, dy) {
        const tagName = element.tagName;
        
        switch (tagName) {
            case 'rect': {
                const x = parseFloat(element.getAttribute('x') || 0);
                const y = parseFloat(element.getAttribute('y') || 0);
                element.setAttribute('x', x + dx);
                element.setAttribute('y', y + dy);
                break;
            }
            case 'circle': {
                const cx = parseFloat(element.getAttribute('cx') || 0);
                const cy = parseFloat(element.getAttribute('cy') || 0);
                element.setAttribute('cx', cx + dx);
                element.setAttribute('cy', cy + dy);
                break;
            }
            case 'ellipse': {
                const ecx = parseFloat(element.getAttribute('cx') || 0);
                const ecy = parseFloat(element.getAttribute('cy') || 0);
                element.setAttribute('cx', ecx + dx);
                element.setAttribute('cy', ecy + dy);
                break;
            }
            case 'line': {
                const x1 = parseFloat(element.getAttribute('x1') || 0);
                const y1 = parseFloat(element.getAttribute('y1') || 0);
                const x2 = parseFloat(element.getAttribute('x2') || 0);
                const y2 = parseFloat(element.getAttribute('y2') || 0);
                element.setAttribute('x1', x1 + dx);
                element.setAttribute('y1', y1 + dy);
                element.setAttribute('x2', x2 + dx);
                element.setAttribute('y2', y2 + dy);
                break;
            }
            case 'text': {
                const tx = parseFloat(element.getAttribute('x') || 0);
                const ty = parseFloat(element.getAttribute('y') || 0);
                element.setAttribute('x', tx + dx);
                element.setAttribute('y', ty + dy);
                
                // FIX: Also move all child tspans
                // tspans usually have absolute 'x' attributes for alignment
                const tspans = element.querySelectorAll('tspan');
                tspans.forEach(tspan => {
                    const tsX = parseFloat(tspan.getAttribute('x'));
                    if (!isNaN(tsX)) {
                        tspan.setAttribute('x', tsX + dx);
                    }
                    // We typically don't update 'y' or 'dy' for tspans as they are relative to the line height
                });
                break;
            }
            case 'path': {
                this.translatePath(element, dx, dy);
                break;
            }
        }
    },

    handleArrowKeyMovement(direction, ctrlPressed, shiftPressed) {
        // Safety check - if there's no selected element, don't do anything
        if (!this.selectedElement || this.selectedElements.length === 0) return;
        
        // Calculate movement step based on modifiers
        let stepInUnits;
        
        if (ctrlPressed) {
            // Ctrl + arrow: 0.01 unit
            stepInUnits = 0.01;
        } else if (shiftPressed) {
            // Shift + arrow: 1 unit
            stepInUnits = 1;
        } else {
            // No modifier: no movement
            return;
        }
        
        // Convert step from current units to pixels
        const stepInPixels = stepInUnits * this.unitFactors[this.currentUnits];
        
        // Get element's rotation
        const rotation = this.getElementRotation(this.selectedElement);
        
        let dx = 0;
        let dy = 0;
        
        // Calculate movement in global coordinates
        switch(direction) {
            case 'ArrowUp':
                dy = -stepInPixels;
                break;
            case 'ArrowDown':
                dy = stepInPixels;
                break;
            case 'ArrowLeft':
                dx = -stepInPixels;
                break;
            case 'ArrowRight':
                dx = stepInPixels;
                break;
        }
        
        // If element is rotated, rotate the movement vector by the negative rotation angle
        if (rotation !== 0) {
            // Convert degrees to radians
            const rad = -rotation * Math.PI / 180;
            
            // Rotate the movement vector
            const rotatedDx = dx * Math.cos(rad) - dy * Math.sin(rad);
            const rotatedDy = dx * Math.sin(rad) + dy * Math.cos(rad);
            
            dx = rotatedDx;
            dy = rotatedDy;
        }
        
        // Move the element
        this.moveElementBy(this.selectedElement, dx, dy);
        
        // Update UI
        this.updateSelectionHandles();
        this.updateContextMenuValues();
        // this.updateCoordinateInputs();
    },

    flipHorizontal() {
        if (this.selectedElements.length === 0) return;

        // 1. Find the axis of reflection (center of selection)
        const bbox = this.getGroupBoundingBox();
        if (!bbox) return;
        const axisX = bbox.x + bbox.width / 2;

        // 2. Flip every selected element
        this.selectedElements.forEach(element => {
            this.flipElement(element, 'horizontal', axisX);
        });

        // 3. Update UI
        this.saveState(); 
        this.updateSelectionHandles();
        this.updateContextMenuValues();
    },

    flipVertical() {
        if (this.selectedElements.length === 0) return;

        // 1. Find the axis of reflection (center of selection)
        const bbox = this.getGroupBoundingBox();
        if (!bbox) return;
        const axisY = bbox.y + bbox.height / 2;

        // 2. Flip every selected element
        this.selectedElements.forEach(element => {
            this.flipElement(element, 'vertical', axisY);
        });

        // 3. Update UI
        this.saveState(); 
        this.updateSelectionHandles();
        this.updateContextMenuValues();
    },

    flipElement(element, direction, axis) {
        const tagName = element.tagName.toLowerCase();
        const type = element.getAttribute('data-type');
        const isHoriz = direction === 'horizontal';

        // --- 1. Handle Complex Types (Text, Structure, LaTeX, Group, Path) ---
        // We use transform attributes for these to ensure they mirror correctly
        // without breaking their internal geometry or coordinate systems.
        if (tagName === 'text' || tagName === 'g' || tagName === 'path' || type === 'structure' || type === 'latex') {
            this.flipComplexElement(element, isHoriz, axis);
            return;
        }

        // --- 2. Handle Simple Shapes (Rect, Circle, Line, Ellipse) ---
        // For these, we can mathematically reflect the coordinates to keep the SVG clean.
        // Formula: NewPos = Axis + (Axis - OldPos) = 2*Axis - OldPos

        const reflect = (val) => (2 * axis) - val;

        switch (tagName) {
            case 'rect': {
                const x = parseFloat(element.getAttribute('x') || 0);
                const y = parseFloat(element.getAttribute('y') || 0);
                const w = parseFloat(element.getAttribute('width') || 0);
                const h = parseFloat(element.getAttribute('height') || 0);

                if (isHoriz) {
                    // Reflect the right edge to find the new left edge
                    element.setAttribute('x', reflect(x + w));
                } else {
                    // Reflect the bottom edge to find the new top edge
                    element.setAttribute('y', reflect(y + h));
                }
                
                // Handle rotation reflection if present
                this.reflectRotation(element, isHoriz);
                break;
            }
            case 'circle': 
            case 'ellipse': {
                const cxAttr = tagName === 'circle' ? 'cx' : 'cx'; 
                const cyAttr = tagName === 'circle' ? 'cy' : 'cy'; // Ellipse uses cx/cy too
                
                const cx = parseFloat(element.getAttribute(cxAttr) || 0);
                const cy = parseFloat(element.getAttribute(cyAttr) || 0);

                if (isHoriz) {
                    element.setAttribute(cxAttr, reflect(cx));
                } else {
                    element.setAttribute(cyAttr, reflect(cy));
                }
                this.reflectRotation(element, isHoriz);
                break;
            }
            case 'line': {
                const x1 = parseFloat(element.getAttribute('x1') || 0);
                const y1 = parseFloat(element.getAttribute('y1') || 0);
                const x2 = parseFloat(element.getAttribute('x2') || 0);
                const y2 = parseFloat(element.getAttribute('y2') || 0);

                if (isHoriz) {
                    element.setAttribute('x1', reflect(x1));
                    element.setAttribute('x2', reflect(x2));
                } else {
                    element.setAttribute('y1', reflect(y1));
                    element.setAttribute('y2', reflect(y2));
                }
                this.reflectRotation(element, isHoriz);
                break;
            }
        }
    }

    // New Helper: Handle flipping for Text, Groups, Structures,

    flipComplexElement(element, isHoriz, axis) {
        // 1. Parse current transform
        const transform = element.getAttribute('transform') || '';
        
        let tx = 0, ty = 0, sx = 1, sy = 1, rot = 0;
        
        // Parse Translate
        const tm = transform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
        if (tm) { tx = parseFloat(tm[1]); ty = parseFloat(tm[2]); }
        
        // Parse Rotate
        const rm = transform.match(/rotate\(([-\d.]+)/);
        if (rm) { rot = parseFloat(rm[1]); }
        
        // Parse Scale
        const sm = transform.match(/scale\(([-\d.]+)(?:,\s*([-\d.]+))?\)/);
        if (sm) { 
            sx = parseFloat(sm[1]); 
            sy = sm[2] ? parseFloat(sm[2]) : sx; 
        }

        // 2. Handle simple Text/Path that might not have a transform yet
        // If it's a raw text element with x/y attributes, we convert position to translate
        if (element.tagName === 'text' && !tm) {
            const x = parseFloat(element.getAttribute('x') || 0);
            const y = parseFloat(element.getAttribute('y') || 0);
            tx = x;
            ty = y;
            // Zero out attributes so transform takes over cleanly
            element.setAttribute('x', 0);
            element.setAttribute('y', 0);
            // Fix tspans
            element.querySelectorAll('tspan').forEach(t => {
                const txVal = parseFloat(t.getAttribute('x'));
                if(!isNaN(txVal)) t.setAttribute('x', txVal - x); // Make relative
            });
        }

        // 3. Calculate Visual Center (Global) to flip around
        // We need the bounding box to know where the visual center is relative to (0,0)
        const bbox = element.getBBox();
        // Local Center (unscaled, untranslated)
        const lcX = bbox.x + bbox.width / 2;
        const lcY = bbox.y + bbox.height / 2;

        // Current Global Center
        // Note: Rotation happens around (lcX*sx, lcY*sy) in our editor logic
        const globalCX = tx + lcX * sx;
        const globalCY = ty + lcY * sy;

        // 4. Calculate New Global Position
        // We reflect the Global Center across the Axis
        let newGlobalCX = globalCX;
        let newGlobalCY = globalCY;

        if (isHoriz) {
            newGlobalCX = (2 * axis) - globalCX;
            sx = -sx; // Flip Scale X
            rot = -rot; // Flip Rotation Angle
        } else {
            newGlobalCY = (2 * axis) - globalCY;
            sy = -sy; // Flip Scale Y
            rot = -rot; // Flip Rotation Angle
        }

        // 5. Back-Calculate New Translate
        // NewGlobal = NewTranslate + (LocalCenter * NewScale)
        // NewTranslate = NewGlobal - (LocalCenter * NewScale)
        const newTx = newGlobalCX - (lcX * sx);
        const newTy = newGlobalCY - (lcY * sy);

        // 6. Construct new Transform String
        // Order: Translate -> Rotate -> Scale
        // We assume rotation is around the center of the object (common in this editor)
        const pivotX = lcX * sx;
        const pivotY = lcY * sy;

        let newTransform = `translate(${newTx}, ${newTy})`;
        
        if (rot !== 0) {
             // Note: We use the scaled pivot coordinates
            newTransform += ` rotate(${rot}, ${pivotX}, ${pivotY})`;
        }
        
        newTransform += ` scale(${sx}, ${sy})`;

        element.setAttribute('transform', newTransform);
    }

    // Helper to flip the rotation angle of simple shapes,

    reflectRotation(element, isHoriz) {
        const transform = element.getAttribute('transform') || '';
        if (transform.includes('rotate')) {
            const match = transform.match(/rotate\(([-\d.]+)(?:,\s*([-\d.]+),\s*([-\d.]+))?\)/);
            if (match) {
                const angle = parseFloat(match[1]);
                let cx = parseFloat(match[2]);
                let cy = parseFloat(match[3]);
                
                // If no center defined in string, assume geometric center (approx)
                // Ideally we should recalculate, but for simple shapes reflection logic handles x/y
                
                if (isHoriz && !isNaN(cx)) cx = (2 * arguments[2]) - cx; // arguments[2] isn't avail here easily
                // Actually, simplified approach: Just flip the angle.
                // The position logic in switch/case already moved the center point.
                // Just need to invert angle.
                
                const bbox = element.getBBox();
                const newCx = bbox.x + bbox.width/2;
                const newCy = bbox.y + bbox.height/2;

                element.setAttribute('transform', `rotate(${-angle}, ${newCx}, ${newCy})`);
            }
        }
    }
    // --- History (Undo/Redo) System ---,

    updateElementTransform(element, bbox) {
        // Get current transform
        const currentTransform = element.getAttribute('transform') || '';
        let rotation = 0;
        
        // Extract rotation from current transform
        if (currentTransform.includes('rotate')) {
            const match = currentTransform.match(/rotate\(([-\d.]+)(?:,\s*([-\d.]+),\s*([-\d.]+))?\)/);
            if (match) {
                rotation = parseFloat(match[1]);
            }
        }
        
        // Update transform with new center
        if (rotation !== 0) {
            const centerX = bbox.x + bbox.width / 2;
            const centerY = bbox.y + bbox.height / 2;
            element.setAttribute('transform', `rotate(${rotation}, ${centerX}, ${centerY})`);
        } else {
            element.removeAttribute('transform');
        }
    },

    updateElementPositionFromState(element, state, dx, dy) {
        const tagName = element.tagName;
        
        switch (tagName) {
            case 'rect':
                element.setAttribute('x', state.x + dx);
                element.setAttribute('y', state.y + dy);
                break;
            case 'circle':
                element.setAttribute('cx', state.cx + dx);
                element.setAttribute('cy', state.cy + dy);
                break;
            case 'ellipse':
                element.setAttribute('cx', state.cx + dx);
                element.setAttribute('cy', state.cy + dy);
                break;
            case 'line':
                element.setAttribute('x1', state.x1 + dx);
                element.setAttribute('y1', state.y1 + dy);
                element.setAttribute('x2', state.x2 + dx);
                element.setAttribute('y2', state.y2 + dy);
                break;
            case 'text':
                element.setAttribute('x', state.x + dx);
                element.setAttribute('y', state.y + dy);
                // Update tspans based on their initial state
                if (state.tspans) {
                    state.tspans.forEach(tspanState => {
                        tspanState.el.setAttribute('x', tspanState.x + dx);
                    });
                }
                break;
            case 'path':
                // Stateless path translation
                const newD = this.translatePathString(state.d, dx, dy);
                element.setAttribute('d', newD);
                break;
        }
    },

    parsePathCommands(pathData) {
        // Simple path command parser
        const commands = [];
        const tokens = pathData.match(/[MmLlHhVvCcSsQqTtAaZz]|[+-]?\d*\.?\d+/g) || [];
        
        let currentCommand = null;
        let values = [];
        
        for (const token of tokens) {
            if (token.match(/^[MmLlHhVvCcSsQqTtAaZz]$/)) {
                // Save previous command if exists
                if (currentCommand) {
                    commands.push({
                        type: currentCommand.type,
                        values: currentCommand.values
                    });
                }
                
                // Start new command
                currentCommand = {
                    type: token,
                    values: []
                };
            } else {
                // Add value to current command
                if (currentCommand) {
                    currentCommand.values.push(parseFloat(token));
                }
            }
        }
        
        // Add the last command
        if (currentCommand) {
            commands.push({
                type: currentCommand.type,
                values: currentCommand.values
            });
        }
        
        return commands;
    },

    translatePath(element, dx, dy) {
        const d = element.getAttribute('d');
        if (!d) return;
        
        // Parse path commands and translate coordinates
        const commands = this.parsePathCommands(d);
        let newPath = '';
        
        for (const cmd of commands) {
            const type = cmd.type;
            newPath += type;
            
            // Translate coordinates based on command type
            switch(type.toLowerCase()) {
                case 'm': // moveto
                case 'l': // lineto
                case 't': // smooth quadratic curveto
                    for (let i = 0; i < cmd.values.length; i += 2) {
                        if (i < cmd.values.length) {
                            const x = cmd.values[i] + dx;
                            const y = cmd.values[i + 1] + dy;
                            newPath += ` ${x} ${y}`;
                        }
                    }
                    break;
                    
                case 'h': // horizontal lineto
                    for (let i = 0; i < cmd.values.length; i++) {
                        const x = cmd.values[i] + dx;
                        newPath += ` ${x}`;
                    }
                    break;
                    
                case 'v': // vertical lineto
                    for (let i = 0; i < cmd.values.length; i++) {
                        const y = cmd.values[i] + dy;
                        newPath += ` ${y}`;
                    }
                    break;
                    
                case 'c': // curveto
                    for (let i = 0; i < cmd.values.length; i += 6) {
                        if (i + 5 < cmd.values.length) {
                            const x1 = cmd.values[i] + dx;
                            const y1 = cmd.values[i + 1] + dy;
                            const x2 = cmd.values[i + 2] + dx;
                            const y2 = cmd.values[i + 3] + dy;
                            const x = cmd.values[i + 4] + dx;
                            const y = cmd.values[i + 5] + dy;
                            newPath += ` ${x1} ${y1} ${x2} ${y2} ${x} ${y}`;
                        }
                    }
                    break;
                    
                case 's': // smooth curveto
                case 'q': // quadratic curveto
                    for (let i = 0; i < cmd.values.length; i += 4) {
                        if (i + 3 < cmd.values.length) {
                            const x1 = cmd.values[i] + dx;
                            const y1 = cmd.values[i + 1] + dy;
                            const x = cmd.values[i + 2] + dx;
                            const y = cmd.values[i + 3] + dy;
                            newPath += ` ${x1} ${y1} ${x} ${y}`;
                        }
                    }
                    break;
                    
                case 'a': // elliptical arc
                    for (let i = 0; i < cmd.values.length; i += 7) {
                        if (i + 6 < cmd.values.length) {
                            const rx = cmd.values[i];
                            const ry = cmd.values[i + 1];
                            const rotation = cmd.values[i + 2];
                            const largeArc = cmd.values[i + 3];
                            const sweep = cmd.values[i + 4];
                            const x = cmd.values[i + 5] + dx;
                            const y = cmd.values[i + 6] + dy;
                            newPath += ` ${rx} ${ry} ${rotation} ${largeArc} ${sweep} ${x} ${y}`;
                        }
                    }
                    break;
                    
                case 'z': // closepath
                case 'Z':
                    // No coordinates to translate
                    break;
            }
        }
        
        element.setAttribute('d', newPath.trim());
    },

    translatePathString(d, dx, dy) {
        const commands = this.parsePathCommands(d);
        let newPath = '';
        
        for (const cmd of commands) {
            const type = cmd.type;
            newPath += type;
            
            switch(type.toLowerCase()) {
                case 'm': case 'l': case 't':
                    for (let i = 0; i < cmd.values.length; i += 2) {
                        if (i < cmd.values.length) {
                            newPath += ` ${cmd.values[i] + dx} ${cmd.values[i + 1] + dy}`;
                        }
                    }
                    break;
                case 'h':
                    for (let i = 0; i < cmd.values.length; i++) {
                        newPath += ` ${cmd.values[i] + dx}`;
                    }
                    break;
                case 'v':
                    for (let i = 0; i < cmd.values.length; i++) {
                        newPath += ` ${cmd.values[i] + dy}`;
                    }
                    break;
                case 'c':
                    for (let i = 0; i < cmd.values.length; i += 6) {
                        if (i + 5 < cmd.values.length) {
                            newPath += ` ${cmd.values[i] + dx} ${cmd.values[i + 1] + dy} ${cmd.values[i + 2] + dx} ${cmd.values[i + 3] + dy} ${cmd.values[i + 4] + dx} ${cmd.values[i + 5] + dy}`;
                        }
                    }
                    break;
                case 's': case 'q':
                    for (let i = 0; i < cmd.values.length; i += 4) {
                        if (i + 3 < cmd.values.length) {
                            newPath += ` ${cmd.values[i] + dx} ${cmd.values[i + 1] + dy} ${cmd.values[i + 2] + dx} ${cmd.values[i + 3] + dy}`;
                        }
                    }
                    break;
                case 'a':
                    for (let i = 0; i < cmd.values.length; i += 7) {
                        if (i + 6 < cmd.values.length) {
                            newPath += ` ${cmd.values[i]} ${cmd.values[i + 1]} ${cmd.values[i + 2]} ${cmd.values[i + 3]} ${cmd.values[i + 4]} ${cmd.values[i + 5] + dx} ${cmd.values[i + 6] + dy}`;
                        }
                    }
                    break;
                default:
                    // z/Z or unknown - just append (Z has no coords)
                    // If it has coords (rare for unknown), we assume pairs and shift
                    if (cmd.values.length > 0 && cmd.values.length % 2 === 0) {
                        for(let i=0; i<cmd.values.length; i+=2) {
                            newPath += ` ${cmd.values[i] + dx} ${cmd.values[i+1] + dy}`;
                        }
                    }
                    break;
            }
        }
        return newPath.trim();
    },

    updateCurveControlPoint(clientX, clientY) {
        if (!this.selectedElement) return;

        // 1. Get Mouse Position (This is where we want the curve to pass through)
        const svgPoint = this.screenToSVG(clientX, clientY);
        let mouseX = svgPoint.x;
        let mouseY = svgPoint.y;

        // 2. Handle Rotation (Inverse Transform)
        const transform = this.selectedElement.getAttribute('transform');
        if (transform && transform.includes('rotate')) {
            const match = transform.match(/rotate\(([-\d.]+)(?:,\s*([-\d.]+),\s*([-\d.]+))?\)/);
            if (match) {
                const angle = parseFloat(match[1]);
                let rcx = parseFloat(match[2]);
                let rcy = parseFloat(match[3]);
                
                if (isNaN(rcx) || isNaN(rcy)) {
                    const bbox = this.selectedElement.getBBox();
                    rcx = bbox.x + bbox.width / 2;
                    rcy = bbox.y + bbox.height / 2;
                }
                
                const rad = -angle * Math.PI / 180;
                const dx = mouseX - rcx;
                const dy = mouseY - rcy;
                
                mouseX = rcx + dx * Math.cos(rad) - dy * Math.sin(rad);
                mouseY = rcy + dx * Math.sin(rad) + dy * Math.cos(rad);
            }
        }

        // 3. Get Start (P0) and End (P2) points
        const d = this.selectedElement.getAttribute('d') || '';
        const nums = d.match(/[+-]?\d*\.?\d+/g);
        if (!nums || nums.length < 6) return;
        
        const vals = nums.map(parseFloat);
        const x1 = vals[0];
        const y1 = vals[1];
        // vals[2], vals[3] are old cx, cy - we ignore them
        const x2 = vals[4];
        const y2 = vals[5];

        // 4. Calculate NEW Control Point (P1)
        // We want the curve midpoint B(0.5) to equal Mouse(mouseX, mouseY)
        // Mouse = 0.25*P0 + 0.5*P1 + 0.25*P2
        // 0.5*P1 = Mouse - 0.25*P0 - 0.25*P2
        // P1 = 2*Mouse - 0.5*P0 - 0.5*P2
        
        const newCx = (2 * mouseX) - 0.5 * (x1 + x2);
        const newCy = (2 * mouseY) - 0.5 * (y1 + y2);

        // 5. Update the Path Data
        const newD = `M ${x1} ${y1} Q ${newCx} ${newCy} ${x2} ${y2}`;
        this.selectedElement.setAttribute('d', newD);
        
        // 6. Update Handles
        this.updateSelectionHandles();
        
        // Update properties in side panel less frequently
        if (this.contextMenuUpdateTimeout) clearTimeout(this.contextMenuUpdateTimeout);
        this.contextMenuUpdateTimeout = setTimeout(() => {
           // this.updateContextMenuValues(); // Optional: uncomment if you want live coordinate updates in the panel
        }, 50);
    }
    // Helper method to update input value without triggering change event,

    getElementState(element) {
        if (!element) return null;

        const tagName = element.tagName.toLowerCase();
        const isLatex = element.getAttribute('data-type') === 'latex';
        const isStructure = element.getAttribute('data-type') === 'structure';

        if (isStructure || isLatex || tagName === 'g') {
            const transform = element.getAttribute('transform') || '';
            let tx = 0, ty = 0, scaleX = 1, scaleY = 1, rotation = 0;

            // Robust regex for translate, scale, and rotate
            const tm = transform.match(/translate\(([^,)\s]+)(?:[\s,]+([^)\s]+))?\)/);
            if (tm) { tx = parseFloat(tm[1]); ty = tm[2] ? parseFloat(tm[2]) : 0; }

            const sm = transform.match(/scale\(([^,)\s]+)(?:[\s,]+([^)\s]+))?\)/);
            if (sm) { scaleX = parseFloat(sm[1]); scaleY = sm[2] ? parseFloat(sm[2]) : scaleX; }

            const rm = transform.match(/rotate\(([^,)\s]+)/);
            if (rm) { rotation = parseFloat(rm[1]); }

            return {
                type: isStructure ? 'structure' : (isLatex ? 'latex' : 'group'),
                x: tx, y: ty, scaleX, scaleY, rotation,
                bbox: element.getBBox() // Cache the internal geometry
            };
        }

        // ... (keep the existing switch/case for standard shapes) ...
        const state = { type: tagName };
        const transform = element.getAttribute('transform') || '';
        const rotateMatch = transform.match(/rotate\(([-\d.]+)/);
        state.rotation = rotateMatch ? parseFloat(rotateMatch[1]) : 0;

        switch (tagName) {
            case 'rect':
                state.x = parseFloat(element.getAttribute('x') || 0);
                state.y = parseFloat(element.getAttribute('y') || 0);
                state.width = parseFloat(element.getAttribute('width') || 0);
                state.height = parseFloat(element.getAttribute('height') || 0);
                if (rotateMatch && rotateMatch[2] && rotateMatch[3]) {
                    state.rotationCx = parseFloat(rotateMatch[2]);
                    state.rotationCy = parseFloat(rotateMatch[3]);
                }
                break;
            case 'circle':
                state.cx = parseFloat(element.getAttribute('cx') || 0);
                state.cy = parseFloat(element.getAttribute('cy') || 0);
                state.r = parseFloat(element.getAttribute('r') || 0);
                break;
            case 'ellipse':
                state.cx = parseFloat(element.getAttribute('cx') || 0);
                state.cy = parseFloat(element.getAttribute('cy') || 0);
                state.rx = parseFloat(element.getAttribute('rx') || 0);
                state.ry = parseFloat(element.getAttribute('ry') || 0);
                break;
            case 'line':
                state.x1 = parseFloat(element.getAttribute('x1') || 0);
                state.y1 = parseFloat(element.getAttribute('y1') || 0);
                state.x2 = parseFloat(element.getAttribute('x2') || 0);
                state.y2 = parseFloat(element.getAttribute('y2') || 0);
                break;
            case 'text':
                state.x = parseFloat(element.getAttribute('x') || 0);
                state.y = parseFloat(element.getAttribute('y') || 0);
                state.fontSize = parseFloat(element.getAttribute('font-size')) || 16;
                const tspans = element.querySelectorAll('tspan');
                if (tspans.length > 0) {
                    state.tspans = Array.from(tspans).map(t => ({
                        el: t,
                        x: parseFloat(t.getAttribute('x') || 0),
                        dy: t.getAttribute('dy')
                    }));
                }
                break;
            case 'path':
                state.d = element.getAttribute('d') || '';
                break;
        }

        return state;
    },

    getElementCenterX(element) {
        const isLatex = element.getAttribute('data-type') === 'latex';
        const isStructure = element.getAttribute('data-type') === 'structure';
        
        // Check for Structure, Latex, or Group
        if (isLatex || isStructure || element.tagName.toLowerCase() === 'g') { 
            const transform = element.getAttribute('transform') || '';
            
            let tx = 0;
            const tm = transform.match(/translate\(([-\d.]+)/);
            if (tm) tx = parseFloat(tm[1]);

            let scale = 1;
            const sm = transform.match(/scale\(([-\d.]+)/);
            if (sm) scale = parseFloat(sm[1]);

            const bbox = element.getBBox();
            
            // Global Center = TranslateX + (LocalBBoxCenter * Scale)
            return tx + (bbox.x + bbox.width / 2) * scale;
        }
        
        // Standard Element fallback
        const bbox = element.getBBox();
        return bbox.x + bbox.width / 2;
    },

    getElementCenterY(element) {
        const isLatex = element.getAttribute('data-type') === 'latex';
        const isStructure = element.getAttribute('data-type') === 'structure';
        
        if (isLatex || isStructure || element.tagName.toLowerCase() === 'g') { 
            const transform = element.getAttribute('transform') || '';
            
            let ty = 0;
            const tm = transform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
            if (tm && tm[2]) ty = parseFloat(tm[2]);

            let scale = 1;
            const sm = transform.match(/scale\(([-\d.]+)/);
            if (sm) scale = parseFloat(sm[1]);

            const bbox = element.getBBox();
            
            // Global Center = TranslateY + (LocalBBoxCenter * Scale)
            return ty + (bbox.y + bbox.height / 2) * scale;
        }

        // Standard Element fallback
        const bbox = element.getBBox();
        return bbox.y + bbox.height / 2;
    }
    // Update the moveElement method for paths:,

    groupElements() {
        alert('Group Elements feature would be implemented here');
    }

});
