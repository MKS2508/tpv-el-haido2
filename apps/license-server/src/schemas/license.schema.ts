import { t } from 'elysia';
import type { TSchema } from '@elysiajs/typebox';

/**
 * TypeBox schemas for License Server API validation
 * These schemas provide runtime validation and OpenAPI documentation
 */

/**
 * License type enum
 */
export const LicenseTypeSchema = t.Union([
  t.Literal('basic'),
  t.Literal('pro'),
  t.Literal('enterprise')
]);

/**
 * Health check response schema
 */
export const HealthCheckResponseSchema = t.Object({
  status: t.Literal('ok'),
  service: t.String(),
  timestamp: t.Number(),
  version: t.String()
});

/**
 * License validation request schema
 */
export const ValidateLicenseRequestSchema = t.Object({
  key: t.String({
    pattern: '^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$',
    error: 'Key must be in XXXX-XXXX-XXXX-XXXX format'
  }),
  email: t.String({
    format: 'email',
    error: 'Email must be a valid email address'
  }),
  machine_fingerprint: t.String({
    minLength: 1,
    error: 'Machine fingerprint is required'
  })
});

/**
 * License validation response schema
 */
export const ValidateLicenseResponseSchema = t.Object({
  valid: t.Boolean(),
  expires_at: t.Optional(t.Number()),
  user_email: t.String(),
  license_type: LicenseTypeSchema,
  error: t.Optional(t.String()),
  code: t.Optional(t.String())
});

/**
 * Create license request schema
 */
export const CreateLicenseRequestSchema = t.Object({
  email: t.String({
    format: 'email',
    error: 'Email must be a valid email address'
  }),
  license_type: LicenseTypeSchema,
  expires_in_days: t.Optional(t.Number({
    minimum: 1,
    error: 'Expiration days must be at least 1'
  }))
});

/**
 * Create license response schema
 */
export const CreateLicenseResponseSchema = t.Object({
  key: t.String(),
  key_hash: t.String(),
  email: t.String(),
  license_type: LicenseTypeSchema,
  expires_at: t.Optional(t.Number())
});

/**
 * License list item schema
 */
export const LicenseListItemSchema = t.Object({
  id: t.Number(),
  email: t.String(),
  license_type: LicenseTypeSchema,
  expires_at: t.Optional(t.Number()),
  is_active: t.Boolean(),
  activation_count: t.Number(),
  created_at: t.Number()
});

/**
 * Error response schema
 */
export const ErrorResponseSchema = t.Object({
  error: t.String(),
  code: t.Optional(t.String()),
  message: t.Optional(t.String()),
  details: t.Optional(t.Any())
});

/**
 * Success response schema
 */
export const SuccessResponseSchema = t.Object({
  success: t.Boolean()
});

/**
 * License ID parameter schema
 */
export const LicenseIdParamSchema = t.Object({
  id: t.Number({
    error: 'License ID must be a number'
  })
});

/**
 * Email parameter schema
 */
export const EmailParamSchema = t.Object({
  email: t.String({
    format: 'email',
    error: 'Email must be a valid email address'
  })
});
