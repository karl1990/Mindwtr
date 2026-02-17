# Cloud Deployment

This page is an operations-focused companion to [[Cloud Sync]]. It covers how to run the `apps/cloud` server reliably in production-like self-hosted environments.

## Scope

- Mindwtr Cloud is a lightweight JSON sync service, not a full hosted app UI.
- It is best for single-tenant or small trusted deployments.
- You should run it behind HTTPS reverse proxying and standard server hardening controls.

## Deployment Topology

Recommended layout:

1. Reverse proxy (`nginx`, `caddy`, `traefik`) terminates TLS.
2. Cloud server container/process listens on private interface.
3. Persistent volume stores `MINDWTR_CLOUD_DATA_DIR`.
4. Regular backups snapshot the data directory.

## Environment Baseline

Minimum production baseline:

- `MINDWTR_CLOUD_AUTH_TOKENS` set to one or more strong tokens.
- `MINDWTR_CLOUD_CORS_ORIGIN` set to your exact client origin.
- `MINDWTR_CLOUD_DATA_DIR` mounted to persistent storage.
- `MINDWTR_CLOUD_MAX_BODY_BYTES` and `MINDWTR_CLOUD_MAX_ATTACHMENT_BYTES` tuned for your usage.

Optional but useful:

- `MINDWTR_CLOUD_RATE_WINDOW_MS`
- `MINDWTR_CLOUD_RATE_MAX`
- `MINDWTR_CLOUD_ATTACHMENT_RATE_MAX`

## Docker Runbook

Example `docker-compose.yml` service:

```yaml
services:
  mindwtr-cloud:
    image: oven/bun:1.3
    working_dir: /app
    command: ["bun", "run", "src/server.ts", "--host", "0.0.0.0", "--port", "8787"]
    environment:
      MINDWTR_CLOUD_DATA_DIR: /data
      MINDWTR_CLOUD_AUTH_TOKENS: ${MINDWTR_CLOUD_AUTH_TOKENS}
      MINDWTR_CLOUD_CORS_ORIGIN: https://mindwtr.example.com
      MINDWTR_CLOUD_RATE_MAX: "120"
      MINDWTR_CLOUD_ATTACHMENT_RATE_MAX: "120"
    volumes:
      - ./apps/cloud:/app
      - ./mindwtr-cloud-data:/data
    restart: unless-stopped
```

Operational notes:

- Pin the Bun image tag instead of floating latest for stable upgrades.
- Mount `/data` on durable disk, not ephemeral container FS.
- Keep tokens in secrets manager or `.env` outside git.

## Reverse Proxy Checklist

At proxy layer:

- Enforce HTTPS.
- Limit request body size to match cloud limits.
- Forward `Authorization` header unchanged.
- Set request timeout high enough for large attachment uploads.
- Restrict access by IP/VPN if possible.

Example nginx snippets:

```nginx
client_max_body_size 50m;
proxy_read_timeout 120s;
proxy_send_timeout 120s;
proxy_set_header Authorization $http_authorization;
```

## Backups and Restore

Data format is file-per-token JSON plus attachment files.

Backup:

1. Snapshot or archive `MINDWTR_CLOUD_DATA_DIR`.
2. Keep point-in-time backups (daily + weekly retention).
3. Verify restore periodically.

Restore:

1. Stop server.
2. Restore directory contents to `MINDWTR_CLOUD_DATA_DIR`.
3. Start server.
4. Check `GET /health` and run a client sync validation.

## Upgrade Procedure

Safe rolling procedure:

1. Take backup.
2. Deploy new version in staging or canary first.
3. Run smoke checks:
   - `GET /health`
   - authenticated `GET /v1/data`
   - small and large attachment upload/download
4. Deploy to production.
5. Monitor logs for `rate limit`, `invalid payload`, and `permission denied` errors.

## Token Rotation

Recommended rotation flow:

1. Add new token to `MINDWTR_CLOUD_AUTH_TOKENS` alongside old token.
2. Update clients to new token.
3. Remove old token after migration window.

Because token hash maps namespace/file, changing token changes storage namespace. If you require continuity under a new token, migrate corresponding data file/attachment directory deliberately.

## Observability

The cloud server writes structured JSON logs to stdout/stderr.

Minimum log alerts:

- Repeated `Unauthorized`
- Frequent `Rate limit exceeded`
- `Cloud data directory is not writable`
- `Invalid remote sync payload`

Add host/container metrics:

- CPU and memory
- disk free space on data volume
- p95 request latency
- non-2xx response rate

## Failure Modes

- Permission errors: volume ownership/permissions mismatch.
- CORS failures: wrong `MINDWTR_CLOUD_CORS_ORIGIN`.
- Token mismatch: client token not in allowlist.
- Large payload failures: body limits exceeded at proxy or app layer.

## Related Pages

- [[Cloud Sync]]
- [[Data and Sync]]
- [[Docker Deployment]]
