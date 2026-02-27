# Operations Runbook

## Environments
- `development`: local development.
- `staging`: production-like validation, mandatory before production deploy.
- `production`: customer-facing.

## Pre-Deploy
1. Sync env vars from `.env.example` for each backend.
2. Run:
   - `cd property-rental-backend && npm run test && npm run security:audit`
   - `cd property-rental-admin/backend && npm run test && npm run security:audit`
   - `cd property-rental-ui && npm run build`
   - `cd property-rental-admin/frontend && npm run build`
3. Verify staging health:
   - `GET /health`
   - `GET /ready`
4. Smoke critical flows in staging:
   - login/logout/refresh
   - booking create overlap rejection
   - payment idempotent retries
   - admin revenue dashboard

## Deploy
1. Deploy backend services first, then frontend.
2. Confirm startup logs do not show missing env validation errors.
3. Confirm `health` and `ready` endpoints are green.

## Rollback
1. Roll back to previous app version in platform.
2. If issue is data related, disable writes (maintenance mode) before DB restore.
3. Re-run health checks and restore traffic.

## Backup Strategy
- Database backups:
  - daily full snapshot
  - hourly point-in-time oplog (or provider equivalent)
- Retention:
  - daily snapshots: 14 days
  - weekly snapshots: 8 weeks
  - monthly snapshots: 6 months

## Restore Drill (Quarterly)
1. Restore latest snapshot to temporary staging DB.
2. Run app against restored DB.
3. Verify:
   - user counts
   - booking/payment counts
   - index existence
4. Record RTO/RPO and remediation items.

## Incident Severity
- `SEV-1`: login/payment outage or data corruption risk.
- `SEV-2`: major feature degraded with workaround.
- `SEV-3`: minor degradation/no data risk.

## On-Call Actions (SEV-1)
1. Acknowledge incident and open timeline.
2. Triage logs by `X-Request-Id`.
3. Mitigate (rollback, disable feature flag, or throttle write traffic).
4. Post incident summary with root cause and prevention tasks.
