import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { runMigrations, seedDatabase } from './server/db';
import { ensureEnvAdminIfConfigured } from './server/auth';
import { registerRoutes } from './server/routes';

dotenv.config();

async function bootstrap() {
  runMigrations();
  seedDatabase();
  ensureEnvAdminIfConfigured();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.set('trust proxy', 1);

  // Security headers aligned with OWASP & AI Studio iframe preview compatibility
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  registerRoutes(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SMKN 3 Probolinggo Portal server running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
