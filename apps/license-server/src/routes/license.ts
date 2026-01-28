import { Elysia, t } from "elysia";
import { LicenseService } from "../services/license.service.ts";
import type { LicenseValidationRequest, LicenseValidationResponse } from "../types/index.ts";

export const licenseRoutes = new Elysia({ prefix: "/api/license" })
  .post("/validate", async ({ body }: { body: LicenseValidationRequest }) => {
    try {
      const result = LicenseService.validateLicense(
        body.key,
        body.machine_fingerprint
      );

      const response: LicenseValidationResponse = {
        valid: result.valid,
        user_email: result.userEmail,
        license_type: result.licenseType,
        expires_at: result.expiresAt,
        error: result.error
      };

      return response;
    } catch (error) {
      console.error("Error validating license:", error);
      return {
        valid: false,
        user_email: "",
        license_type: "",
        error: "Internal server error"
      };
    }
  }, {
    body: t.Object({
      key: t.String(),
      email: t.String(),
      machine_fingerprint: t.String()
    })
  })
  .get("/health", () => {
    return { status: "ok", service: "license-server", timestamp: Date.now() };
  });
