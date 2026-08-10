# BUSINESS_RULES
## Authentication & session management
- Login requires both `Email` and `Password` and rejects inactive users.
- Passwords are hashed using `bcryptjs` before storage.
- Login generates a JWT valid for 7 days and a refresh token valid for 15 days.
- Sessions are persisted in `UserSession` and must be active plus unexpired for token validation.
- `logout` invalidates the current session token.

## Authorization
- Permissions are checked per `module` and `action` using `middleware/permission.ts`.
- `superadmin` users bypass module/action checks automatically.
- Missing permission returns HTTP 403 with an explicit denial message.

## Registration & user onboarding
- The registration flow creates a `superadmin` and assigns all existing permissions to that user.
- Duplicate email registration is blocked.

## CRUD and transactional behavior
- Most master and transactional entities expose standard CRUD endpoints (`create`, `get`, `update`, `delete`).
- Some flows expose additional endpoints like `/status` for state changes, CSV import/export, and `getSingle/:id` for detail retrieval.
- Non-GET operations are candidates for system logging via `SystemLogger`.

## Data sync and schema management
- The application uses Sequelize `.sync()` at startup rather than migrations.
- `middleware/syncdatabase.ts` orders model sync calls, indicating dependencies and schema creation order.

## Audit and logging
- `middleware/systemLogger.ts` logs create, update, and delete actions.
- Logging captures changed fields, request metadata, user details, and company context when resolvable.
- Logs are skipped if company resolution fails to avoid validation errors.

## Inferred business rules
- Major entities are scoped under company, user, inventory, purchase, sales, and master data domains.
- `CompanyId` / `company_id` are core scoping keys across models.
- `user_id` fields track ownership and audit information.

## Not Determined From Code
- Exact pricing, stock reservation, approval workflow, and report computation rules were not explicitly extracted.
- Specific validation schemas for all endpoints are not fully visible from the extracted metadata.
- Business-specific consequences of status changes and stock expiry are not guaranteed without additional domain code.