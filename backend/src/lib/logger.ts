/**
 * Structured logger for the AdSync backend.
 *
 * Uses pino for high-performance JSON logging. In development,
 * logs are pretty-printed for readability. In production, raw JSON
 * is emitted for log aggregation pipelines.
 *
 * Sensitive fields (tokens, passwords, auth headers) are automatically
 * redacted from all log output.
 */
import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  name: 'adsync-backend',
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  base: {
    service: 'adsync-backend',
    env: process.env.NODE_ENV || 'development',
  },
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.secret',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
});

export type Logger = typeof logger;
