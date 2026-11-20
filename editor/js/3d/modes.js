/**
 * VectorCutter - 3D Modes & Mesh Builder (§7.4 & §7.5)
 * Builds watertight manifold meshes for all 10 modes, with volume & mass calculation.
 */

import { triangulateCap, offsetRing, resampleRing } from './geometry.js';

export function build3DMesh(rings, settings = {}) {
    if (!rings || rings.length === 0) return null;

    const mode = settings.mode || 'straight';
    const H = Math.max(0.1, parseFloat(settings.height || 5));
    const B = Math.max(0, parseFloat(settings.base || 0));
    const direction = settings.direction || 'up'; // 'up' | 'down' | 'both'
    const profile = settings.profile || 'linear'; // 'linear' | 'ease-in' | 'ease-out' | 's-curve'

    let zMin = 0;
    let zMax = H;
    if (direction === 'down') {
        zMin = -H;
        zMax = 0;
    } else if (direction === 'both') {
        zMin = -H / 2;
        zMax = H / 2;
    }

    const outerRings = rings.filter(r => r.isCCW).map(r => r.points);
    const holeRings = rings.filter(r => !r.isCCW).map(r => r.points);
    if (outerRings.length === 0 && rings.length > 0) {
        outerRings.push(rings[0].points);
    }

    const allVertices = []; // [x, y, z, ...]
    const allIndices = [];  // [i0, i1, i2, ...]
    let vertexOffset = 0;

    function addCap(ring, holes, z, normalUp) {
        const cap = triangulateCap(ring, holes, z, normalUp);
        for (let i = 0; i < cap.vertices.length; i++) {
            allVertices.push(cap.vertices[i]);
        }
        for (let i = 0; i < cap.indices.length; i++) {
            allIndices.push(cap.indices[i] + vertexOffset);
        }
        vertexOffset += cap.vertices.length / 3;
    }

    function addWallStrip(ringBottom, ringTop, zBot, zTop) {
        const n = Math.max(ringBottom.length, ringTop.length);
        const bPts = resampleRing(ringBottom, n);
        const tPts = resampleRing(ringTop, n);

        const startIdx = vertexOffset;
        for (let i = 0; i < n; i++) {
            allVertices.push(bPts[i].x, bPts[i].y, zBot);
            allVertices.push(tPts[i].x, tPts[i].y, zTop);
        }
        vertexOffset += n * 2;

        for (let i = 0; i < n; i++) {
            const next = (i + 1) % n;
            const b0 = startIdx + i * 2;
            const t0 = startIdx + i * 2 + 1;
            const b1 = startIdx + next * 2;
            const t1 = startIdx + next * 2 + 1;

            // Two triangles for outward facing quad
            allIndices.push(b0, b1, t0);
            allIndices.push(b1, t1, t0);
        }
    }

    function addApexWalls(ring, apex, zBot, zApex) {
        const n = ring.length;
        const startIdx = vertexOffset;
        for (let i = 0; i < n; i++) {
            allVertices.push(ring[i].x, ring[i].y, zBot);
        }
        allVertices.push(apex.x, apex.y, zApex);
        const apexIdx = startIdx + n;
        vertexOffset += n + 1;

        for (let i = 0; i < n; i++) {
            const next = (i + 1) % n;
            allIndices.push(startIdx + i, startIdx + next, apexIdx);
        }
    }

    function getCentroid(pts) {
        let sx = 0, sy = 0;
        pts.forEach(p => { sx += p.x; sy += p.y; });
        return { x: sx / pts.length, y: sy / pts.length };
    }

    // Process each outer ring (and its holes)
    for (const outer of outerRings) {
        // --- 1. Straight Extrude ---
        if (mode === 'straight') {
            addCap(outer, holeRings, zMin, false);
            addCap(outer, holeRings, zMax, true);
            addWallStrip(outer, outer, zMin, zMax);
            holeRings.forEach(hole => addWallStrip(hole, hole, zMax, zMin)); // inward walls
        }

        // --- 2. Converging / Taper in ---
        else if (mode === 'taper') {
            const angle = Math.max(0, Math.min(85, parseFloat(settings.taperAngle || 15)));
            const delta = -H * Math.tan((angle * Math.PI) / 180);
            const topRings = offsetRing(outer, delta);
            const topOuter = topRings.length > 0 ? topRings[0] : [{ x: outer[0].x, y: outer[0].y }];

            addCap(outer, holeRings, zMin, false);
            if (topRings.length > 0) {
                addCap(topOuter, [], zMax, true);
                addWallStrip(outer, topOuter, zMin, zMax);
            } else {
                // Converged completely to apex
                const center = getCentroid(outer);
                addApexWalls(outer, center, zMin, zMax);
            }
        }

        // --- 3. Diverging / Flare out ---
        else if (mode === 'flare') {
            const angle = Math.max(0, Math.min(75, parseFloat(settings.taperAngle || 15)));
            const delta = H * Math.tan((angle * Math.PI) / 180);
            const topRings = offsetRing(outer, delta);
            const topOuter = topRings.length > 0 ? topRings[0] : outer;

            addCap(outer, holeRings, zMin, false);
            addCap(topOuter, holeRings, zMax, true);
            addWallStrip(outer, topOuter, zMin, zMax);
        }

        // --- 4. To Point / Pyramid-Cone ---
        else if (mode === 'point') {
            const center = getCentroid(outer);
            addCap(outer, holeRings, zMin, false);
            addApexWalls(outer, center, zMin, zMax);
        }

        // --- 5. Chamfer / Bevel ---
        else if (mode === 'chamfer') {
            const cSize = Math.min(H * 0.45, Math.max(0.2, parseFloat(settings.chamferSize || 1)));
            const innerTop = offsetRing(outer, -cSize)[0] || outer;

            addCap(outer, holeRings, zMin, false);
            addWallStrip(outer, outer, zMin, zMax - cSize);
            addWallStrip(outer, innerTop, zMax - cSize, zMax);
            addCap(innerTop, holeRings, zMax, true);
        }

        // --- 6. Rounded / Fillet ---
        else if (mode === 'rounded') {
            const r = Math.min(H * 0.45, Math.max(0.2, parseFloat(settings.filletRadius || 1.5)));
            const steps = Math.max(4, Math.min(16, parseInt(settings.filletSteps || 6, 10)));
            addCap(outer, holeRings, zMin, false);
            addWallStrip(outer, outer, zMin, zMax - r);

            let prevRing = outer;
            let prevZ = zMax - r;
            for (let s = 1; s <= steps; s++) {
                const theta = (s / steps) * (Math.PI / 2);
                const curZ = (zMax - r) + r * Math.sin(theta);
                const inset = -r * (1 - Math.cos(theta));
                const nextRing = offsetRing(outer, inset)[0] || prevRing;
                addWallStrip(prevRing, nextRing, prevZ, curZ);
                prevRing = nextRing;
                prevZ = curZ;
            }
            addCap(prevRing, holeRings, zMax, true);
        }

        // --- 7. Stepped / Layered ---
        else if (mode === 'stepped') {
            const layers = Math.max(2, Math.min(30, parseInt(settings.layers || 5, 10)));
            const stepInset = Math.max(0.1, parseFloat(settings.stepInset || 0.8));
            const stepH = H / layers;

            addCap(outer, holeRings, zMin, false);
            let prevRing = outer;
            for (let l = 0; l < layers; l++) {
                const z0 = zMin + l * stepH;
                const z1 = z0 + stepH;
                const curRings = offsetRing(outer, -l * stepInset);
                const curRing = curRings.length > 0 ? curRings[0] : prevRing;
                addWallStrip(curRing, curRing, z0, z1);
                if (l < layers - 1) {
                    const nextRings = offsetRing(outer, -(l + 1) * stepInset);
                    const nextRing = nextRings.length > 0 ? nextRings[0] : curRing;
                    addWallStrip(curRing, nextRing, z1, z1); // terrace step
                } else {
                    addCap(curRing, holeRings, z1, true);
                }
                prevRing = curRing;
            }
        }

        // --- 8. Twist Extrude ---
        else if (mode === 'twist') {
            const twistDeg = parseFloat(settings.twistAngle || 45);
            const slices = 32;
            const sliceH = H / slices;
            const center = getCentroid(outer);

            addCap(outer, holeRings, zMin, false);
            let prevRing = outer;
            for (let s = 0; s < slices; s++) {
                const z0 = zMin + s * sliceH;
                const z1 = z0 + sliceH;
                const rotRad = (((s + 1) / slices) * twistDeg * Math.PI) / 180;
                const twistedRing = outer.map(p => {
                    const dx = p.x - center.x;
                    const dy = p.y - center.y;
                    return {
                        x: center.x + dx * Math.cos(rotRad) - dy * Math.sin(rotRad),
                        y: center.y + dx * Math.sin(rotRad) + dy * Math.cos(rotRad)
                    };
                });
                addWallStrip(prevRing, twistedRing, z0, z1);
                prevRing = twistedRing;
            }
            addCap(prevRing, holeRings, zMax, true);
        }

        // --- 9. Inflate / Pillow ---
        else if (mode === 'inflate') {
            const steps = 10;
            const maxInset = Math.min(H * 2, 10);
            addCap(outer, holeRings, zMin, false);
            let prevRing = outer;
            let prevZ = zMin;

            for (let s = 1; s <= steps; s++) {
                const dNorm = s / steps;
                const curZ = zMin + H * Math.sqrt(Math.max(0, 1 - Math.pow(1 - dNorm, 2)));
                const curRings = offsetRing(outer, -dNorm * maxInset);
                const curRing = curRings.length > 0 ? curRings[0] : prevRing;
                addWallStrip(prevRing, curRing, prevZ, curZ);
                prevRing = curRing;
                prevZ = curZ;
                if (s === steps) {
                    addCap(curRing, [], curZ, true);
                }
            }
        }

        // --- 10. Revolve (lathe) ---
        else if (mode === 'revolve') {
            const revAngle = Math.max(10, Math.min(360, parseFloat(settings.revolveAngle || 360)));
            const segments = 48;
            const angleStep = (revAngle * Math.PI) / 180 / segments;
            const minX = Math.min(...outer.map(p => p.x));

            let prevRing = outer.map(p => ({ x: p.x - minX, y: 0, z: p.y }));
            const firstRing = [...prevRing];

            for (let i = 1; i <= segments; i++) {
                const theta = i * angleStep;
                const curRing = outer.map(p => {
                    const r = p.x - minX;
                    return {
                        x: r * Math.cos(theta),
                        y: r * Math.sin(theta),
                        z: p.y
                    };
                });

                // Add quad between rings
                const n = outer.length;
                const startIdx = vertexOffset;
                for (let k = 0; k < n; k++) {
                    allVertices.push(prevRing[k].x, prevRing[k].y, prevRing[k].z);
                    allVertices.push(curRing[k].x, curRing[k].y, curRing[k].z);
                }
                vertexOffset += n * 2;

                for (let k = 0; k < n; k++) {
                    const next = (k + 1) % n;
                    const b0 = startIdx + k * 2;
                    const t0 = startIdx + k * 2 + 1;
                    const b1 = startIdx + next * 2;
                    const t1 = startIdx + next * 2 + 1;
                    allIndices.push(b0, b1, t0);
                    allIndices.push(b1, t1, t0);
                }
                prevRing = curRing;
            }

            if (revAngle >= 359) {
                // Closed circle revolution
            } else {
                // Add caps at ends
                addCap(firstRing, [], 0, false);
                addCap(prevRing, [], 0, true);
            }
        }
    }

    // Base plate support (§7.4)
    if (B > 0) {
        const baseMargin = Math.max(0, parseFloat(settings.baseMargin || 2));
        for (const outer of outerRings) {
            const plateOuter = offsetRing(outer, baseMargin)[0] || outer;
            addCap(plateOuter, [], zMin - B, false);
            addCap(plateOuter, [], zMin, true);
            addWallStrip(plateOuter, plateOuter, zMin - B, zMin);
        }
    }

    // Weld coincident vertices to create watertight manifold topology (§7.5)
    const welded = weldMeshVertices(allVertices, allIndices);

    // Mesh Analysis: Volume, Bounds, and Manifold Verification
    const stats = analyzeMesh(welded.vertices, welded.indices);

    return {
        vertices: new Float32Array(welded.vertices),
        indices: new Uint32Array(welded.indices),
        triangleCount: welded.indices.length / 3,
        bounds: stats.bounds,
        volume: stats.volume, // in cm³
        isManifold: stats.isManifold,
        unmatchedEdges: stats.unmatchedEdges
    };
}

