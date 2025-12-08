import path from 'node:path';
import fs from 'node:fs';
import { config as loadEnv } from 'dotenv';

loadEnv();

export const PORT = Number.parseInt(process.env.PORT ?? '3333', 10);
export const HOST = process.env.HOST ?? '0.0.0.0';

const defaultStaticDir = path.resolve(__dirname, '../../web/dist');
export const STATIC_DIR = process.env.STATIC_DIR ?? defaultStaticDir;

export function hasStaticBundle(): boolean {
  return fs.existsSync(STATIC_DIR);
}
