/**
 * AdSync — Unified Production Server Entrypoint for cPanel Phusion Passenger
 *
 * Boots both Next.js App Router Frontend and Express API Router
 * on the single assigned cPanel port with zero proxy bottlenecks.
 */

const path = require('path');
const { pathToFileURL } = require('url');
const express = require('express');
const next = require('next');
const dotenv = require('dotenv');

// 1. Load Environment Configuration
dotenv.config({ path: path.resolve(__dirname, 'backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Flag embedded server mode
process.env.EMBEDDED_SERVER = 'true';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, dir: path.resolve(__dirname, 'frontend') });
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 3000;

app.prepare().then(async () => {
  const server = express();

  // 2. Attach Express API routes from backend
  try {
    const backendFileUrl = pathToFileURL(path.resolve(__dirname, 'backend/dist/index.js')).href;
    const backendModule = await import(backendFileUrl);
    if (backendModule && backendModule.default) {
      server.use(backendModule.default);
      console.log('✓ AdSync Express API routes successfully attached');
    }
  } catch (err) {
    console.error('Fatal: Error attaching backend API module:', err);
  }

  // 2.5 Auto-Setup Route for cPanel users (generates Prisma client via browser)
  server.get('/api/setup', (req, res) => {
    const { exec } = require('child_process');
    exec('npx prisma generate --schema=backend/prisma/schema.prisma', (error, stdout, stderr) => {
      if (error) {
        return res.status(500).send(`<pre>Error: ${error.message}\n${stderr}</pre>`);
      }
      res.send(`<h3>Prisma Client Generated Successfully!</h3><pre>${stdout}</pre><p>Please go back to cPanel and click <b>Restart Application</b>, then your app will work perfectly.</p>`);
    });
  });

  // 3. Next.js handles all frontend pages and SSR
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`🚀 AdSync SaaS is running live on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
