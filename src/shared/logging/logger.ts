// src/shared/logging/logger.ts

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private level: LogLevel;

  constructor(
    private readonly context: string,
    level: LogLevel = 'info',
  ) {
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log('error', message, { ...data, error: error?.message, stack: error?.stack });
  }

  child(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`, this.level);
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.level]) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.context}]`;
    const suffix = data ? ` ${JSON.stringify(data)}` : '';

    switch (level) {
      case 'debug':
        console.debug(`${prefix} ${message}${suffix}`);
        break;
      case 'info':
        console.info(`${prefix} ${message}${suffix}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}${suffix}`);
        break;
      case 'error':
        console.error(`${prefix} ${message}${suffix}`);
        break;
    }
  }
}
