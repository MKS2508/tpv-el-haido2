# License Server

Bun + Elysia license validation server for TPV El Haido.

## Setup

```bash
bun install
bun run db:init
bun run db:seed  # Optional: creates test licenses
bun run dev
```

## API Endpoints

### Public API (Port 3002)

- `POST /api/license/validate` - Validate a license key
- `GET /api/license/health` - Health check

### Admin API

- `GET /api/admin/licenses` - List all licenses
- `POST /api/admin/licenses` - Create a new license
- `POST /api/admin/licenses/:id/revoke` - Revoke a license
- `POST /api/admin/licenses/:id/reactivate` - Reactivate a license
- `GET /api/admin/licenses/:email` - Get licenses by email

## License Key Format

XXXX-XXXX-XXXX-XXXX (alphanumeric, case-insensitive)

## License Types

- `basic` - Basic functionality
- `pro` - Professional features
- `enterprise` - Enterprise features
