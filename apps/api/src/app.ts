import Fastify, {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest
} from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import { ZodTypeProvider, validatorCompiler, serializerCompiler } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  IngestionService,
  LeaderboardService,
  getPrismaClient
} from '@archeryleague/core';
import {
  clearAdminSessionCookie,
  createAdminSessionCookie,
  isAdminAuthenticated,
  isAdminConfigured,
  requireAdminAuth,
  verifyAdminPassword
} from './adminAuth';
import { hasStaticBundle, STATIC_DIR } from './env';

const ingestionService = new IngestionService();
const leaderboardService = new LeaderboardService();
const prisma = getPrismaClient();

const IdParamSchema = z.object({ id: z.coerce.number() });
const CanonicalLinkBodySchema = z.object({
  archerId: z.coerce.number(),
  canonicalArcherId: z.coerce.number()
});
const CanonicalUnlinkBodySchema = z.object({
  archerId: z.coerce.number()
});
const AdminLoginBodySchema = z.object({
  password: z.string().min(1)
});

export async function buildServer(): Promise<FastifyInstance> {
  const base = Fastify({ logger: true });
  const app = base.withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') ?? true
  });

  await app.register(helmet, { contentSecurityPolicy: false });

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  app.post(
    '/api/tournaments/:id/sync',
    {
      preHandler: requireAdminAuth,
      schema: {
        params: IdParamSchema,
        response: {
          202: z.object({
            tournamentId: z.number(),
            eventIds: z.array(z.number()),
            syncedAt: z.string()
          })
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = IdParamSchema.parse(request.params);
      const result = await ingestionService.syncTournament(id);
      return reply.code(202).send({
        tournamentId: result.tournamentId,
        eventIds: result.eventIds,
        syncedAt: result.syncedAt.toISOString()
      });
    }
  );

  app.post(
    '/api/tournaments/sync-all',
    {
      preHandler: requireAdminAuth,
      schema: {
        response: {
          202: z.object({
            tournamentIds: z.array(z.number()),
            syncedTournamentCount: z.number(),
            syncedEventCount: z.number(),
            syncedAt: z.string()
          })
        }
      }
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const result = await ingestionService.syncAllTrackedTournaments();
      return reply.code(202).send({
        tournamentIds: result.tournamentIds,
        syncedTournamentCount: result.syncedTournamentCount,
        syncedEventCount: result.syncedEventCount,
        syncedAt: result.syncedAt.toISOString()
      });
    }
  );

  app.delete(
    '/api/tournaments/:id',
    {
      preHandler: requireAdminAuth,
      schema: {
        params: IdParamSchema
      }
    },
    async (request: FastifyRequest) => {
      const { id } = IdParamSchema.parse(request.params);
      return ingestionService.deleteTournament(id);
    }
  );

  app.post(
    '/api/events/:id/sync',
    {
      preHandler: requireAdminAuth,
      schema: {
        params: IdParamSchema.extend({ id: z.coerce.number() }),
        querystring: z.object({ tournamentId: z.coerce.number().optional() }),
        response: {
          202: z.object({
            eventId: z.number(),
            participants: z.number(),
            scores: z.number(),
            syncedAt: z.string()
          })
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = IdParamSchema.parse(request.params);
      const { tournamentId } = z.object({ tournamentId: z.coerce.number().optional() }).parse(
        request.query
      );
      const result = await ingestionService.syncEvent(id, { tournamentId });
      return reply.code(202).send({
        eventId: result.eventId,
        participants: result.participants,
        scores: result.scores,
        syncedAt: result.syncedAt.toISOString()
      });
    }
  );

  app.get(
    '/api/admin/session',
    async (request: FastifyRequest) => {
      return {
        authenticated: isAdminAuthenticated(request),
        configured: isAdminConfigured()
      };
    }
  );

  app.post(
    '/api/admin/login',
    {
      schema: {
        body: AdminLoginBodySchema
      }
    },
    async (
      request: FastifyRequest<{
        Body: z.infer<typeof AdminLoginBodySchema>;
      }>,
      reply: FastifyReply
    ) => {
      if (!isAdminConfigured()) {
        return reply.status(503).send({ message: 'Admin authentication is not configured' });
      }

      if (!verifyAdminPassword(request.body.password)) {
        return reply.status(401).send({ message: 'Invalid admin password' });
      }

      reply.header('Set-Cookie', createAdminSessionCookie());
      return reply.send({ authenticated: true, configured: true });
    }
  );

  app.post(
    '/api/admin/logout',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      reply.header('Set-Cookie', clearAdminSessionCookie());
      return reply.send({
        authenticated: false,
        configured: isAdminConfigured()
      });
    }
  );

  app.get(
    '/api/tournaments/:id/leaderboard',
    {
      schema: {
        params: IdParamSchema
      }
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof IdParamSchema> }>) => {
      const { id } = request.params;
      return leaderboardService.getTournamentLeaderboard(id);
    }
  );

  app.get(
    '/api/events/:id/leaderboard',
    {
      schema: {
        params: IdParamSchema
      }
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof IdParamSchema> }>) => {
      const { id } = request.params;
      return leaderboardService.getEventLeaderboard(id);
    }
  );

  app.get(
    '/api/archers/:id',
    {
      schema: {
        params: IdParamSchema,
        querystring: z.object({ tournamentId: z.coerce.number().optional() })
      }
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof IdParamSchema>;
        Querystring: { tournamentId?: number };
      }>
    ) => {
      const { id } = request.params;
      const { tournamentId } = request.query;
      return leaderboardService.getArcherProfile(id, tournamentId);
    }
  );

  app.get(
    '/api/canonical-archers/:id',
    {
      schema: {
        params: IdParamSchema
      }
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof IdParamSchema> }>) => {
      const { id } = request.params;
      return leaderboardService.getCanonicalArcherProfile(id);
    }
  );

  app.get(
    '/api/admin/canonical-archers/suspicious',
    {
      preHandler: requireAdminAuth
    },
    async () => {
      return ingestionService.listSuspiciousCanonicalArchers();
    }
  );

  app.get(
    '/api/admin/canonical-archers/:id/inspect',
    {
      preHandler: requireAdminAuth,
      schema: {
        params: IdParamSchema
      }
    },
    async (request: FastifyRequest) => {
      const { id } = IdParamSchema.parse(request.params);
      return ingestionService.inspectCanonicalArcher(id);
    }
  );

  app.post(
    '/api/admin/canonical-archers/link',
    {
      preHandler: requireAdminAuth,
      schema: {
        body: CanonicalLinkBodySchema
      }
    },
    async (request: FastifyRequest) => {
      const { archerId, canonicalArcherId } = CanonicalLinkBodySchema.parse(request.body);
      return ingestionService.assignArcherToCanonical(archerId, canonicalArcherId);
    }
  );

  app.post(
    '/api/admin/canonical-archers/unlink',
    {
      preHandler: requireAdminAuth,
      schema: {
        body: CanonicalUnlinkBodySchema
      }
    },
    async (request: FastifyRequest) => {
      const { archerId } = CanonicalUnlinkBodySchema.parse(request.body);
      return ingestionService.detachArcherFromCanonical(archerId);
    }
  );

  app.get(
    '/api/tournaments/:id/events',
    {
      schema: {
        params: IdParamSchema
      }
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof IdParamSchema> }>) => {
      const { id } = request.params;
      const events = await prisma.event.findMany({
        where: { tournamentId: id },
        orderBy: [{ displayOrder: 'asc' as const }, { id: 'asc' as const }],
        select: {
          id: true,
          name: true,
          displayOrder: true,
          lastSyncedAt: true,
          updatedAt: true
        }
      });
      return events;
    }
  );

  app.get('/api/tournaments', async () => {
    const tournaments = await prisma.tournament.findMany({
      orderBy: { startDate: 'desc' as const },
      select: {
        id: true,
        name: true,
        location: true,
        startDate: true,
        endDate: true,
        lastSyncedAt: true
      }
    });
    return tournaments;
  });

  if (hasStaticBundle()) {
    await app.register(fastifyStatic, {
      root: STATIC_DIR,
      prefix: '/' // serve built web assets
    });

    app.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
      const accept = request.headers.accept ?? '';
      if (request.method === 'GET' && accept.includes('text/html')) {
        return reply.sendFile('index.html');
      }
      return reply.code(404).send({ message: 'Not Found' });
    });
  }

  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error({ err: error }, 'unhandled error');
    const statusCode = error.statusCode ?? 500;
    reply.status(statusCode).send({ message: error.message ?? 'Internal Server Error' });
  });

  return app;
}
