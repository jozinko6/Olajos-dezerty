# TODO.md — Olajos Dezerty

Remaining real-world tasks blocked on external resources. Everything else in
the `REPO_FIX_PLAN.md` prompt is implemented within the sandbox environment.

---

## External blockers (require credentials/provisioning)

### 1. Supabase project (production database)
- **What's missing**: A provisioned Supabase project with PostgreSQL.
- **Where it's configured**: `.env` → `DATABASE_URL` (currently Prisma + SQLite).
- **Who must provide it**: The project owner (Olajos Dezerty).
- **Next step**: Create a Supabase project, copy the connection string into
  `DATABASE_URL`, then either switch the Prisma datasource to `postgresql`
  (and run `prisma migrate dev`) or run the migration SQL directly in
  Supabase's SQL editor. The schema in `prisma/schema.prisma` is already
  relational and maps 1:1 to Postgres — only the `datasource` provider needs
  changing from `sqlite` to `postgresql`.

### 2. Payment provider keys (Stripe or GoPay)
- **What's missing**: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`, or
  `GOPAY_CLIENT_ID` + `GOPAY_CLIENT_SECRET` + `GOPAY_GATEWAY_URL`.
- **Where it's configured**: `.env` → `PAYMENT_PROVIDER` and the corresponding
  key vars. Currently `PAYMENT_PROVIDER=mock`.
- **Who must provide it**: The project owner (must register with Stripe/GoPay).
- **Next step**: Set `PAYMENT_PROVIDER=stripe` (or `gopay`) and fill the keys.
  Then implement the real API calls in `src/lib/payments.ts` — the
  `StripePaymentProvider` and `GoPayPaymentProvider` classes already have the
  method signatures; replace the `throw new Error(...)` stubs with real
  `stripe.paymentIntents.create(...)` / GoPay REST calls.

### 3. Map provider key (Mapbox or Google Maps)
- **What's missing**: `MAPBOX_ACCESS_TOKEN` or `GOOGLE_MAPS_API_KEY`.
- **Where it's configured**: `.env` → `MAP_PROVIDER` and the corresponding key.
  Currently `MAP_PROVIDER=mock`.
- **Who must provide it**: The project owner.
- **Next step**: Set `MAP_PROVIDER=mapbox` (or `google`) and fill the key.
  Implement real geocoding/routing calls in `src/lib/maps.ts`. The
  `MapboxMapProvider` / `GoogleMapsProvider` classes have the method signatures.

### 4. Email provider key (Resend)
- **What's missing**: `RESEND_API_KEY` and a verified `EMAIL_FROM` domain.
- **Where it's configured**: `.env` → `RESEND_API_KEY`, `EMAIL_FROM`.
- **Who must provide it**: The project owner.
- **Next step**: Add a `src/lib/email.ts` module that uses Resend to send the
  transactional emails listed in ETAPA 20 of the prompt. The
  `Notification` model already stores in-app notifications; email sending is
  the missing piece.

### 5. Custom domain + Vercel deployment
- **What's missing**: A custom domain (e.g. `olajos-dezerty.sk`) and Vercel
  project linked to the repo.
- **Where it's configured**: Vercel dashboard + DNS.
- **Who must provide it**: The project owner.
- **Next step**: Push the repo to GitHub, import into Vercel, set all env vars
  in the Vercel dashboard, deploy. For Next.js 16 App Router, no
  `vercel.json` is strictly needed; the build output is automatically
  detected.

### 6. GitHub repository sync
- **What's missing**: Push this code to `jozinko6/Olajos-dezerty` (or a fork).
- **Who must provide it**: The repo owner.
- **Next step**: `git init && git add . && git commit -m "feat: production-ready Olajos Dezerty" && git remote add origin <repo> && git push`.

---

## Non-blocked improvements (nice-to-have)

- **CI workflow**: Add `.github/workflows/ci.yml` running `bun run lint`,
  `bun run db:generate`, and a build. (No test framework installed yet — would
  need Vitest.)
- **Unit tests**: Add Vitest + tests for `pricing.ts`, `orderStateMachine.ts`,
  `inventory.ts`, `loyalty.ts`, `courierScoring.ts`.
- **E2E tests**: Add Playwright tests for the 15 E2E scenarios in ETAPA 21.
- **Realtime**: Replace polling with Supabase Realtime subscriptions for
  courier location and order status updates.
- **Storage optimization**: Add Sharp-based WebP/AVIF conversion on upload.
- **Sitemap.xml + robots.txt**: Add dynamic sitemap from products.
- **Audit log UI**: Build an admin audit log viewer.
- **Offer re-assignment flow**: When a courier offer expires, auto-offer to the
  next-best courier (currently the dispatcher must manually re-assign).
