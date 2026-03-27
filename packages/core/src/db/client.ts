import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { logger } from '../logger';
import { resolveProjectRoot } from './projectRoot';

export type PrismaClientFactoryOptions = {
  logQueries?: boolean;
};

let prismaSingleton: PrismaClient | null = null;

function ensureDatabaseUrl(): void {
  const projectRoot = resolveProjectRoot(__dirname);
  const existing = process.env.DATABASE_URL;

  if (existing) {
    if (existing.startsWith('file:')) {
      return;
    }

    if (!existing.includes('://')) {
      const resolvedPath = path.isAbsolute(existing)
        ? existing
        : path.join(projectRoot, existing);
      const normalized = `file:${resolvedPath}`;
      process.env.DATABASE_URL = normalized;
      logger.warn({ original: existing, normalized }, 'Normalized DATABASE_URL to SQLite file URL');
    }
    return;
  }

  const fallbackPath = path.join(projectRoot, 'prisma', 'dev.db');
  fs.mkdirSync(path.dirname(fallbackPath), { recursive: true });
  const fallback = `file:${fallbackPath}`;
  process.env.DATABASE_URL = fallback;
  logger.warn({ fallback }, 'DATABASE_URL missing; using fallback SQLite database');
}

export function getPrismaClient(options: PrismaClientFactoryOptions = {}): PrismaClient {
  if (!prismaSingleton) {
    ensureDatabaseUrl();
    prismaSingleton = new PrismaClient({
      log: options.logQueries ? ['query', 'error', 'warn'] : ['error', 'warn']
    });
  }

  return prismaSingleton;
}
