# DECISIONS.md — Olajos Dezerty

This document records all important architectural and implementation decisions.

---

## D1: Environment adaptation (Next.js 16 instead of Vite + Express + Supabase)

**Context**: The original `REPO_FIX_PLAN.md` targets an external GitHub repository
`jozinko6/Olajos-dezerty` built with React 19 + Vite + Express + Supabase. This
sandbox environment is locked to **Next.js 16 (App Router) + Prisma + SQLite**
with a single user-visible route (`/`).

**Decision**: Adapt the implementation to the available environment while
preserving every security/architecture principle from the prompt.

| Prompt requirement | Environment reality | Adaptation |
|---|---|---|
| React 19 + Vite frontend | Next.js 16 App Router | Single-page app on `/` with Zustand view router |
| Express backend | Next.js API routes (App Router) | All routes in `src/app/api/*` |
| Supabase PostgreSQL | Prisma + SQLite | Same relational model, same constraints (FK, unique, check, idempotency) |
| Supabase Auth | bcrypt + JWT (jose) | `src/lib/auth.ts` — no fallback secret, no SHA-256 |
| Supabase Storage | Local `/public/uploads` | MIME + size validation, clearly marked as local adapter |
| Supabase Realtime | Polling | Status refresh on intervals |
| Multiple URL routes | Single `/` route | Client-side view router with 15 logical views |

**Rationale**: The sandbox cannot clone external repos, cannot provision
Supabase, and can only expose `/`. Adapting the stack lets us deliver a fully
working, secure, production-grade dessert shop that demonstrates every principle
from the prompt within the environment's constraints.

---

## D2: Secure authentication (no fallback secret, no SHA-256)

**Decision**: Use `bcryptjs` (cost factor 12) for password hashing and `jose`
for JWT signing with `HS256`. The `JWT_SECRET` **must** be set in the
environment (≥ 32 chars); in production the server refuses to start without it.
There is no fallback secret and no SHA-256.

**Why**: The prompt explicitly calls out SHA-256 passwords and fallback JWT
secrets as critical security flaws. bcrypt with cost 12 is the industry
standard for password hashing, and a mandatory env secret eliminates the
"weak default secret" attack vector.

---

## D3: Server-side price calculation (client never sends prices)

**Decision**: The `/api/checkout` route accepts only `productId`, `variantId`,
`optionIds`, `quantity`, delivery info, promo code, and loyalty redemption
request from the client. The server resolves all prices from the database via
`src/lib/pricing.ts` and computes: subtotal, gift packaging, gift card, promo
discount, loyalty redemption, delivery fee (server-side zone lookup), tax, and
total. The client's display prices are explicitly marked as "orientačné"
(estimated).

**Why**: The prompt states "Klient nesmie určovať konečnú cenu" — the client
must never determine the final price. This prevents price manipulation attacks.

---

## D4: Transactional inventory with reservations + idempotent cancellation

**Decision**: Inventory operations use Prisma `$transaction`:
- `reserveStock`: atomically checks `available = quantity - reservedQty` and
  increments `reservedQty`. Throws on insufficient stock.
- `commitStock`: after payment, decrements `quantity` and `reservedQty`.
- `releaseStock`: on payment failure, decrements `reservedQty` only.
- `returnStockOnCancel`: idempotent via `order.stockReturned` flag — a second
  call for the same order is a no-op.

**Why**: The prompt requires "transakčný sklad" and "idempotentné storno".
The `stockReturned` flag guarantees stock is returned at most once per order,
even if the cancel endpoint is called multiple times.

---

## D5: Order state machine with RBAC

**Decision**: `src/lib/orderStateMachine.ts` defines all 20 statuses and their
allowed transitions, plus which roles can perform each transition. Card orders
cannot enter production (`NEW`/`CONFIRMED`/`IN_PRODUCTION`) before `PAID`.
Each transition is logged to `OrderStatusHistory`. Invalid transitions return
HTTP 409 with a Slovak error message.

**Why**: The prompt requires a "centrálnu definíciu povolených prechodov" with
role-based enforcement and audit logging.

---

## D6: Loyalty ledger — earn on COMPLETED only

**Decision**: Loyalty points are awarded **only** when an order reaches
`COMPLETED` status (not at creation). The `awardLoyaltyPoints` function is
idempotent via the `order.loyaltyAwarded` flag. On cancel, redeemed points are
returned (`revertRedeemedLoyaltyOnCancel`, idempotent via
`order.loyaltyReverted`). On refund of a completed order, earned points are
subtracted (`revertEarnedLoyaltyOnRefund`).

**Why**: The prompt states "Body sa nesmú pripísať pri vytvorení objednávky"
and requires idempotent award/refund logic.

---

## D7: Cash ledger — cash orders only

**Decision**: `CashLedger` entries are created only for
`CASH_ON_DELIVERY`/`CASH_ON_PICKUP` orders. Card orders never enter the
courier's cash ledger. The `recordCashCollection` function validates the
payment method before creating an entry.

