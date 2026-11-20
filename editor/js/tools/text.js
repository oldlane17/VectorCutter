/**
 * VectorCutter - Text Creation Tool
 */

import { createElement } from '../model/elements.js';
import { AddElementCommand } from '../core/commands.js';
import { translationMatrix } from '../model/matrix.js';

export class TextTool {
    constructor(camera, store) {
        this.camera = camera;
        this.store = store;
    }

    onPointerDown(pt) {
        const text = 'VectorCutter';
        const el = createElement('text', {
            x: 0,
            y: 0,
            text,
            fontSize: 14, // 14mm
            fontFamily: 'Arial',
            isLaTeX: false,
            style: { fill: '#007acc', stroke: 'none' },
            laser: { op: 'engrave' },
            transform: translationMatrix(pt.x, pt.y)
        });

        this.store.dispatch(new AddElementCommand(el));
        this.store.setSelection([el.id]);

        // Automatically focus the text input in the properties panel if present
        setTimeout(() => {
            const input = document.getElementById('propTextContent');
            if (input) {
                input.focus();
                input.select();
            }
        }, 50);
    }

    onPointerMove() {}
    onPointerUp() {}
}
