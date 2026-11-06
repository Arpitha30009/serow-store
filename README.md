# SEROW clothing store starter

A responsive, minimal storefront concept for men's and women's clothing, built with Next.js, TypeScript and CSS. It includes sample catalog data, category filters, size selection, a working client-side shopping bag, INR pricing, a database schema, and a setup plan for Supabase and Razorpay.

**Important:** this starter is not yet a production-ready store. Checkout intentionally does not charge money. Before launch, connect the catalog and cart to the database, add authentication and admin authorization, implement server-created Razorpay orders plus signature/webhook verification, and test inventory/order edge cases. Sample product listings and image URLs are placeholders.

## Requirements

- Node.js 20.9 or newer
- npm
- Supabase account for database/auth
- Razorpay account for payments (test keys first)
- Vercel or another Node.js host for deployment

## Run locally

1. Extract the ZIP and open a terminal in the `serow-store` folder.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local`. Leave the placeholders until you create your services. Do not commit `.env.local`.
4. Start the dev server:

   ```bash
   npm run dev
   ```

5. Open http://localhost:3000.

## Database setup

1. Create a project at https://supabase.com/.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Add your Supabase URL and publishable key to `.env.local`.
4. Add real products through a secured admin interface (not included yet) or a trusted server-side process. Store prices as integer paise in the database to avoid floating-point currency errors.
5. Configure and test Row Level Security policies before using real customer data.

## Payment setup (required before launch)

1. Create a Razorpay account and use test-mode keys during development.
2. Implement a server endpoint that validates the cart against current database prices and stock, creates a pending order, and creates a Razorpay order server-side.
3. Open Razorpay Checkout using the returned order ID.
4. Verify the payment signature on the server using the secret key. Never trust a success callback in the browser alone.
5. Verify payment status using the API/webhooks, handle duplicate webhook events idempotently, then mark the order paid and decrement stock transactionally.
6. Keep `RAZORPAY_KEY_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` server-only. Never expose either in `NEXT_PUBLIC_*` variables or client code.
7. Complete small-value test payments and failure/cancel/refund tests before requesting live mode.

Official reference: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/build-integration/

## Admin dashboard to implement

- Admin-only sign-in and role checks on every server action/API endpoint.
- Product CRUD, image uploads, sizes/colors, active status and stock.
- Order list and order detail pages with status updates.
- Customer details, shipping workflow, refunds and audit logging.
- Never rely on hiding admin buttons in the UI as access control. Check authorization on the server.

## Deploy

1. Push the code to a private/public Git repository.
2. Import the repository into Vercel.
3. Add production environment variables in Vercel settings; use production Supabase and Razorpay keys only after end-to-end testing.
4. Deploy, attach a domain, enable HTTPS, configure Razorpay webhook URLs, and test the deployed checkout.
5. Publish your shipping, returns/refunds, privacy, terms, contact and business information before accepting real orders.

## Current demo behavior

- Category filters: All / Women / Men
- Size selector per product
- Add-to-bag and quantity updates
- Responsive drawer and INR totals
- Sample products and remote Unsplash photos
- Checkout is intentionally disabled until secure server-side integration is implemented
