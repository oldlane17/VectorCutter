/**
 * VectorCutter - 2D Affine Matrix
 * [a, b, c, d, e, f] representing:
 * [ a c e ]
 * [ b d f ]
 * [ 0 0 1 ]
 */

export const IDENTITY_MATRIX = Object.freeze([1, 0, 0, 1, 0, 0]);

export function multiplyMatrix(m1, m2) {
    const [a1, b1, c1, d1, e1, f1] = m1;
    const [a2, b2, c2, d2, e2, f2] = m2;
    return [
        a1 * a2 + c1 * b2,
        b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2,
        b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1,
        b1 * e2 + d1 * f2 + f1
    ];
}

export function translationMatrix(tx, ty) {
    return [1, 0, 0, 1, tx, ty];
}

export function rotationMatrix(deg, cx = 0, cy = 0) {
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    if (cx === 0 && cy === 0) {
        return [cos, sin, -sin, cos, 0, 0];
    }
    return multiplyMatrix(
        translationMatrix(cx, cy),
        multiplyMatrix([cos, sin, -sin, cos, 0, 0], translationMatrix(-cx, -cy))
    );
}

export function scaleMatrix(sx, sy, cx = 0, cy = 0) {
    if (cx === 0 && cy === 0) {
        return [sx, 0, 0, sy, 0, 0];
    }
    return multiplyMatrix(
        translationMatrix(cx, cy),
        multiplyMatrix([sx, 0, 0, sy, 0, 0], translationMatrix(-cx, -cy))
    );
}

export function transformPoint(m, p) {
    return {
        x: m[0] * p.x + m[2] * p.y + m[4],
        y: m[1] * p.x + m[3] * p.y + m[5]
    };
}

export function matrixToSVGTransform(m) {
    if (!m || (m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0)) {
        return '';
    }
    return `matrix(${m[0].toFixed(6)} ${m[1].toFixed(6)} ${m[2].toFixed(6)} ${m[3].toFixed(6)} ${m[4].toFixed(4)} ${m[5].toFixed(4)})`;
}
