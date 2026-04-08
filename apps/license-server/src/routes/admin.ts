import { Elysia, t } from 'elysia';
import { bearer } from '@elysiajs/bearer';
import { LicenseService } from '../services/license.service.js';
import {
  CreateLicenseRequestSchema,
  CreateLicenseResponseSchema,
  LicenseListItemSchema,
  SuccessResponseSchema,
  ErrorResponseSchema,
  LicenseIdParamSchema,
  EmailParamSchema
} from '../schemas/license.schema.js';
import { adminLogger, apiLogger } from '../lib/logger.js';

/**
 * Admin authentication token
 * In production, this should come from environment variables
 */
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-secret-token-change-me';

/**
 * Debug mode flag
 * When enabled, allows "test" as a valid bearer token for development
 */
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';
const DEBUG_TOKEN = 'test';

/**
 * Admin routes for license management
 * All endpoints require Bearer token authentication
 */
export const adminRoutes = new Elysia({ prefix: '/api/admin' })
  .use(bearer())

  /**
   * Authentication guard
   * Validates bearer token before processing any admin request
   * In DEBUG_MODE, accepts "test" as a valid token
   */
  .onBeforeHandle(({ bearer, set }) => {
    const isValidToken = bearer === ADMIN_TOKEN || (DEBUG_MODE && bearer === DEBUG_TOKEN);

    if (!isValidToken) {
      adminLogger.warn('Unauthorized admin access attempt');

      set.status = 401;

      return {
        error: 'Unauthorized',
        message: 'Invalid or missing admin token'
      } as const;
    }

    if (DEBUG_MODE && bearer === DEBUG_TOKEN) {
      adminLogger.info('Debug mode authentication used');
    }

    // Return undefined to continue to next handler
    return undefined;
  })

  /**
   * List all licenses
   * Returns all licenses in the system ordered by creation date
   */
  .get(
    '/licenses',
    async () => {
      adminLogger.info('Admin: listing all licenses');

      const result = await LicenseService.listLicenses();

      if (!result.ok) {
        return {
          error: 'Failed to retrieve licenses',
          code: result.error.code
        } as const;
      }

      return result.value;
    },
    {
      response: t.Union([t.Array(LicenseListItemSchema), ErrorResponseSchema]),
      detail: {
        summary: 'List all licenses',
        description: 'Returns all licenses in the system ordered by creation date (newest first)',
        tags: ['Admin']
      }
    }
  )

  /**
   * Create a new license
   * Generates a unique license key and stores it in the database
   */
  .post(
    '/licenses',
    async ({ body, set }) => {
      adminLogger.info('Admin: creating license', { email: body.email });

      const result = await LicenseService.createLicense({
        email: body.email,
        license_type: body.license_type,
        expires_in_days: body.expires_in_days
      });

      if (!result.ok) {
        set.status = 400;
        return {
          error: result.error.message,
          code: result.error.code
        };
      }

      return result.value;
    },
    {
      body: CreateLicenseRequestSchema,
      response: t.Union([CreateLicenseResponseSchema, ErrorResponseSchema]),
      detail: {
        summary: 'Create license',
        description:
          'Creates a new license with the specified email and type. Optionally sets an expiration date.',
        tags: ['Admin']
      }
    }
  )

  /**
   * Revoke a license
   * Deactivates a license, making it invalid for validation
   */
  .post(
    '/licenses/:id/revoke',
    async ({ params }) => {
      adminLogger.info('Admin: revoking license', { id: params.id });

      const result = await LicenseService.revokeLicense(params.id);

      if (!result.ok) {
        return {
          success: false,
          error: result.error.message,
          code: result.error.code
        };
      }

      return { success: result.value };
    },
    {
      params: LicenseIdParamSchema,
      response: t.Union([SuccessResponseSchema, ErrorResponseSchema]),
      detail: {
        summary: 'Revoke license',
        description:
          'Revokes a license by setting its active status to false. The license will no longer pass validation.',
        tags: ['Admin']
      }
    }
  )

  /**
   * Reactivate a license
   * Reactivates a previously revoked license
   */
  .post(
    '/licenses/:id/reactivate',
    async ({ params }) => {
      adminLogger.info('Admin: reactivating license', { id: params.id });

      const result = await LicenseService.reactivateLicense(params.id);

      if (!result.ok) {
        return {
          success: false,
          error: result.error.message,
          code: result.error.code
        };
      }

      return { success: result.value };
    },
    {
      params: LicenseIdParamSchema,
      response: t.Union([SuccessResponseSchema, ErrorResponseSchema]),
      detail: {
        summary: 'Reactivate license',
        description:
          'Reactivates a previously revoked license by setting its active status to true.',
        tags: ['Admin']
      }
    }
  )

  /**
   * Get licenses by email
   * Returns all licenses associated with a specific email address
   */
  .get(
    '/licenses/email/:email',
    async ({ params }) => {
      adminLogger.info('Admin: retrieving licenses by email', { email: params.email });

      const result = await LicenseService.getLicensesByEmail(params.email);

      if (!result.ok) {
        return {
          error: 'Failed to retrieve licenses',
          code: result.error.code
        } as const;
      }

      return result.value;
    },
    {
      params: EmailParamSchema,
      response: t.Union([t.Array(LicenseListItemSchema), ErrorResponseSchema]),
      detail: {
        summary: 'Get licenses by email',
        description: 'Returns all licenses associated with the specified email address.',
        tags: ['Admin']
      }
    }
  );
