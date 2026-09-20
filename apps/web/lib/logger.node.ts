import { join } from 'path';
import { mkdirSync, appendFileSync } from 'fs';

function redact(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/(password|token|secret|authorization|cookie)\s*[:=]\s*["']?[^,"'\s}]+/gi, '$1=[REDACTED]');
}

export function setupNodeLogger() {
  const logPath = () => {
    const dir = process.env.LOG_DIR || join(process.cwd(), 'logs');
    mkdirSync(dir, { recursive: true });
    return join(dir, `web-${new Date().toISOString().slice(0, 10)}.log`);
  };

  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  const write = (level: string, args: unknown[]) => {
    try {
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        message: args
          .map(redact)
          .map((value) => (typeof value === 'string' ? value : JSON.stringify(value)))
          .join(' '),
        pid: process.pid,
      };
      appendFileSync(logPath(), `${JSON.stringify(entry)}\n`, 'utf8');
    } catch {
      // Logging must never crash the web process.
    }
  };

  console.log = (...args: unknown[]) => { original.log(...args); write('log', args); };
  console.info = (...args: unknown[]) => { original.info(...args); write('info', args); };
  console.warn = (...args: unknown[]) => { original.warn(...args); write('warn', args); };
  console.error = (...args: unknown[]) => { original.error(...args); write('error', args); };
}