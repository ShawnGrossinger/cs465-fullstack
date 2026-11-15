'use strict';
/**
 * Minimal structured logger.
 *
 * Writes one JSON object per line so security events (failed logins, denied
 * writes) can be searched and alerted on. JSON encoding also prevents log
 * injection: a newline or quote inside an attacker-supplied email address is
 * escaped instead of starting a fake log entry.
 */
function createLogger({ silent = false, sink = console } = {}) {
    const write = (level, event, data = {}) => {
        if (silent) return;
        const entry = JSON.stringify({ time: new Date().toISOString(), level, event, ...data });
        (level === 'error' ? sink.error : sink.log).call(sink, entry);
    };
    return {
        info: (event, data) => write('info', event, data),
        warn: (event, data) => write('warn', event, data),
        error: (event, data) => write('error', event, data),
    };
}

module.exports = { createLogger };
