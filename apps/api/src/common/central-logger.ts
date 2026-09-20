import { mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { LoggerService } from '@nestjs/common';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal';

function serialize(value: unknown): string {
  if (value instanceof Error) {
    return JSON.stringify({ name: value.name, message: value.message, stack: value.stack });
  }
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

function safeMessage(value: unknown): string {
  return serialize(value)
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/(password|token|secret|authorization|cookie)\s*[:=]\s*["']?[^,"'\s}]+/gi, '$1=[REDACTED]');
}

export class CentralLogger implements LoggerService {
  private readonly directory = process.env.LOG_DIR || join(process.cwd(), 'logs');

  constructor() {
    mkdirSync(this.directory, { recursive: true });
  }

  private write(level: LogLevel, message: unknown, context?: string): void {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const entry = {
      timestamp: now.toISOString(),
      level,
      context: context || undefined,
      message: safeMessage(message),
      pid: process.pid,
    };
    const line = `${JSON.stringify(entry)}\n`;
    const file = join(this.directory, `${level === 'error' || level === 'fatal' ? 'error' : 'api'}-${date}.log`);
    try {
      appendFileSync(file, line, { encoding: 'utf8' });
    } catch {
      // Never crash the application because logging is unavailable.
    }
  }

  log(message: unknown, context?: string): void { this.write('log', message, context); }
  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', trace ? `${safeMessage(message)} | ${trace}` : message, context);
  }
  warn(message: unknown, context?: string): void { this.write('warn', message, context); }
  debug(message: unknown, context?: string): void { this.write('debug', message, context); }
  verbose(message: unknown, context?: string): void { this.write('verbose', message, context); }
  fatal(message: unknown, context?: string): void { this.write('fatal', message, context); }
}
