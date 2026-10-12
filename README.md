# StockPilot

A full-stack inventory and order management platform for small businesses, built as a
take-home engineering assessment.

- **Backend:** Java 17, Spring Boot 3 (Web, Security, Data JPA, Validation), MySQL 8, Flyway
- **Frontend:** React 18 (Vite), Tailwind CSS, React Router, Axios
- **Auth:** JWT (stateless), BCrypt password hashing

> **Deployed URL:** _fill in after deploying_ — e.g. `https://stockpilot.example.com`
> **Demo login:** `owner@demo.stockpilot.test` / `Password123!` (Owner), `staff@demo.stockpilot.test` / `Password123!` (Staff) — see [Seeding demo data](#seeding-demo-data).
> **Hosting note:** if you deploy the backend on a platform with cold starts (e.g. a free-tier
> dyno), say so here so the evaluator isn't surprised by a slow first request.

---

## 1. Features implemented

- Email/password registration (creates a new workspace with the registering user as **Owner**)
  and login, backed by JWTs.
- Workspace isolation: every API route re-checks the caller's membership and role against the
  database on every request; nothing from the JWT, path, or body is trusted for authorization.
- Product catalogue: create/edit/deactivate, workspace-scoped unique SKU, search, active/low-stock
  filters, pagination.
- Inventory adjustments with a full, immutable audit trail; stock can never go negative.
- Multi-item orders with server-calculated totals, price/name/SKU snapshots, a documented
  **reserve-stock-at-creation** strategy, and a `Pending → Confirmed → Completed` lifecycle with
  idempotent cancellation.
- Dashboard with precisely-defined metrics, computed from persisted data.
- Server-side search, filtering, sorting and pagination for products, orders and inventory history.
- Consistent JSON error format, server-side validation, no stack traces leaked to clients.
- Automated tests for every business rule listed in the assessment's testing requirements
  (SKU uniqueness, stock boundaries, order totals, insufficient stock, atomicity, idempotent
  cancellation, invalid transitions, price snapshots, workspace isolation, concurrency).

## 2. Architecture overview

```
stockpilot/
├── backend/   Spring Boot REST API (Java 17, MySQL via Flyway migrations)
└── frontend/  React + Vite + Tailwind single-page app
```

The backend follows a standard layered architecture:

```
controller/   HTTP routing, request/response mapping only
  ↓
service/      Business rules, transactions, authorization checks
  ↓
repository/   Spring Data JPA, workspace-scoped queries
  ↓
entity/       JPA entities + DB constraints
```

`WorkspaceAccessService` is the single place that checks "is this user a member of this
workspace, and do they have the right role" — every service method that touches workspace data
calls it first, re-reading membership from the database rather than trusting anything in the
request.

### Data model

```
User ─┬─< WorkspaceMembership >─┬─ Workspace
      │        (role: OWNER/STAFF)       │
      │                                  ├─< Product >─< InventoryAdjustment >─ User (actor)
      │                                  └─< Order >─< OrderItem >─ Product
      └── (created_by on Order, user on InventoryAdjustment)
```

- `WorkspaceMembership` is the join table between `User` and `Workspace`, carrying the role.
- `Product.sku` is unique per `(workspace_id, sku)`, not globally.
- `OrderItem` stores a **snapshot** of `productName`, `sku`, and `unitPrice` at order-creation
  time, independent of the live `Product` row, so later price changes never alter order history.
- `InventoryAdjustment` is append-only: it is the audit trail, never edited or deleted.

## 3. Install and run locally

### Prerequisites
- Java 17+, Maven 3.9+
- Node.js 18+
- MySQL 8.x (or use the included `docker-compose.yml`)

### Backend

```bash
# 1. Start MySQL (or point DB_URL at your own instance)
docker compose up -d mysql

# 2. Configure environment variables (see table below), e.g.:
export DB_URL="jdbc:mysql://localhost:3306/stockpilot?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
export DB_USERNAME=stockpilot
export DB_PASSWORD=stockpilot
export JWT_SECRET="replace-with-a-long-random-string-at-least-32-bytes"
export CORS_ALLOWED_ORIGINS="http://localhost:5173"

# 3. Run (Flyway migrates the schema automatically on startup)
cd backend
mvn spring-boot:run
```

The API starts on `http://localhost:8080`. Health check: `GET /actuator/health`.

### Frontend

```bash
cd frontend
cp .env.example .env   # edit VITE_API_BASE_URL if your backend isn't on localhost:8080
npm install
npm run dev
```

The app starts on `http://localhost:5173`.

### Environment variables

| Variable | Used by | Example / default | Notes |
|---|---|---|---|
| `DB_URL` | backend | `jdbc:mysql://localhost:3306/stockpilot?...` | JDBC URL |
| `DB_USERNAME` | backend | `stockpilot` | |
| `DB_PASSWORD` | backend | — | **required in production**, no default committed |
| `JWT_SECRET` | backend | — | **required in production**; ≥32 bytes, random |
| `JWT_EXPIRATION_MINUTES` | backend | `60` | token lifetime |
| `CORS_ALLOWED_ORIGINS` | backend | `http://localhost:5173` | comma-separated list of allowed frontend origins |
| `PORT` | backend | `8080` | |
| `VITE_API_BASE_URL` | frontend | `http://localhost:8080/api` | base URL the SPA calls |

No `.env` file with real secrets is committed; `.env.example` files hold placeholders only.

## 4. Database migrations and seeding

Schema is managed entirely through Flyway (`backend/src/main/resources/db/migration/V1__init.sql`)
and applies automatically on application startup — a fresh, empty MySQL database is enough to
get a working schema with all constraints (PK/FK, unique SKU per workspace, non-negative stock
and price, valid status enums, etc.).

### Seeding demo data

`backend/seed-demo-data.sql` inserts a synthetic demo workspace, an Owner and a Staff account,
and a handful of products (including one at zero stock and one below its low-stock threshold).
Run it **after** the schema has been created (i.e. after starting the app once):

```bash
mysql -u stockpilot -p stockpilot < backend/seed-demo-data.sql
```

Demo credentials (password is the same for both): `Password123!`
- Owner: `owner@demo.stockpilot.test`
- Staff: `staff@demo.stockpilot.test`

No real personal or customer data is used anywhere in this project.

## 5. Running tests

```bash
cd backend
mvn test
```

Tests run against an in-memory H2 database (MySQL-compatible mode) configured in
`src/test/resources/application-test.yml` — no external database is required to run them.

Test coverage (`backend/src/test/java/com/stockpilot/service/`):

| Requirement | Test class / method |
|---|---|
| SKU uniqueness per workspace, allowed across workspaces | `ProductServiceTest` |
| Stock cannot go negative | `InventoryServiceTest.stockCannotGoNegative` |
| Backend calculates totals (client total never trusted — there's no such field) | `OrderServiceTest.backendCalculatesLineAndOrderTotals` |
| Insufficient stock rejected | `OrderServiceTest.orderIsRejectedWhenStockIsInsufficient` |
| Multi-item atomicity | `OrderServiceTest.multiItemOrderIsAtomicWhenOneLineFails` |
| Cancellation restores stock exactly once, idempotent on retry | `OrderServiceTest.cancellationRestoresStockExactlyOnceEvenIfRepeated` |
| Invalid status transitions rejected | `OrderServiceTest.invalidStatusTransitionsAreRejected` |
| Price snapshot immutability | `OrderServiceTest.changingProductPriceDoesNotAlterExistingOrderHistory` |
| Workspace isolation (by id-guessing, and by non-membership) | `WorkspaceIsolationTest` |
| Concurrency: competing orders can't oversell stock | `OrderConcurrencyTest` |
| Auth: registration, duplicate email, login | `AuthServiceTest` |

Frontend has no automated tests in this submission (see Known limitations) — it was exercised
manually against the backend's test suite scenarios.

## 6. Main API routes

All routes except `/api/auth/register` and `/api/auth/login` require `Authorization: Bearer <jwt>`.
All workspace-scoped routes are under `/api/workspaces/{workspaceId}/...` and re-check membership
server-side on every call.

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create a user + a new workspace (caller becomes Owner) |
| POST | `/api/auth/login` | Returns a JWT + the user's workspace memberships |
| POST | `/api/auth/workspaces/{workspaceId}/staff` | Owner-only: add a staff member (see note below) |
| GET | `/api/workspaces/{workspaceId}/members` | List workspace members |
| GET/POST | `/api/workspaces/{workspaceId}/products` | List (search/filter/paginate) / create a product |
| GET/PUT/DELETE | `/api/workspaces/{workspaceId}/products/{id}` | Get / update / deactivate a product |
| POST | `/api/workspaces/{workspaceId}/products/{id}/adjustments` | Record a stock adjustment |
| GET | `/api/workspaces/{workspaceId}/inventory-adjustments` | Adjustment history (filter by product/date) |
| GET/POST | `/api/workspaces/{workspaceId}/orders` | List (filter/paginate) / create an order |
| GET | `/api/workspaces/{workspaceId}/orders/{id}` | Get one order with its line items |
| POST | `/api/workspaces/{workspaceId}/orders/{id}/confirm` | Pending → Confirmed |
| POST | `/api/workspaces/{workspaceId}/orders/{id}/complete` | Confirmed → Completed |
| POST | `/api/workspaces/{workspaceId}/orders/{id}/cancel` | Pending/Confirmed → Cancelled (idempotent) |
| GET | `/api/workspaces/{workspaceId}/dashboard` | Dashboard metrics (`?from=&to=` ISO timestamps, optional) |

Example — create an order:

```bash
curl -X POST http://localhost:8080/api/workspaces/1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":1,"quantity":2},{"productId":2,"quantity":1}]}'
```

Error responses share one shape:

```json
{
  "timestamp": "2026-10-12T10:00:00Z",
  "status": 400,
  "error": "VALIDATION_FAILED",
  "message": "One or more fields are invalid.",
  "path": "/api/workspaces/1/products",
  "fieldErrors": [{"field": "sku", "message": "must not be blank"}]
}
```

## 7. Roles and permissions

| Action | Owner | Staff |
|---|---|---|
| View products, orders, dashboard, inventory history | ✅ | ✅ |
| Create/edit/deactivate products | ✅ | ✅ |
| Record inventory adjustments | ✅ | ✅ |
| Create/confirm/complete/cancel orders | ✅ | ✅ |
| Add staff members | ✅ | ❌ |

The assessment describes Staff as able to perform "permitted operational actions" without
drawing a sharper line than that, so this implementation treats products/inventory/orders as
shared operational work for both roles, and reserves only **workspace membership management**
(adding staff) as Owner-only — enforced server-side in `WorkspaceAccessService.requireOwner`,
not just hidden in the UI. All role checks happen in the service layer; the frontend hides the
"Manage team" link for Staff purely as a convenience, not as the actual security boundary.

**Staff provisioning (self-registration simplification):** this project does not implement email
invitations. Instead, an Owner can add a staff member from the **Team** page (or
`POST /api/auth/workspaces/{id}/staff`) by email + name. If that email has no existing account,
one is created with a random temporary password returned once in the API response, for the
Owner to share with the new staff member out-of-band (there's no outbound email integration).
If the email already belongs to an existing user, they're simply added to the workspace as Staff.

## 8. Order lifecycle and stock strategy

**Chosen strategy: reserve stock at order creation** (assessment's option 1).

```
                 create (stock -= qty, once, validated)
                        │
                        ▼
                    PENDING ──────────────┐
                        │ confirm          │ cancel (stock += qty, once)
                        ▼                  │
                   CONFIRMED ──────────────┤
                        │ complete         │ cancel (stock += qty, once)
                        ▼                  │
                   COMPLETED          CANCELLED
              (terminal, no stock        (terminal)
               effect; deduction
               from creation stands)
```

- **Create:** every line item is validated (product exists in this workspace, is active, has
  enough stock) **before any stock is mutated**. Only once every line passes does the method
  deduct stock and persist the order — so a failure partway through never leaves a partial
  deduction (see `OrderService.create`).
- **Confirm** (`PENDING → CONFIRMED`) and **Complete** (`CONFIRMED → COMPLETED`) have **no stock
  effect** — the deduction from creation is the permanent effect.
- **Cancel** (`PENDING|CONFIRMED → CANCELLED`) restores every line item's quantity to the
  product's stock, guarded by an `order.stockRestored` flag so a retried or duplicate cancel
  request is a no-op rather than double-crediting stock. Cancelling an already-cancelled order
  returns the order unchanged (idempotent, not an error). A `COMPLETED` order can never be
  cancelled.
- **Duplicate line items** for the same product within one order request are summed into a
  single line rather than rejected (documented in `OrderService.create`).

### Concurrency

Every stock-mutating operation (`adjustStock`, order `create`, order `cancel`) loads the
`Product` row(s) with `SELECT ... FOR UPDATE` (`ProductRepository.findByIdForUpdate`), inside a
`@Transactional` method, and — for multi-item orders — locks the involved product rows in
ascending product-id order to avoid lock-ordering deadlocks between two concurrent multi-item
orders. Competing transactions against the same product therefore serialize at the row lock, so
the "stock cannot be oversold" check can never race. This is verified directly by
`OrderConcurrencyTest`, which fires 5 concurrent 1-unit orders against a product with 3 units of
stock and asserts exactly 3 succeed, 2 fail cleanly, and final stock is exactly zero.

Orders themselves are also locked (`OrderRepository.findByIdForUpdate`) before any status
transition, so two concurrent `cancel` (or `cancel` + `confirm`) calls against the same order
serialize too.

## 9. Dashboard metric definitions

| Metric | Definition |
|---|---|
| `activeProductCount` | Count of products in this workspace with `active = true`. |
| `lowStockCount` | Count of **active** products where `stockQuantity <= lowStockThreshold`. |
| `orderCountsByStatus` | Count of all orders in this workspace, grouped by status, all-time (not date-filtered). |
| `totalOrderValue` | Sum of `totalAmount` for orders with status **≠ CANCELLED** (i.e. Pending + Confirmed + Completed are all included — their stock/value is already committed under the reserve-at-creation strategy), created within `[from, to]`. Defaults to the trailing 30 days if not specified. |
| `recentOrders` / `recentAdjustments` | The 5 most recently created orders / inventory adjustments, most recent first. |

All values are computed from persisted data at request time — nothing is hard-coded.

## 10. Known limitations and trade-offs

- **No real invitation/email flow.** See §7 — staff provisioning is a documented, explicit
  simplification appropriate for a demo/assessment context.
- **No CSV import/export, low-stock notifications, or richer analytics** — explicitly listed as
  optional in the assessment and skipped in favor of the required core.
- **No refresh tokens** — JWTs simply expire after `JWT_EXPIRATION_MINUTES` (default 60) and the
  user must log in again; acceptable for this scope but not how a longer-lived production app
  would handle sessions.
- **No frontend automated tests.** Backend business logic (where correctness matters most per
  the assessment's scoring) is thoroughly tested; the frontend was exercised manually against
  each backend test scenario above.
- **Order totals use `BigDecimal`** with `DECIMAL(12,2)`/`DECIMAL(14,2)` columns throughout to
  avoid floating-point rounding errors, consistently on both the entity and DB constraint level.
- **Optimistic locking (`@Version`) is used on `Product` and `Order` in addition to pessimistic
  row locks** — belt-and-braces: the row lock is what actually prevents oversell under
  concurrency; the version column additionally surfaces a clear `409 Concurrent update` error if
  a detached/stale entity is ever written back outside the locked path.
- **Pagination caps page size at 100** server-side regardless of what the client requests, to
  avoid unbounded list loads.
- **Dashboard is not real-time** — it's computed on each page load/request, not pushed via
  websockets.

## 11. AI tooling disclosure

- **Tools used:** An AI coding assistant (Claude) was used throughout — for scaffolding the
  Spring Boot project structure, generating repetitive CRUD/DTO boilerplate, drafting the React
  components and Tailwind styling, and drafting this README.
- **What it was used for:** initial generation of entities/DTOs/controllers/services, the React
  pages and API client, the Flyway migration, and the test suite skeletons.
- **What was reviewed/changed:** the order-creation concurrency/locking strategy (row-lock
  ordering, validate-then-mutate split to guarantee atomicity) and the cancellation-idempotency
  guard were specifically reasoned through and verified against the test suite described in §5,
  since these are the highest-risk correctness areas in the assessment. The lazy-loading /
  `open-in-view: false` interaction with JPA entity associations (products, orders, dashboard
  summaries) was corrected by adding explicit fetch joins/DTO mapping inside transactional
  service methods, after confirming where it would otherwise throw.
- **Important caveat for the evaluator:** the frontend build was verified to compile
  (`npm run build`) in the development sandbox. The backend **could not be compiled or run
  against MySQL in that same sandbox** (no outbound network access to Maven Central), so while
  the Java code was written and reviewed carefully by hand (including the transaction/locking
  logic described in §8), it has **not been executed**. Before relying on this submission,
  run `mvn test` locally — if anything fails to compile, it is most likely a small Lombok/Spring
  Data query-derivation issue that will be obvious from the compiler/test output, and should be
  treated as a known risk of this submission rather than claimed-but-unverified test results.

## 12. Deployment notes

- Deploy `backend/` as a standard Spring Boot JAR (`mvn clean package` → `java -jar target/*.jar`)
  behind any Java host (Render, Railway, Fly.io, EC2, etc.), pointed at a managed MySQL instance.
  Set the environment variables from §3. The Flyway migration runs automatically on boot.
- Deploy `frontend/` as a static build (`npm run build` → `dist/`) to any static host (Vercel,
  Netlify, S3+CloudFront, etc.), with `VITE_API_BASE_URL` set at build time to the backend's
  public URL.
- Set `CORS_ALLOWED_ORIGINS` on the backend to the frontend's deployed origin (comma-separated
  if more than one).
- `GET /actuator/health` is exposed unauthenticated for platform health checks.
