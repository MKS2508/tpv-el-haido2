import { Elysia } from 'elysia';
import { openapi } from '@elysiajs/openapi';
import { cors } from '@elysiajs/cors';
import { licenseRoutes } from './routes/license.js';
import { adminRoutes } from './routes/admin.js';
import { apiLogger } from './lib/logger.js';
import { LicenseErrorCode } from './lib/error-codes.js';

/**
 * License Server Main Entry Point
 *
 * Provides license validation and management API with:
 * - OpenAPI documentation at /openapi
 * - CORS support for cross-origin requests
 * - Structured logging with better-logger
 * - Result pattern error handling
 * - Bearer token authentication for admin routes
 */

const PORT = Number.parseInt(process.env.PORT || '3002', 10);

const app = new Elysia()
  .use(
    openapi({
      path: '/openapi',
      documentation: {
        info: {
          title: 'License Server API',
          version: '1.0.0',
          description: `License validation and management server for TPV El Haido.

## Features
- License key validation with machine fingerprinting
- Admin API for license management
- Health check endpoint
- OpenAPI documentation

## Authentication
Admin endpoints require Bearer token authentication. Set the \`ADMIN_TOKEN\` environment variable.`
        },
        tags: [
          { name: 'Health', description: 'Health check endpoints' },
          { name: 'License', description: 'Public license validation endpoints' },
          { name: 'Admin', description: 'Admin-only license management endpoints' }
        ]
      }
    })
  )
  .use(
    cors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  )

  /**
   * Request logging middleware
   * Logs all incoming requests with method and URL
   */
  .onBeforeHandle(({ request }) => {
    apiLogger.info(`${request.method} ${request.url}`, {
      method: request.method,
      url: request.url
    });
  })

  /**
   * Global error handler
   * Catches all errors and returns consistent error responses
   */
  .onError(({ code, error, set }) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    apiLogger.error('Request error', { code, error: errorMessage });

    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        error: 'Validation Error',
        code: LicenseErrorCode.InvalidKeyFormat,
        details: (error as { all?: unknown }).all
      };
    }

    set.status = 500;
    return {
      error: 'Internal Server Error',
      code: LicenseErrorCode.InternalError,
      message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    };
  })

  /**
   * Route registration
   */
  .use(licenseRoutes)
  .use(adminRoutes)

  /**
   * Root endpoint
   * Provides basic server information
   */
  .get('/', () => {
    return {
      name: 'License Server',
      version: '1.0.0',
      documentation: '/openapi',
      health: '/api/license/health'
    };
  })

  /**
   * Start server
   */
  .listen(PORT);

apiLogger.success('License Server started', {
  url: `http://localhost:${PORT}`,
  docs: `http://localhost:${PORT}/openapi`,
  health: `http://localhost:${PORT}/api/license/health`,
  environment: process.env.NODE_ENV || 'development'
});

export default app;
