import crypto from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ADMIN_PASSWORD, ADMIN_SESSION_SECRET, IS_PRODUCTION } from './env';

const ADMIN_COOKIE_NAME = 'qlt_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  exp: number;
};

export function isAdminConfigured(): boolean {
  return Boolean(ADMIN_PASSWORD && ADMIN_SESSION_SECRET);
}

export function verifyAdminPassword(password: string): boolean {
  if (!ADMIN_PASSWORD) {
    return false;
  }

  const expected = Buffer.from(ADMIN_PASSWORD);
  const provided = Buffer.from(password);
  if (expected.length !== provided.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, provided);
}

export function createAdminSessionCookie(): string {
  if (!isAdminConfigured()) {
    throw new Error('Admin authentication is not configured');
  }

  const payload: SessionPayload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = signPayload(encodedPayload);

  return serializeCookie(`${encodedPayload}.${signature}`, SESSION_TTL_SECONDS);
}

export function clearAdminSessionCookie(): string {
  return serializeCookie('', 0);
}

export function isAdminAuthenticated(request: FastifyRequest): boolean {
  if (!isAdminConfigured()) {
    return false;
  }

  const token = parseCookies(request.headers.cookie ?? '')[ADMIN_COOKIE_NAME];
  if (!token) {
    return false;
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(encodedPayload);
  const expected = Buffer.from(expectedSignature);
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length) {
    return false;
  }
  if (!crypto.timingSafeEqual(expected, provided)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SessionPayload;
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function requireAdminAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!isAdminConfigured()) {
    await reply.status(503).send({ message: 'Admin authentication is not configured' });
    return;
  }

  if (!isAdminAuthenticated(request)) {
    await reply.status(401).send({ message: 'Admin authentication required' });
  }
}

function signPayload(payload: string): string {
  if (!ADMIN_SESSION_SECRET) {
    throw new Error('ADMIN_SESSION_SECRET is required');
  }

  return crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(payload).digest('base64url');
}

function serializeCookie(value: string, maxAge: number): string {
  return `${ADMIN_COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${
    IS_PRODUCTION ? '; Secure' : ''
  }`;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, cookie) => {
      const separatorIndex = cookie.indexOf('=');
      if (separatorIndex === -1) {
        return accumulator;
      }
      accumulator[cookie.slice(0, separatorIndex)] = cookie.slice(separatorIndex + 1);
      return accumulator;
    }, {});
}
