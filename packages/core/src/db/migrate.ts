import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { logger } from '../logger';
import { resolveProjectRoot } from './projectRoot';

let migrationsPromise: Promise<void> | null = null;

function resolvePrismaInvocation(projectRoot: string): { command: string; args: string[] } {
  const binDir = path.join(projectRoot, 'node_modules', '.bin');
  const binName = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
  const binPath = path.join(binDir, binName);

  if (fs.existsSync(binPath)) {
    return { command: binPath, args: [] };
  }

  try {
    const prismaPackageJson = require.resolve('prisma/package.json', { paths: [projectRoot] });
    const prismaDir = path.dirname(prismaPackageJson);
    const cliEntry = path.join(prismaDir, 'build', 'index.js');
    if (fs.existsSync(cliEntry)) {
      return { command: process.execPath, args: [cliEntry] };
    }
  } catch (error) {
    logger.warn({ err: error }, 'Unable to resolve Prisma CLI package');
  }

  return { command: 'npx', args: ['prisma'] };
}

async function runMigrateDeploy(): Promise<void> {
  const projectRoot = resolveProjectRoot(__dirname);
  const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');

  if (!fs.existsSync(schemaPath)) {
    logger.warn({ schemaPath }, 'Prisma schema not found; skipping migration deployment');
    return;
  }

  const { command, args } = resolvePrismaInvocation(projectRoot);
  const migrateArgs = [...args, 'migrate', 'deploy', `--schema=${schemaPath}`];

  logger.info({ command, args: migrateArgs }, 'Running Prisma migrations');

  const child = spawn(command, migrateArgs, {
    cwd: projectRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');

  child.stdout?.on('data', (chunk: string) => {
    const lines = chunk.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      logger.info({ output: line }, 'prisma migrate stdout');
    }
  });

  child.stderr?.on('data', (chunk: string) => {
    const lines = chunk.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      logger.error({ output: line }, 'prisma migrate stderr');
    }
  });

  const [code] = (await once(child, 'close')) as [number | null];

  if (code !== 0) {
    throw new Error(`Prisma migrate deploy failed with exit code ${code}`);
  }

  logger.info('Prisma migrations applied successfully');
}

export function ensureDatabaseMigrated(): Promise<void> {
  if (!migrationsPromise) {
    migrationsPromise = runMigrateDeploy().catch((error) => {
      migrationsPromise = null;
      throw error;
    });
  }

  return migrationsPromise;
}
