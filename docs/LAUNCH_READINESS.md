# Launch Readiness Checklist

## 1) Security Hardening
- [x] Security headers enabled on user and admin APIs.
- [x] Global and auth-specific rate limiting added.
- [x] Request body size limits configured.
- [x] CORS allow-list handling (no implicit wildcard in production).
- [x] Basic payload validation for auth endpoints.
- [ ] Periodic dependency audit in CI (`npm run security:audit`).
- [ ] WAF/CDN and DDoS controls configured at hosting layer.

## 2) Auth/Session Reliability
- [x] Disabled-user protection in auth middleware.
- [x] Refresh token flow implemented (`/api/auth/refresh-token`).
- [x] Logout invalidates stored refresh token hash.
- [x] Frontend stores refresh token and attempts session refresh on startup.
- [ ] Add automatic token refresh interceptor before request expiration.

## 3) Payment Safety
- [x] Idempotent create payment support (`Idempotency-Key` or body fallback).
- [x] Billing-period de-duplication for pending/paid payment requests.
- [ ] Add external payment provider reconciliation job and alerting.

## 4) Data Integrity & Migrations
- [x] Added critical indexes (booking overlap query, payment period uniqueness, notifications).
- [x] Added env examples and startup env validation.
- [ ] Run index creation and verify in staging before prod rollout.
- [ ] Add migration script for existing payment documents missing `billingPeriodKey`.

## 5) Test Coverage
- [x] Added backend and admin smoke unit tests for KPI math.
- [ ] Add API integration tests for:
  - booking overlap rejection
  - payment idempotency
  - refresh token lifecycle
  - dashboard KPI payload contract

## 6) Observability
- [x] Structured request logs with request IDs in both backends.
- [x] `/health` and `/ready` endpoints added.
- [x] Centralized 404/error handlers with request ID response.
- [ ] Connect logs to alerting and incident channels.

## 7) Performance Guardrails
- [x] Pagination for notifications API.
- [x] Pagination for message fetch API.
- [x] Query-oriented indexes for frequent filters/sorts.
- [ ] Add cache headers/caching for read-heavy public endpoints.

## 8) Deployment Readiness
- [x] Readiness/health endpoints available for platform probes.
- [x] Env validation on startup prevents misconfigured deploys.
- [x] Runbook added for deploy/rollback/backup.
- [ ] Blue-green or canary release strategy configured.
