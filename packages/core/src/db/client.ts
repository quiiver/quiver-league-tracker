import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { logger } from '../logger';

export type PrismaClientFactoryOptions = {
  logQueries?: boolean;
};

let prismaSingleton: PrismaClient | null = null;

function ensureDatabaseUrl(): void {
  let current = __dirname;
  let attempts = 0;
  const maxAttempts = 10;
  let lastPackageDir: string | null = null;

  while (attempts < maxAttempts) {
    const packageJsonPath = path.join(current, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      lastPackageDir = current;
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as Record<string, unknown>;
        if (Array.isArray(pkg.workspaces) || typeof pkg.workspaces === 'object') {
          break;
        }
      } catch (error) {
        // ignore JSON parse issues and continue walking up
      }
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
    attempts += 1;
  }

  const projectRoot = fs.existsSync(path.join(current, 'package.json')) ? current : lastPackageDir ?? current;
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
