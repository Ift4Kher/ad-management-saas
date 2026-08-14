/**
 * AdSync Backend — Express server entry point.
 *
 * Loads environment variables, initializes monitoring (Sentry, pino),
 * sets up middleware, mounts routes, and starts the HTTP server.
 * Connects to Upstash Redis (cloud) and initializes BullMQ queues.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { logger } from './lib/logger.js';
import { initSentry, captureException } from './lib/sentry.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { workspacesRouter } from './routes/workspaces.js';
import { connectionsRouter } from './routes/connections.js';
import { oauthMockRouter } from './routes/oauth-mock.js';
import { webhooksRouter } from './routes/webhooks.js';
import './lib/token-refresh-job.js';
import './jobs/publish-worker.js';
import './jobs/rules-worker.js';
import { closeQueues } from './lib/queue.js';
import { redis } from './lib/redis.js';

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
initSentry();

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// Rate Limiting Security Middleware
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // limit auth attempts to 30 per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(helmet());
app.use(globalLimiter);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }),
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api', healthRouter);
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/workspaces', workspacesRouter);
app.use('/api', connectionsRouter);
app.use('/api/auth', oauthMockRouter);
app.use('/api/webhooks', webhooksRouter);

/**
 * GET /api/test-error
 * QA Endpoint to deliberately trigger a Sentry error for verification
 */
app.get('/api/test-error', (_req, res) => {
  const testError = new Error('Deliberate QA Sentry Test Exception from Backend API');
  captureException(testError, { location: '/api/test-error', qaTest: true });
  logger.error({ err: testError }, 'Deliberate test error captured for Sentry QA pass');
  res.status(500).json({
    status: 'error_triggered',
    message: 'Test error successfully captured by Sentry error handler.',
    error: testError.message,
  });
});

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------
let server: any;
if (process.env.EMBEDDED_SERVER !== 'true') {
  server = app.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT }, '🚀 AdSync backend server started');
  });
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
async function shutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal — closing gracefully');
  if (server) {
    server.close(async () => {
      await closeQueues();
      if (redis) await redis.quit();
      logger.info('Server shut down cleanly');
      process.exit(0);
    });
  } else {
    await closeQueues();
    if (redis) await redis.quit();
    process.exit(0);
  }
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
