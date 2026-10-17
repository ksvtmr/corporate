/// <reference types="vitest" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Prints a clear message at dev-server start when the configuration cannot
 * work: real-backend mode without a reachable API. Mock mode (the default)
 * needs no external service.
 */
function backendCheck(env: Record<string, string>): Plugin {
  return {
    name: 'iclever-backend-check',
    apply: 'serve',
    configureServer(server) {
      if (env.VITE_USE_MOCK !== 'false') {
        server.config.logger.info('  ➜  API:     built-in Mock API (VITE_USE_MOCK=true), no backend required');
        return;
      }
      const target = env.DEV_API_PROXY_TARGET;
      const base = env.VITE_API_BASE_URL || '/api';
      if (!target && base.startsWith('/')) {
        server.config.logger.error(
          `\n  ✖  VITE_USE_MOCK=false but no backend is configured.\n` +
            `     Set DEV_API_PROXY_TARGET (e.g. http://localhost:8000) in .env.local so "${base}" is proxied,\n` +
            `     or set VITE_USE_MOCK=true to use the built-in Mock API.\n`,
        );
        return;
      }
      const probe = target || base;
      fetch(probe, { signal: AbortSignal.timeout(3000) })
        .then(() => server.config.logger.info(`  ➜  API:     ${probe} is reachable`))
        .catch((err: Error) =>
          server.config.logger.error(
            `\n  ✖  Backend ${probe} is not reachable (${err.message}).\n` +
              `     Start the backend or set VITE_USE_MOCK=true. API calls will fail until it is available.\n`,
          ),
        );
    },
  };
}

export default defineConfig(({ mode }) => {
  // Build stamp: CI sets the commit SHA; it ends up in <meta name="app-version">
  // so the post-deploy smoke test can confirm the new release is live.
  process.env.VITE_APP_VERSION ||= 'dev';
  // Only VITE_* variables are exposed to the browser bundle; DEV_API_PROXY_TARGET
  // stays on the dev server.
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = env.VITE_API_BASE_URL || '/api';
  const proxy =
    env.VITE_USE_MOCK === 'false' && env.DEV_API_PROXY_TARGET && apiBase.startsWith('/')
      ? { [apiBase]: { target: env.DEV_API_PROXY_TARGET, changeOrigin: true } }
      : undefined;

  return {
    base: env.VITE_BASE || '/',
    plugins: [react(), backendCheck(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@iclever/frontend-kit': path.resolve(__dirname, './src/kit'),
      },
    },
    // The dev server listens on localhost only. `npm run dev:lan` opts in to
    // the local network (e.g. to test on a phone); it is never meant to be
    // exposed to the internet — use a preview deployment for that.
    server: {
      port: 5173,
      strictPort: true,
      proxy,
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
    },
  };
});
