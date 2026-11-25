/**
 * VectorCutter - Element Factory & Geometry Models
 * Normalized element definitions in mm world units.
 */

import { uid } from '../core/ids.js';
import { IDENTITY_MATRIX } from './matrix.js';

export function createElement(type, props = {}) {
    const id = props.id || uid(type);
    const base = {
        id,
        type,
        name: props.name || `${type.charAt(0).toUpperCase() + type.slice(1)}`,
        visible: props.visible !== false,
        locked: !!props.locked,
        parent: props.parent || null,
        transform: props.transform ? [...props.transform] : [...IDENTITY_MATRIX],
        style: {
            fill: props.style?.fill !== undefined ? props.style.fill : (window.__vcDefaultFill !== undefined ? window.__vcDefaultFill : 'rgba(0, 122, 204, 0.08)'),
            stroke: props.style?.stroke !== undefined ? props.style.stroke : (window.__vcDefaultStroke !== undefined ? window.__vcDefaultStroke : '#007acc'),
            strokeWidth: props.style?.strokeWidth !== undefined ? props.style.strokeWidth : 0.5, // 0.5mm
            strokeDasharray: props.style?.strokeDasharray || '',
            opacity: props.style?.opacity !== undefined ? props.style.opacity : 1,
            ...props.style
        },
        laser: {
            op: props.laser?.op || 'cut', // 'cut' | 'score' | 'engrave' | 'guide'
            cutOrder: props.laser?.cutOrder || 0,
            ...props.laser
        },
        params: props.params ? { ...props.params } : {},
        geometry: {}
    };

    switch (type) {
        case 'rect':
            base.geometry = {
                x: props.x || 0,
                y: props.y || 0,
                width: props.width || 60,
                height: props.height || 40,
                rx: props.rx || 0,
                ry: props.ry || 0
            };
            break;
        case 'circle':
            base.geometry = {
                cx: props.cx || 0,
                cy: props.cy || 0,
                r: props.r || 25
            };
            break;
        case 'ellipse':
            base.geometry = {
                cx: props.cx || 0,
                cy: props.cy || 0,
                rx: props.rx || 35,
                ry: props.ry || 20
            };
            break;
        case 'polygon':
            base.geometry = {
                cx: props.cx || 0,
                cy: props.cy || 0,
                sides: props.sides || 6,
                radius: props.radius || 25
            };
            break;
        case 'star':
            base.geometry = {
                cx: props.cx || 0,
                cy: props.cy || 0,
                points: props.points || 5,
                outerRadius: props.outerRadius || 25,
                innerRadius: props.innerRadius || 12.5
            };
            break;
        case 'line':
            base.geometry = {
                x1: props.x1 || 0,
                y1: props.y1 || 0,
                x2: props.x2 !== undefined ? props.x2 : 50,
                y2: props.y2 || 0
            };
            base.style.fill = 'none';
            break;
        case 'path':
            base.geometry = {
                d: props.d || 'M 0 0'
            };
            break;
        case 'text':
            base.geometry = {
                x: props.x || 0,
                y: props.y || 0,
                text: props.text || 'Text',
                fontSize: props.fontSize || 14, // mm or pt
                fontFamily: props.fontFamily || 'Arial',
                isLaTeX: !!props.isLaTeX,
                latexFormula: props.latexFormula || '',
                welded: !!props.welded
            };
            break;
        case 'group':
            base.children = props.children ? [...props.children] : [];
            break;
        default:
            base.geometry = props.geometry ? { ...props.geometry } : {};
            break;
    }

    return base;
}
