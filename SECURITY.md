# Sling API security model

This is the enforcement surface for Sling’s governed AI CMS. It is not a SOC 2 or ISO report.

## Tenant isolation

Every widget, theme, layout, and audit read is scoped to `client_id`.

Studio JWT maps `client_id` to the signed-in user’s email (or the `client` header if email is absent). Requests without a resolvable `clientId` are rejected. There is no `demo-id` fallback on authenticated routes.

Storefront calls use `setClientFE`: `client` + `license` must match `client_meta`, or a preview host + preview secret must resolve to that tenant. A cannot list, get, update, delete, review, or publish B’s widgets, theme, or layout.

## Review before publish

AI widgets are created as `draft`. Status cannot be flipped to `published` on create or update.

The only live path is: submit-for-review → review approve → publish.

`POST /v1/frontend/getWidgets` (storefront registry) always queries `status=published` for that `clientId`. Draft, pending_review, rejected, and approved widgets do not appear on the storefront.

Review and publish require the `reviewWidgets` right (admin).

## Server-side code policy

The same bans Studio already checks (`window`, `document`, `eval`, `Function`, `fetch`, `localStorage`, and the rest of the isolated-preview list) run on the API.

Save as published and publish are rejected when violations exist. Draft save may keep the widget so the author can fix it; `policyViolations` is stored on the document. Submit-for-review and publish re-check the current code.

Runtime AI widget code is not allowed to fetch or eval. That does not mean the Node process itself has a clean npm tree.

## Audit log

Collection `audit_log`. Fields: `client_id`, `actorUserId`, `action`, `resourceType`, `resourceId`, `metadata`, `createdAt`.

Written on: `widget.generate`, `widget.save`, `widget.submit_review`, `widget.approve`, `widget.reject`, `widget.publish`, `theme.update`.

`GET /v1/audit` requires JWT and returns this `clientId` only.

## How Google / JWT maps to `client_id`

Studio signs in with Google (or email/password). The API verifies a JWT (`passport-jwt`). `req.clientId` is `user.email`, which is the tenant key used on widgets, `theme_config`, layout, and audit.

This is Google sign-in plus JWT, not SAML/OIDC federation or a customer IdP.

## What this does not cover

Known npm / Dependabot findings are tracked in GitHub and are not burned down here. Runtime AI widget code still cannot `fetch` or `eval`.

`sling-ai` `/widget/generate` is an unauthenticated helper. Persistence, policy, review, and publish are enforced on this API.

This document does not claim SOC 2, ISO 27001, or a completed vulnerability burn-down.
