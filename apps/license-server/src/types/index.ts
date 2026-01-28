export interface LicenseValidationRequest {
  key: string;
  email: string;
  machine_fingerprint: string;
}

export interface LicenseValidationResponse {
  valid: boolean;
  expires_at?: number;
  user_email: string;
  license_type: string;
  error?: string;
}

export interface CreateLicenseRequest {
  email: string;
  license_type: "basic" | "pro" | "enterprise";
  expires_in_days?: number;
}

export interface CreateLicenseResponse {
  key: string;
  key_hash: string;
  email: string;
  license_type: string;
  expires_at?: number;
}
