# CHANGE_IMPACT_GUIDE
## High-impact change areas
- `modals/user/user.ts`, `modals/permission/permission.ts`, `modals/userPermission/userPermission.ts`: changes affect auth, permission checks, and user detail retrieval.
- `middleware/auth/verifyToken.ts`, `utils/sessionManager.ts`, `modals/userSession/userSession.ts`: changes affect all authenticated API access and session enforcement.
- `middleware/permission.ts`: changes affect access control across all protected endpoints.
- `middleware/syncdatabase.ts`: adding or removing models or changing sync order can impact schema creation and foreign-key constraints at startup.

## Router and controller changes
- Modifying router base paths or method signatures requires client updates.
- Renaming routes like `/create`, `/update/:id`, `/delete/:id`, or `/status` must be coordinated with API consumers.
- Changes to `controller/userController/userCtr.ts` impact registration, login, refresh, logout, and user info APIs directly.

## Data model changes
- Common cross-entity fields such as `CompanyId`, `user_id`, `permissionId`, `item_id`, `warehouseId`, and `godownId` are shared across many models; changing their semantics is high risk.
- Changes to audit fields like `created_by` or `isActive` should be reviewed in both controller logic and logger workflow.

## Logging and audit impacts
- `SystemLogger` tracks non-GET calls, so create/update/delete behavior changes may require logging updates.
- If new entities are introduced, add them to log metadata resolution and confirm `company_id` can be resolved for log entries.

## Deployment and runtime considerations
- Database schema changes are not managed via migrations in this codebase; apply schema updates carefully.
- Critical environment variables include `JWT_SECRET`, DB credentials, and server port.

## When to consult code directly
- If you change controller logic for `User`, `Company`, `Permission`, or `Inventory`, inspect routes, permissions, and session behavior.
- If you add or remove fields used in extracted metadata, verify search/filter, CSV import, and report paths.

## Not Determined From Code
- Exact impact on reporting, approval workflows, or external integrations is not specified in the available source.
- Any non-Express orchestration outside the analyzed modules is not covered here.