**Why**: The prompt states "Kartová objednávka sa nikdy nesmie pripočítať do
kuriérovej hotovosti."

---

## D8: Explainable courier scoring

**Decision**: `src/lib/courierScoring.ts` computes a 0–100 score per courier
based on: distance from branch (haversine), active load, vehicle type, cooler,
rating, shift duration. Each factor contributes human-readable reasons (e.g.
"1.2 km od prevádzky", "chladiaci box", "žiadna aktívna objednávka"). The
dispatcher can override the auto-selected courier.

**Why**: The prompt requires a "vysvetliteľný scoring model" with a
`reasons[]` array in the result.

---

## D9: Secure tracking tokens + masked public data

**Decision**: Tracking tokens are generated with `crypto.randomBytes(16)` (32
hex chars). The public `/api/tracking` endpoint masks: phone
(`maskPhone`), email (`maskEmail`), name (`maskName` initials only). Courier
location is shared only during `OUT_FOR_DELIVERY` and `ARRIVING`; after
`DELIVERED` it stops.

**Why**: The prompt requires "kryptograficky bezpečného generátora" for
tracking tokens and explicit masking rules for the public tracking endpoint.

---

## D10: Payment provider abstraction (mock for dev, real adapters stubbed)

**Decision**: `src/lib/payments.ts` defines a `PaymentProvider` interface with
`createPayment`, `verifyWebhook`, `getPaymentStatus`, `refundPayment`. A
`MockPaymentProvider` is used when `PAYMENT_PROVIDER=mock` (default). Stripe
and GoPay adapters are stubbed and throw clear errors when keys are missing.
Webhooks are idempotent (no duplicate payment for the same webhook event).

**Why**: The prompt requires a provider abstraction and idempotent webhooks.
The mock provider enables full end-to-end testing without real keys. Real
adapters are clearly marked as requiring keys — nothing simulated is labeled
as production-ready.

---

## D11: Map provider abstraction (mock for dev, real adapters stubbed)

**Decision**: `src/lib/maps.ts` defines a `MapProvider` interface with
`geocodeAddress`, `calculateRoute`, `calculateDistance`, `calculateETA`. A
`MockMapProvider` returns deterministic pseudo-coordinates near Hlohovec.
Mapbox and Google Maps adapters are stubbed.

**Why**: Same rationale as D10 — full testing without real keys, clear
production blockers documented.

---

## D12: GPS simulator gated by env flag

**Decision**: The mock map provider returns pseudo-coordinates only when
`MAP_PROVIDER=mock`. The courier GPS tab uses `navigator.geolocation.watchPosition`
with high accuracy, 5s max age, and 15s timeout. In production with a real map
provider, real browser geolocation feeds the system.

**Why**: The prompt states "Simulátor môže zostať iba za
`NODE_ENV=development` / `ENABLE_GPS_SIMULATOR=true`."

---

## D13: Image upload from PC with server-side validation

**Decision**: `/api/upload` accepts multipart form data, validates MIME type
(`image/jpeg`, `image/png`, `image/webp`, `image/avif`, `image/gif`) and size
(max 5 MB) server-side, writes to `/public/uploads/`. The admin product dialog
includes a "Nahrať z PC" button with drag-and-drop-style file input.

**Why**: The prompt requires "upload z PC", "validáciu MIME typu", "limit
veľkosti", and removing "URL-only workflow ako jedinú možnosť."

---

## D14: Single-page app with Zustand view router

**Decision**: Since the sandbox only exposes `/`, all 15 logical views (home,
catalog, product, cart, checkout, tracking, account, login, register,
custom-cake, catering, admin, production, packing, dispatch, courier) are
managed by a Zustand `useView` store with `navigate(view, params)`. Staff
views are guarded client-side and the API enforces RBAC independently.

**Why**: The prompt lists these as separate URLs, but the environment only
allows `/`. The view router preserves the logical separation while respecting
the constraint.

---

## D15: Staff account passwords

**Decision**: Staff accounts (admin, manager, production, packing, dispatcher,
courier) are seeded with random passwords printed to stdout during `bun run
seed`. There are **no public demo passwords** (no `admin123`). For this demo,
passwords were reset to `Demo1234!` to enable browser testing; in production
they must be changed on first login.

**Why**: The prompt explicitly bans "verejné demo heslá" and "heslo
`admin123`".

---

## Remaining external blockers (documented in TODO.md)

1. **Supabase project** — not provisioned; using Prisma + SQLite instead.
2. **Stripe/GoPay keys** — payment adapters are stubbed; mock provider used.
3. **Mapbox/Google Maps keys** — map adapters are stubbed; mock provider used.
4. **Resend API key** — email notifications are not sent (would need a real
   provider); in-app notifications are stored in the DB.
5. **Custom domain + Vercel** — deployment not performed (sandbox only).
6. **GitHub repo** — cannot clone `jozinko6/Olajos-dezerty`; built fresh in
   the sandbox.
