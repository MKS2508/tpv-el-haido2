import { Elysia, t } from "elysia";
import { LicenseService } from "../services/license.service.ts";
import type { CreateLicenseRequest, CreateLicenseResponse } from "../types/index.ts";

export const adminRoutes = new Elysia({ prefix: "/api/admin" })
  .get("/licenses", () => {
    return LicenseService.listLicenses();
  })

  .post("/licenses", async ({ body }: { body: CreateLicenseRequest }) => {
    const { key, keyHash } = LicenseService.createLicense(
      body.email,
      body.license_type,
      body.expires_in_days
    );

    const response: CreateLicenseResponse = {
      key,
      key_hash: keyHash,
      email: body.email,
      license_type: body.license_type,
      expires_at: body.expires_in_days
        ? Math.floor(Date.now() / 1000) + (body.expires_in_days * 24 * 60 * 60)
        : undefined
    };

    return response;
  }, {
    body: t.Object({
      email: t.String({ format: "email" }),
      license_type: t.Union([t.Literal("basic"), t.Literal("pro"), t.Literal("enterprise")]),
      expires_in_days: t.Optional(t.Number())
    })
  })

  .post("/licenses/:id/revoke", async ({ params }: { params: { id: string } }) => {
    const success = LicenseService.revokeLicense(parseInt(params.id));
    return { success };
  })

  .post("/licenses/:id/reactivate", async ({ params }: { params: { id: string } }) => {
    const success = LicenseService.reactivateLicense(parseInt(params.id));
    return { success };
  })

  .get("/licenses/:email", async ({ params }: { params: { email: string } }) => {
    return LicenseService.getLicensesByEmail(params.email);
  });
