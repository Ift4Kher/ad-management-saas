/**
 * Database client for the AdSync backend.
 *
 * Exports a singleton PrismaClient instance connected to Neon PostgreSQL database.
 * Includes helper function `getScopedDb(workspaceId)` that returns a Prisma client extension
 * with automatic workspace isolation via query middleware.
 */
import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

logger.info('Prisma client initialized for Neon PostgreSQL');

/**
 * Returns a Prisma client instance with extended query middleware that automatically
 * injects `where: { workspaceId }` and `data: { workspaceId }` into all database operations,
 * guaranteeing multi-tenant workspace isolation at the ORM query level.
 */
export function getScopedDb(workspaceId: string) {
  return prisma.$extends({
    query: {
      campaign: {
        async findMany({ args, query }) {
          args.where = { ...args.where, workspaceId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, workspaceId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, workspaceId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, workspaceId } as any;
          return query(args);
        },
      },
      adAccountConnection: {
        async findMany({ args, query }) {
          args.where = { ...args.where, workspaceId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, workspaceId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, workspaceId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, workspaceId } as any;
          return query(args);
        },
      },
      automationRule: {
        async findMany({ args, query }) {
          args.where = { ...args.where, workspaceId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, workspaceId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, workspaceId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, workspaceId } as any;
          return query(args);
        },
      },
      subscriptionEvent: {
        async findMany({ args, query }) {
          args.where = { ...args.where, workspaceId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, workspaceId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, workspaceId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, workspaceId } as any;
          return query(args);
        },
      },
      aiUsageLog: {
        async findMany({ args, query }) {
          args.where = { ...args.where, workspaceId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, workspaceId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, workspaceId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, workspaceId } as any;
          return query(args);
        },
      },
      workspaceMember: {
        async findMany({ args, query }) {
          args.where = { ...args.where, workspaceId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, workspaceId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, workspaceId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, workspaceId } as any;
          return query(args);
        },
      },
    },
  });
}
