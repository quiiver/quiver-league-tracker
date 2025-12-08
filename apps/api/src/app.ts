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
import { hasStaticBundle, STATIC_DIR } from './env';

const ingestionService = new IngestionService();
const leaderboardService = new LeaderboardService();
const prisma = getPrismaClient();

const IdParamSchema = z.object({ id: z.coerce.number() });

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
    async (
      request: FastifyRequest<{ Params: z.infer<typeof IdParamSchema> }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const result = await ingestionService.syncTournament(id);
      return reply.code(202).send({
        tournamentId: result.tournamentId,
        eventIds: result.eventIds,
        syncedAt: result.syncedAt.toISOString()
      });
    }
  );

  app.post(
    '/api/events/:id/sync',
    {
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
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof IdParamSchema>;
        Querystring: { tournamentId?: number };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const { tournamentId } = request.query;
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
