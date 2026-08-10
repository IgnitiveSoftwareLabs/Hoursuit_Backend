# PROJECT_CONTEXT
## Overview
- Backend service built with Express 5 and TypeScript.
- PostgreSQL database accessed through Sequelize ORM (`dbconfig/dbconfig.ts`).
- Application bootstrap in `src/index.ts`, which authenticates DB, syncs schema, and starts the HTTP server.
- Modular folder layout: `router/`, `controller/`, `modals/`, `middleware/`, `utils/`, `dbconfig/`.

## Key Architectural Layers
- `router/` exposes REST endpoints grouped by entity domain.
- `controller/` contains business logic for entity CRUD, file uploads, import/export, and reports.
- `modals/` defines Sequelize entities and associations; `middleware/syncdatabase.ts` registers models and calls `.sync()` to create schema.
- `middleware/auth/` handles JWT creation and verification plus session validation.
- `middleware/permission.ts` enforces module/action access rules against `Permission` and `User` associations.
- `middleware/systemLogger.ts` captures non-GET operations and persists audit logs to `SystemLog`.

## Authentication & Session Flow
- `controller/userController/userCtr.ts` supports registration, login, refresh token, logout, and user info retrieval.
- Authentication uses JWT tokens signed with `process.env.JWT_SECRET` and refresh tokens issued from `middleware/auth/generateToken.ts`.
- `middleware/auth/verifyToken.ts` requires `Authorization: Bearer <token>`, verifies the JWT, and checks `UserSession` for active, non-expired sessions.
- `utils/sessionManager.ts` creates sessions, invalidates prior sessions for single-device behavior, and stores metadata such as device info and IP address.

## Authorization & Permissions
- `middleware/permission.ts` loads a user and included `Permission` records filtered by module/action.
- `superadmin` users bypass permission checks automatically.
- Missing permission returns HTTP 403 Forbidden.

## Data & Audit Patterns
- Many models use `CompanyId`, `user_id`, `created_by`, and similar foreign-key-style fields for tenant/company context and audit.
- `SystemLogger` logs create, update, and delete events for non-GET operations when company context can be resolved.
- `middleware/syncdatabase.ts` registers core models first, followed by master data, inventory, purchase, and sales models.

## Primary Domains
- Master data: company, currency, subsidiary, warehouse, godown, stack, state, city, transportation mode, UOM, HSN/SAC, service category, service type, item group, vendor, category, work category, item, customer, permission.
- User & access control: user, user session, permission, user permissions, token.
- Inventory & transactions: inventory, purchase order, purchase invoice, GRN, purchase return, quality report, sales order, delivery challan, sales return.
- Attachments and system logs: attachment, system logs.

## API Surface
- The router registry mounts entity routers under base paths in `router/index.ts`.
- Typical mounted base paths include:
  - `/user` -> `userRouter`
  - `/permission` -> `permissionRouter`
  - `/company` -> `companyRouter`
  - `/customer` -> `customerRouter`
  - `/warehouse` -> `warehouseRouter`
  - `/uom` -> `uomRouter`
  - `/currencies` -> `currencyRouter`
  - `/subsidiary` -> `subsidiaryRouter`
  - `/states` -> `stateRouter`
  - `/cities` -> `cityRouter`
  - `/category` -> `categoryRouter`
  - `/item-group` -> `itemGroupRouter`
  - `/item` -> `itemRouter`
  - `/pan-availibility` -> `panAvailibilityRouter`
  - `/registration-type` -> `registrationTypeRouter`
  - `/payment-method` -> `paymentMethodRouter`
  - `/permission` -> `permissionRouter`
  - `/work-category` -> `workCategoryRouter`
  - `/transportation-modes` -> `transportationModeRouter`
  - `/service-categories` -> `serviceCategoryRouter`
  - `/service-types` -> `serviceTypeRouter`
  - `/commodity` -> `commodityRouter`
  - `/vendor` -> `vendorRouter`
  - `/hsn-sac` -> `hsnRouter`
  - `/inventory` -> `inventoryRouter`
  - `/sales-order` -> `salesOrderRouter`
  - `/delivery-challan` -> `deliveryChallanRouter`
  - `/sales-return` -> `salesReturnRouter`
  - `/purchase-order` -> `purchaseOrderRouter`
  - `/purchase-invoice` -> `purchaseInvoiceRouter`
  - `/grn` -> `grnRouter`
  - `/purchase-return` -> `purchaseReturnRouter`
  - `/quality-report` -> `qualityReportRouter`
  - `/godown` -> `godownRouter`
  - `/stack` -> `StackRouter`
  - `/permission` -> `PermissionRouter`

## Not Determined From Code
- Exact Sequelize associations (`belongsTo`, `hasMany`, etc.) are not fully inferable from analyzed files.
- Business-specific validation rules and report definitions are not completely extractable from code alone.
- External integrations or cron-like jobs outside the visible source are not covered here.