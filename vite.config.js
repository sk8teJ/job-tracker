import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { onRequest } from './functions/api/import-vacancy.js';

function careerDeskApi() {
  return {
    name: 'careerdesk-local-api',
    configureServer(server) {
      server.middlewares.use('/api/import-vacancy', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Используй POST-запрос.' }));
          return;
        }
        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const body = Buffer.concat(chunks);
          const request = new Request('http://localhost/api/import-vacancy', {
            method: 'POST',
            headers: { 'content-type': req.headers['content-type'] || 'application/json' },
            body
          });
          const response = await onRequest({ request, env: {} });
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: error?.message || 'Ошибка локального API.' }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), careerDeskApi()]
});
