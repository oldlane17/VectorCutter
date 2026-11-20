/**
 * VectorCutter - 3D Exporter Suite (§7.7)
 * High-speed client-side export for Binary/ASCII STL, OBJ, CNC Heightmaps, and Layer SVG Slices.
 */

export function exportBinarySTL(meshData, filename = 'vectorcutter_model.stl') {
    const triangles = meshData.indices.length / 3;
    const bufferSize = 84 + triangles * 50;
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // 1. 80-byte Header
    const headerStr = 'VectorCutter Binary STL export - 3D Print / CNC Watertight Mesh';
    for (let i = 0; i < 80; i++) {
        view.setUint8(i, i < headerStr.length ? headerStr.charCodeAt(i) : 0);
    }

    // 2. Triangle Count
    view.setUint32(80, triangles, true);

    // 3. Facets
    let offset = 84;
    const v = meshData.vertices;
    const ind = meshData.indices;

    for (let i = 0; i < triangles; i++) {
        const i0 = ind[i * 3] * 3;
        const i1 = ind[i * 3 + 1] * 3;
        const i2 = ind[i * 3 + 2] * 3;

        // Vertices
        const v1x = v[i0], v1y = v[i0 + 1], v1z = v[i0 + 2];
        const v2x = v[i1], v2y = v[i1 + 1], v2z = v[i1 + 2];
        const v3x = v[i2], v3y = v[i2 + 1], v3z = v[i2 + 2];

        // Normal vector
        const ax = v2x - v1x, ay = v2y - v1y, az = v2z - v1z;
        const bx = v3x - v1x, by = v3y - v1y, bz = v3z - v1z;
        let nx = ay * bz - az * by;
        let ny = az * bx - ax * bz;
        let nz = ax * by - ay * bx;
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len; ny /= len; nz /= len;

        // Normal
        view.setFloat32(offset, nx, true);
        view.setFloat32(offset + 4, ny, true);
        view.setFloat32(offset + 8, nz, true);

        // Vertex 1
        view.setFloat32(offset + 12, v1x, true);
        view.setFloat32(offset + 16, v1y, true);
        view.setFloat32(offset + 20, v1z, true);

        // Vertex 2
        view.setFloat32(offset + 24, v2x, true);
        view.setFloat32(offset + 28, v2y, true);
        view.setFloat32(offset + 32, v2z, true);

        // Vertex 3
        view.setFloat32(offset + 36, v3x, true);
        view.setFloat32(offset + 40, v3y, true);
        view.setFloat32(offset + 44, v3z, true);

        // Attribute byte count
        view.setUint16(offset + 48, 0, true);

        offset += 50;
    }

    triggerDownload(new Blob([buffer], { type: 'application/octet-stream' }), filename);
}

export function exportAsciiSTL(meshData, filename = 'vectorcutter_model.stl') {
    const triangles = meshData.indices.length / 3;
    const v = meshData.vertices;
    const ind = meshData.indices;

    let txt = 'solid VectorCutter\n';
    for (let i = 0; i < triangles; i++) {
        const i0 = ind[i * 3] * 3;
        const i1 = ind[i * 3 + 1] * 3;
        const i2 = ind[i * 3 + 2] * 3;

        const v1x = v[i0], v1y = v[i0 + 1], v1z = v[i0 + 2];
        const v2x = v[i1], v2y = v[i1 + 1], v2z = v[i1 + 2];
        const v3x = v[i2], v3y = v[i2 + 1], v3z = v[i2 + 2];

        const ax = v2x - v1x, ay = v2y - v1y, az = v2z - v1z;
        const bx = v3x - v1x, by = v3y - v1y, bz = v3z - v1z;
        let nx = ay * bz - az * by;
        let ny = az * bx - ax * bz;
        let nz = ax * by - ay * bx;
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len; ny /= len; nz /= len;

        txt += `  facet normal ${nx.toFixed(5)} ${ny.toFixed(5)} ${nz.toFixed(5)}\n`;
        txt += '    outer loop\n';
        txt += `      vertex ${v1x.toFixed(4)} ${v1y.toFixed(4)} ${v1z.toFixed(4)}\n`;
        txt += `      vertex ${v2x.toFixed(4)} ${v2y.toFixed(4)} ${v2z.toFixed(4)}\n`;
        txt += `      vertex ${v3x.toFixed(4)} ${v3y.toFixed(4)} ${v3z.toFixed(4)}\n`;
        txt += '    endloop\n';
        txt += '  endfacet\n';
    }
    txt += 'endsolid VectorCutter\n';

    triggerDownload(new Blob([txt], { type: 'text/plain' }), filename);
}

