/**
 * VectorCutter - Command History (Undo / Redo Stack)
 */

export class History {
    constructor(limit = 200) {
        this.undoStack = [];
        this.redoStack = [];
        this.limit = limit;
    }

    push(command) {
        this.undoStack.push(command);
        if (this.undoStack.length > this.limit) {
            this.undoStack.shift();
        }
        this.redoStack.length = 0; // Clear redo on new action
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    undo(doc) {
        if (!this.canUndo()) return null;
        const cmd = this.undoStack.pop();
        const changed = cmd.undo(doc);
        this.redoStack.push(cmd);
        return changed;
    }

    redo(doc) {
        if (!this.canRedo()) return null;
        const cmd = this.redoStack.pop();
        const changed = cmd.do(doc);
        this.undoStack.push(cmd);
        return changed;
    }

    clear() {
        this.undoStack.length = 0;
        this.redoStack.length = 0;
    }
}