/**
 * Welds vertices within 1e-4 mm epsilon to ensure watertight manifold topology.
 */
function weldMeshVertices(vertices, indices, eps = 1e-4) {
    const unique = [];
    const indexMap = new Map();
    const newIndices = [];

    const key = (x, y, z) => `${Math.round(x / eps)}_${Math.round(y / eps)}_${Math.round(z / eps)}`;

    for (let i = 0; i < vertices.length; i += 3) {
        const k = key(vertices[i], vertices[i + 1], vertices[i + 2]);
        if (indexMap.has(k)) {
            indexMap.set(i / 3, indexMap.get(k));
        } else {
            const newIdx = unique.length / 3;
            indexMap.set(k, newIdx);
            indexMap.set(i / 3, newIdx);
            unique.push(vertices[i], vertices[i + 1], vertices[i + 2]);
        }
    }

    for (let i = 0; i < indices.length; i++) {
        newIndices.push(indexMap.get(indices[i]));
    }

    return { vertices: unique, indices: newIndices };
}

/**
 * Computes bounding box, exact volume in cm³, and manifold validation.
 */
function analyzeMesh(vertices, indices) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        const z = vertices[i + 2];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
    }

    // Signed tetrahedron volume sum: sum(v1 . (v2 x v3)) / 6 in mm³ -> / 1000 for cm³
    let volMm3 = 0;
    const edgeMap = new Map();

    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i] * 3;
        const i1 = indices[i + 1] * 3;
        const i2 = indices[i + 2] * 3;

        const p1 = { x: vertices[i0], y: vertices[i0 + 1], z: vertices[i0 + 2] };
        const p2 = { x: vertices[i1], y: vertices[i1 + 1], z: vertices[i1 + 2] };
        const p3 = { x: vertices[i2], y: vertices[i2 + 1], z: vertices[i2 + 2] };

        // Signed volume
        const v = (p1.x * (p2.y * p3.z - p2.z * p3.y) -
                   p1.y * (p2.x * p3.z - p2.z * p3.x) +
                   p1.z * (p2.x * p3.y - p2.y * p3.x)) / 6.0;
        volMm3 += v;

        // Edge tracking for manifoldness
        trackEdge(edgeMap, indices[i], indices[i + 1]);
        trackEdge(edgeMap, indices[i + 1], indices[i + 2]);
        trackEdge(edgeMap, indices[i + 2], indices[i]);
    }

    let unmatched = 0;
    for (const count of edgeMap.values()) {
        if (count !== 2) unmatched++;
    }

    return {
        bounds: {
            width: Math.max(0, maxX - minX),
            depth: Math.max(0, maxY - minY),
            height: Math.max(0, maxZ - minZ)
        },
        volume: Math.abs(volMm3) / 1000.0, // cm³
        isManifold: unmatched === 0,
        unmatchedEdges: unmatched
    };
}

function trackEdge(map, u, v) {
    const key = u < v ? `${u}_${v}` : `${v}_${u}`;
    map.set(key, (map.get(key) || 0) + 1);
}
