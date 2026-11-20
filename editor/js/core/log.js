/**
 * VectorCutter - Logger & Diagnostic Overlay
 */

class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = 200;
    }

    info(msg, ...args) {
        console.log(`[VC:Info] ${msg}`, ...args);
        this.record('info', msg, args);
    }

    warn(msg, ...args) {
        console.warn(`[VC:Warn] ${msg}`, ...args);
        this.record('warn', msg, args);
    }

    error(msg, ...args) {
        console.error(`[VC:Error] ${msg}`, ...args);
        this.record('error', msg, args);
    }

    record(level, msg, args) {
        this.logs.push({ time: new Date(), level, msg, args });
        if (this.logs.length > this.maxLogs) this.logs.shift();
    }
}

export const log = new Logger();
