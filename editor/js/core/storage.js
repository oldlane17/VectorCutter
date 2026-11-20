/**
 * VectorCutter - Core Storage Service
 * Safe wrapper around localStorage/sessionStorage with in-memory fallback.
 * Prevents crashes under Edge Tracking Prevention "Strict" and incognito modes.
 */

class StorageService {
    constructor() {
        this.memoryStore = new Map();
        this.isLocalStorageAvailable = this.checkAvailability('localStorage');
        this.isSessionStorageAvailable = this.checkAvailability('sessionStorage');
    }

    checkAvailability(type) {
        try {
            const storage = window[type];
            if (!storage) return false;
            const testKey = '__vc_test__';
            storage.setItem(testKey, testKey);
            storage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }

    getItem(key, defaultValue = null) {
        try {
            if (this.isLocalStorageAvailable) {
                const val = window.localStorage.getItem(key);
                return val !== null ? val : defaultValue;
            }
        } catch (e) {
            console.warn(`[Storage] Failed to read ${key} from localStorage:`, e);
        }
        return this.memoryStore.has(key) ? this.memoryStore.get(key) : defaultValue;
    }

    setItem(key, value) {
        const str = String(value);
        this.memoryStore.set(key, str);
        try {
            if (this.isLocalStorageAvailable) {
                window.localStorage.setItem(key, str);
            }
        } catch (e) {
            console.warn(`[Storage] Failed to write ${key} to localStorage:`, e);
        }
    }

    removeItem(key) {
        this.memoryStore.delete(key);
        try {
            if (this.isLocalStorageAvailable) {
                window.localStorage.removeItem(key);
            }
        } catch (e) {
            console.warn(`[Storage] Failed to remove ${key}:`, e);
        }
    }

    getJSON(key, defaultValue = null) {
        const val = this.getItem(key);
        if (val === null) return defaultValue;
        try {
            return JSON.parse(val);
        } catch (e) {
            console.warn(`[Storage] Failed to parse JSON for ${key}:`, e);
            return defaultValue;
        }
    }

    setJSON(key, value) {
        try {
            this.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn(`[Storage] Failed to serialize JSON for ${key}:`, e);
        }
    }

    // --- Dashboard Integration Contract ---
    getProjects() {
        return this.getJSON('vc_projects', []);
    }

    saveProject(project) {
        const projects = this.getProjects();
        const existingIdx = projects.findIndex(p => String(p.id) === String(project.id));
        if (existingIdx >= 0) {
            projects[existingIdx] = { ...projects[existingIdx], ...project, updated_at: new Date().toISOString() };
        } else {
            projects.unshift({
                id: project.id || Date.now(),
                name: project.name || 'Untitled Project',
                content: project.content || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }
        this.setJSON('vc_projects', projects);
        return projects;
    }

    getProjectById(id) {
        const projects = this.getProjects();
        return projects.find(p => String(p.id) === String(id)) || null;
    }
}

export const storage = new StorageService();
