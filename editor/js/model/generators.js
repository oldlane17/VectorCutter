/**
 * VectorCutter - Parametric Shape Generators (§4)
 * Mathematical vertex generation and corner filleting for Stars and N-gons.
 */

export function generateStarVertices(params) {
    const points = Math.max(3, Math.min(64, parseInt(params.points || 5, 10)));
    const outerRadius = Math.max(0.5, parseFloat(params.outerRadius || 25));
    const innerRatio = Math.max(0.05, Math.min(0.95, parseFloat(params.innerRatio || 0.382)));
    const rotationDeg = parseFloat(params.rotation || 0);
    const rotationRad = (rotationDeg * Math.PI) / 180;
    const cx = parseFloat(params.cx || 0);
    const cy = parseFloat(params.cy || 0);

    const total = points * 2;
    const vertices = [];

    for (let i = 0; i < total; i++) {
        const r = (i % 2 === 0) ? outerRadius : outerRadius * innerRatio;
        const theta = rotationRad - Math.PI / 2 + (i * Math.PI) / points;
        vertices.push({
            x: cx + r * Math.cos(theta),
            y: cy + r * Math.sin(theta)
        });
    }

    return vertices;
}

export function generatePolygonVertices(params) {
    const sides = Math.max(3, Math.min(128, parseInt(params.sides || 6, 10)));
    let radius = Math.max(0.5, parseFloat(params.radius || 25));
    const sizeMode = params.sizeMode || 'circumradius';
    const rotationDeg = parseFloat(params.rotation || 0);
    const rotationRad = (rotationDeg * Math.PI) / 180;
    const cx = parseFloat(params.cx || 0);
    const cy = parseFloat(params.cy || 0);

    if (sizeMode === 'inradius') {
        radius = radius / Math.cos(Math.PI / sides);
    } else if (sizeMode === 'sideLength') {
        radius = radius / (2 * Math.sin(Math.PI / sides));
    }

    const vertices = [];
    for (let i = 0; i < sides; i++) {
        const theta = rotationRad - Math.PI / 2 + (2 * Math.PI * i) / sides;
        vertices.push({
            x: cx + radius * Math.cos(theta),
            y: cy + radius * Math.sin(theta)
        });
    }

    return vertices;
}

/**
 * Turns vertices into an SVG path 'd' string with corner rounding (fillet).
 */
export function verticesToFilletPath(vertices, cornerRadius = 0) {
    const n = vertices.length;
    if (n < 3) return '';
    if (cornerRadius <= 0.05) {
        return vertices.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x.toFixed(2)} ${v.y.toFixed(2)}`).join(' ') + ' Z';
    }

    let d = '';
    for (let i = 0; i < n; i++) {
        const prev = vertices[(i - 1 + n) % n];
        const curr = vertices[i];
        const next = vertices[(i + 1) % n];

        // Vector curr -> prev
        const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
        const len1 = Math.hypot(v1.x, v1.y);
        // Vector curr -> next
        const v2 = { x: next.x - curr.x, y: next.y - curr.y };
        const len2 = Math.hypot(v2.x, v2.y);

        const r = Math.min(cornerRadius, len1 * 0.45, len2 * 0.45);
        if (r <= 0.05) {
            d += `${i === 0 ? 'M' : 'L'} ${curr.x.toFixed(2)} ${curr.y.toFixed(2)} `;
            continue;
        }

        const u1 = { x: v1.x / len1, y: v1.y / len1 };
        const u2 = { x: v2.x / len2, y: v2.y / len2 };

        const pStart = { x: curr.x + u1.x * r, y: curr.y + u1.y * r };
        const pEnd = { x: curr.x + u2.x * r, y: curr.y + u2.y * r };

        if (i === 0) {
            d += `M ${pStart.x.toFixed(2)} ${pStart.y.toFixed(2)} `;
        } else {
            d += `L ${pStart.x.toFixed(2)} ${pStart.y.toFixed(2)} `;
        }
        d += `Q ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}, ${pEnd.x.toFixed(2)} ${pEnd.y.toFixed(2)} `;
    }

    d += 'Z';
    return d;
}
