import { Elysia, t } from 'elysia';
import { LicenseService } from '../services/license.service.js';
import {
  ValidateLicenseRequestSchema,
  ValidateLicenseResponseSchema,
  HealthCheckResponseSchema,
  ErrorResponseSchema
} from '../schemas/license.schema.js';
import { apiLogger } from '../lib/logger.js';

/**
 * Public license routes
 * Provides endpoints for license validation and health checks
 * No authentication required
 */
export const licenseRoutes = new Elysia({ prefix: '/api/license' })

  /**
   * Health check endpoint
   * Returns server status and version information
   */
  .get(
    '/health',
    () => {
      return {
        status: 'ok' as const,
        service: 'license-server',
        timestamp: Date.now(),
        version: '1.0.0'
      };
    },
    {
      response: HealthCheckResponseSchema,
      detail: {
        summary: 'Health check',
        description: 'Returns server status and version information',
        tags: ['Health']
      }
    }
  )

  /**
   * License validation endpoint
   * Validates a license key and returns license details if valid
   */
  .post(
    '/validate',
    async ({ body }) => {
      apiLogger.info('License validation request', { email: body.email });

      const result = await LicenseService.validateLicense({
        key: body.key,
        email: body.email,
        machine_fingerprint: body.machine_fingerprint
      });

      if (!result.ok) {
        apiLogger.error('Validation failed', result.error);
        return {
          valid: false,
          error: 'Internal server error',
          code: result.error.code
        };
      }

      return result.value;
    },
    {
      body: ValidateLicenseRequestSchema,
      response: t.Union([ValidateLicenseResponseSchema, ErrorResponseSchema]),
      detail: {
        summary: 'Validate license',
        description:
          'Validates a license key against database and business rules. Returns license details if valid, or error information if invalid.',
        tags: ['License']
      }
    }
  );