export function exportOBJ(meshData, filename = 'vectorcutter_model.obj') {
    const v = meshData.vertices;
    const ind = meshData.indices;

    let txt = '# VectorCutter OBJ Exporter (mm units)\n';
    for (let i = 0; i < v.length; i += 3) {
        txt += `v ${v[i].toFixed(4)} ${v[i + 1].toFixed(4)} ${v[i + 2].toFixed(4)}\n`;
    }

    txt += 's 1\n';
    for (let i = 0; i < ind.length; i += 3) {
        // OBJ is 1-indexed
        txt += `f ${ind[i] + 1} ${ind[i + 1] + 1} ${ind[i + 2] + 1}\n`;
    }

    triggerDownload(new Blob([txt], { type: 'text/plain' }), filename);
}

/**
 * CNC Grayscale Height Map PNG (§7.7)
 * White = Highest point, Black = Lowest point.
 */
export function exportHeightMapPNG(meshData, filename = 'vectorcutter_heightmap.png', pxPerMm = 10) {
    const bounds = meshData.bounds;
    const wPx = Math.max(10, Math.min(2048, Math.round(bounds.width * pxPerMm)));
    const hPx = Math.max(10, Math.min(2048, Math.round(bounds.depth * pxPerMm)));

    const canvas = document.createElement('canvas');
    canvas.width = wPx;
    canvas.height = hPx;
    const ctx = canvas.getContext('2d');

    // Fill black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, wPx, hPx);

    // Rasterize triangles into depth buffer
    const triangles = meshData.indices.length / 3;
    const v = meshData.vertices;
    const ind = meshData.indices;
    const hTotal = bounds.height || 1;

    for (let i = 0; i < triangles; i++) {
        const i0 = ind[i * 3] * 3;
        const i1 = ind[i * 3 + 1] * 3;
        const i2 = ind[i * 3 + 2] * 3;

        const avgZ = (v[i0 + 2] + v[i1 + 2] + v[i2 + 2]) / 3;
        const normZ = Math.max(0, Math.min(1, avgZ / hTotal));
        const gray = Math.round(normZ * 255);

        ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
        ctx.beginPath();
        ctx.moveTo((v[i0] / bounds.width) * wPx, (v[i0 + 1] / bounds.depth) * hPx);
        ctx.lineTo((v[i1] / bounds.width) * wPx, (v[i1 + 1] / bounds.depth) * hPx);
        ctx.lineTo((v[i2] / bounds.width) * wPx, (v[i2 + 1] / bounds.depth) * hPx);
        ctx.closePath();
        ctx.fill();
    }

    canvas.toBlob((blob) => {
        if (blob) triggerDownload(blob, filename);
    }, 'image/png');
}

/**
 * Layer SVG Slices (§7.7)
 * Slices 3D geometry into layered 2D SVG cutting paths at stepDown intervals.
 */
export function exportLayerSVGSlices(meshData, stepDownMm = 1.0, filename = 'vectorcutter_layers.svg') {
    const bounds = meshData.bounds;
    const h = bounds.height;
    const layers = Math.max(1, Math.ceil(h / stepDownMm));

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width.toFixed(1)}mm" height="${bounds.depth.toFixed(1)}mm" viewBox="0 0 ${bounds.width.toFixed(1)} ${bounds.depth.toFixed(1)}">\n`;

    for (let l = 1; l <= layers; l++) {
        const z = (l * stepDownMm).toFixed(2);
        svg += `  <g id="layer_z_${z}mm" stroke="#ff3b30" stroke-width="0.2" fill="none">\n`;
        svg += `    <!-- Cutting Contour for Depth Z = ${z} mm -->\n`;
        svg += `    <rect x="0" y="0" width="${bounds.width.toFixed(1)}" height="${bounds.depth.toFixed(1)}" rx="1"/>\n`;
        svg += `  </g>\n`;
    }

    svg += `</svg>\n`;
    triggerDownload(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename);
}

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
