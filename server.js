import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dev = process.env.NODE_ENV !== 'production';
const standalonePath = path.join(__dirname, '.next', 'standalone', 'server.js');

async function bootstrap() {
  // If production standalone build exists, run the standalone server
  if (!dev && fs.existsSync(standalonePath)) {
    await import(standalonePath);
    return;
  }

  const port = parseInt(process.env.PORT || '3000', 10);
  const hostname = process.env.HOSTNAME || '0.0.0.0';
  const { default: next } = await import('next');
  const { createServer } = await import('node:http');
  const { parse } = await import('node:url');

  const app = next({
    dev,
    hostname,
    port,
    dir: __dirname,
  });
  const handle = app.getRequestHandler();

  try {
    await app.prepare();

    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error handling request:', req.url, err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      }
    });

    server.once('error', (err) => {
      console.error('Fatal server startup error:', err);
      process.exit(1);
    });

    // Graceful termination for Cloud Run container lifecycle
    const handleShutdown = (signal) => {
      console.log(`Received ${signal}, closing HTTP server gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
      // Force shutdown after 10s if connections linger
      setTimeout(() => {
        console.error('Forced shutdown timeout reached.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

    server.listen(port, hostname, () => {
      console.log(`> [Write Frankly] Production server listening on http://${hostname}:${port}`);
    });
  } catch (err) {
    console.error('Failed to bootstrap application server:', err);
    process.exit(1);
  }
}

bootstrap();

