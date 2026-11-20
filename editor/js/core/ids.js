/**
 * VectorCutter - ID Generator
 * Generates stable unique IDs for elements, components and commands.
 */

let counter = 1;

export function uid(prefix = 'el') {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
    }
    return `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;
}
