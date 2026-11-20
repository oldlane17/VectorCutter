/**
 * VectorCutter - Core Document Commands
 * Every change to the document passes through an undoable command.
 */

export class AddElementCommand {
    constructor(element) {
        this.element = { ...element };
    }

    do(doc) {
        doc.elements[this.element.id] = this.element;
        if (!doc.order.includes(this.element.id)) {
            doc.order.push(this.element.id);
        }
        return { changedIds: [this.element.id] };
    }

    undo(doc) {
        delete doc.elements[this.element.id];
        const idx = doc.order.indexOf(this.element.id);
        if (idx !== -1) doc.order.splice(idx, 1);
        doc.selection = doc.selection.filter(id => id !== this.element.id);
        return { changedIds: [this.element.id] };
    }
}

export class DeleteElementsCommand {
    constructor(ids, doc) {
        this.deletedItems = ids.map(id => ({
            id,
            element: { ...doc.elements[id] },
            index: doc.order.indexOf(id)
        })).filter(item => !!item.element);
    }

    do(doc) {
        const ids = [];
        this.deletedItems.forEach(({ id }) => {
            delete doc.elements[id];
            const idx = doc.order.indexOf(id);
            if (idx !== -1) doc.order.splice(idx, 1);
            ids.push(id);
        });
        doc.selection = doc.selection.filter(id => !ids.includes(id));
        return { changedIds: ids };
    }

    undo(doc) {
        const ids = [];
        this.deletedItems.forEach(({ id, element, index }) => {
            doc.elements[id] = element;
            if (index >= 0 && index <= doc.order.length) {
                doc.order.splice(index, 0, id);
            } else {
                doc.order.push(id);
            }
            ids.push(id);
        });
        return { changedIds: ids };
    }
}

export class TransformElementsCommand {
    constructor(transforms) {
        // transforms = [{ id, before: [a,b,c,d,e,f], after: [a,b,c,d,e,f] }]
        this.transforms = transforms;
    }

    do(doc) {
        const changed = [];
        this.transforms.forEach(({ id, after }) => {
            if (doc.elements[id]) {
                doc.elements[id].transform = [...after];
                changed.push(id);
            }
        });
        return { changedIds: changed };
    }

    undo(doc) {
        const changed = [];
        this.transforms.forEach(({ id, before }) => {
            if (doc.elements[id]) {
                doc.elements[id].transform = [...before];
                changed.push(id);
            }
        });
        return { changedIds: changed };
    }
}

export class UpdateElementPropsCommand {
    constructor(id, beforeProps, afterProps) {
        this.id = id;
        this.beforeProps = JSON.parse(JSON.stringify(beforeProps));
        this.afterProps = JSON.parse(JSON.stringify(afterProps));
    }

    do(doc) {
        if (doc.elements[this.id]) {
            Object.assign(doc.elements[this.id], JSON.parse(JSON.stringify(this.afterProps)));
            return { changedIds: [this.id] };
        }
        return { changedIds: [] };
    }

    undo(doc) {
        if (doc.elements[this.id]) {
            Object.assign(doc.elements[this.id], JSON.parse(JSON.stringify(this.beforeProps)));
            return { changedIds: [this.id] };
        }
        return { changedIds: [] };
    }
}

export class BatchCommand {
    constructor(name, commands = []) {
        this.name = name;
        this.commands = commands;
    }

    do(doc) {
        const changed = new Set();
        for (const cmd of this.commands) {
            const res = cmd.do(doc);
            if (res?.changedIds) res.changedIds.forEach(id => changed.add(id));
        }
        return { changedIds: Array.from(changed) };
    }

    undo(doc) {
        const changed = new Set();
        for (let i = this.commands.length - 1; i >= 0; i--) {
            const res = this.commands[i].undo(doc);
            if (res?.changedIds) res.changedIds.forEach(id => changed.add(id));
        }
        return { changedIds: Array.from(changed) };
    }
}
