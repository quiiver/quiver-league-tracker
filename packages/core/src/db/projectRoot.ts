import fs from 'node:fs';
import path from 'node:path';

const MAX_TRAVERSAL_STEPS = 10;

function isWorkspacePackage(pkg: unknown): boolean {
  if (!pkg || typeof pkg !== 'object') {
    return false;
  }

  if (Array.isArray((pkg as Record<string, unknown>).workspaces)) {
    return true;
  }

  const workspaces = (pkg as Record<string, unknown>).workspaces;
  return !!workspaces && typeof workspaces === 'object';
}

export function resolveProjectRoot(startDir: string = __dirname): string {
  let current = startDir;
  let attempts = 0;
  let lastPackageDir: string | null = null;

  while (attempts < MAX_TRAVERSAL_STEPS) {
    const packageJsonPath = path.join(current, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      lastPackageDir = current;
      try {
        const pkgRaw = fs.readFileSync(packageJsonPath, 'utf8');
        const pkg = JSON.parse(pkgRaw) as Record<string, unknown>;
        if (isWorkspacePackage(pkg)) {
          break;
        }
      } catch (error) {
        // Ignore JSON parse errors and continue walking up.
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }

    current = parent;
    attempts += 1;
  }

  const candidateRoot = path.join(current, 'package.json');
  if (fs.existsSync(candidateRoot)) {
    return current;
  }

  return lastPackageDir ?? current;
}
