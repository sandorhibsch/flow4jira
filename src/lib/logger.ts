// src/lib/logger.ts

/**
 * Structured logger for the application
 * Uses pino in production, console in development
 * 
 * IMPORTANT: Never log sensitive data like tokens, passwords, or full URLs with credentials
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Sanitize potentially sensitive data from log context
 */
function sanitizeContext(context: LogContext): LogContext {
  const sensitiveKeys = ['token', 'password', 'secret', 'apiKey', 'authorization', 'auth'];
  const sanitized: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.includes('token=')) {
      sanitized[key] = value.replace(/token=[^&\s]+/gi, 'token=[REDACTED]');
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Format log message for output
 */
function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const sanitizedContext = context ? sanitizeContext(context) : undefined;
  
  if (sanitizedContext && Object.keys(sanitizedContext).length > 0) {
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${JSON.stringify(sanitizedContext)}`;
  }
  return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
}

/**
 * Logger implementation
 */
export const logger = {
  debug(message: string, context?: LogContext): void {
    if (isDevelopment && !isTest) {
      // eslint-disable-next-line no-console
      console.log(formatMessage('debug', message, context));
    }
  },

  info(message: string, context?: LogContext): void {
    if (!isTest) {
      // eslint-disable-next-line no-console
      console.log(formatMessage('info', message, context));
    }
  },

  warn(message: string, context?: LogContext): void {
    if (!isTest) {
      console.warn(formatMessage('warn', message, context));
    }
  },

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = { ...context };
    
    if (error instanceof Error) {
      errorContext.errorMessage = error.message;
      errorContext.errorName = error.name;
      if (isDevelopment) {
        errorContext.stack = error.stack;
      }
    } else if (error !== undefined) {
      errorContext.error = String(error);
    }

    console.error(formatMessage('error', message, errorContext));
  },

  /**
   * Create a child logger with preset context
   */
  child(defaultContext: LogContext) {
    return {
      debug: (message: string, context?: LogContext) =>
        logger.debug(message, { ...defaultContext, ...context }),
      info: (message: string, context?: LogContext) =>
        logger.info(message, { ...defaultContext, ...context }),
      warn: (message: string, context?: LogContext) =>
        logger.warn(message, { ...defaultContext, ...context }),
      error: (message: string, error?: Error | unknown, context?: LogContext) =>
        logger.error(message, error, { ...defaultContext, ...context }),
    };
  },
};

export default logger;
