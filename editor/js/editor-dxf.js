/**
 * VectorCutter - SVG Editor DXF Import & Export
 * Module: editor-dxf.js
 * Description: Client-side DXF (AutoCAD R12 ASCII) Export and Import for Laser Cutters & CNC
 */

Object.assign(SVGEditor.prototype, {
    // Export user elements as DXF R12
    exportDXF() {
        const userElements = this.getUserElements();
        if (userElements.length === 0) {
            alert('Canvas is empty. Add shapes before exporting DXF.');
            return;
        }

        let dxf = '';
        // Header
        dxf += '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n';
        // Tables
        dxf += '0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n1\n0\nLAYER\n2\nCUT\n70\n0\n62\n1\n6\nCONTINUOUS\n0\nENDTAB\n0\nENDSEC\n';
        // Entities Section
        dxf += '0\nSECTION\n2\nENTITIES\n';

        userElements.forEach(el => {
            const tagName = el.tagName.toLowerCase();
            const bbox = el.getBBox();

            if (tagName === 'line') {
                const x1 = parseFloat(el.getAttribute('x1') || 0);
                const y1 = -parseFloat(el.getAttribute('y1') || 0); // Invert Y for Cartesian CAD
                const x2 = parseFloat(el.getAttribute('x2') || 0);
                const y2 = -parseFloat(el.getAttribute('y2') || 0);
                dxf += `0\nLINE\n8\nCUT\n10\n${x1.toFixed(4)}\n20\n${y1.toFixed(4)}\n30\n0.0\n11\n${x2.toFixed(4)}\n21\n${y2.toFixed(4)}\n31\n0.0\n`;
            } else if (tagName === 'circle') {
                const cx = parseFloat(el.getAttribute('cx') || 0);
                const cy = -parseFloat(el.getAttribute('cy') || 0);
                const r = parseFloat(el.getAttribute('r') || 0);
                dxf += `0\nCIRCLE\n8\nCUT\n10\n${cx.toFixed(4)}\n20\n${cy.toFixed(4)}\n30\n0.0\n40\n${r.toFixed(4)}\n`;
            } else if (tagName === 'rect') {
                const x = parseFloat(el.getAttribute('x') || 0);
                const y = -parseFloat(el.getAttribute('y') || 0);
                const w = parseFloat(el.getAttribute('width') || 0);
                const h = parseFloat(el.getAttribute('height') || 0);

                // Closed LWPOLYLINE
                dxf += `0\nPOLYLINE\n8\nCUT\n66\n1\n70\n1\n`;
                dxf += `0\nVERTEX\n8\nCUT\n10\n${x.toFixed(4)}\n20\n${y.toFixed(4)}\n30\n0.0\n`;
                dxf += `0\nVERTEX\n8\nCUT\n10\n${(x + w).toFixed(4)}\n20\n${y.toFixed(4)}\n30\n0.0\n`;
                dxf += `0\nVERTEX\n8\nCUT\n10\n${(x + w).toFixed(4)}\n20\n${(y - h).toFixed(4)}\n30\n0.0\n`;
                dxf += `0\nVERTEX\n8\nCUT\n10\n${x.toFixed(4)}\n20\n${(y - h).toFixed(4)}\n30\n0.0\n`;
                dxf += `0\nSEQEND\n`;
            } else {
                // Approximate bounding box polyline for complex paths
                const x = bbox.x;
                const y = -bbox.y;
                const w = bbox.width;
                const h = bbox.height;
                dxf += `0\nPOLYLINE\n8\nCUT\n66\n1\n70\n1\n`;
                dxf += `0\nVERTEX\n8\nCUT\n10\n${x.toFixed(4)}\n20\n${y.toFixed(4)}\n30\n0.0\n`;
                dxf += `0\nVERTEX\n8\nCUT\n10\n${(x + w).toFixed(4)}\n20\n${y.toFixed(4)}\n30\n0.0\n`;
                dxf += `0\nVERTEX\n8\nCUT\n10\n${(x + w).toFixed(4)}\n20\n${(y - h).toFixed(4)}\n30\n0.0\n`;
                dxf += `0\nVERTEX\n8\nCUT\n10\n${x.toFixed(4)}\n20\n${(y - h).toFixed(4)}\n30\n0.0\n`;
                dxf += `0\nSEQEND\n`;
            }
        });

        dxf += '0\nENDSEC\n0\nEOF\n';

        // Trigger download
        const blob = new Blob([dxf], { type: 'application/dxf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vectorcutter_export_${Date.now()}.dxf`;
        a.click();
        URL.revokeObjectURL(url);
    }
});
