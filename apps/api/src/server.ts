import { buildServer } from './app';
import { HOST, PORT } from './env';

async function start(): Promise<void> {
  try {
    const server = await buildServer();
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`Server running on http://${HOST}:${PORT}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to start server: ${message}`);
    process.exit(1);
  }
}

void start();
