# BRD / Prayag Digital Zone — Next.js website

The whole printing website (customer site, admin panel and production screen), migrated from the plain HTML/JS prototype
in `../public` to **Next.js 16 (App Router)**. The design and behaviour are the same as the prototype.

## Run

```bash
npm install
npm run dev      # development  → http://localhost:4174
npm run build    # production build
npm start        # serve the production build on port 4174
```

Use **View as** (top right) to switch between Customer, Admin and Production.
Data is kept in the browser (localStorage) for now — **Admin → Reset demo data** starts over.

## Routes

Same URLs as the prototype, without the `#`. Old `/#/...` links redirect automatically.

| Page | Route |
|---|---|
| Home | `/` |
| Products (filters, `?cat=`, `?q=`) | `/products` |
| Product configurator | `/product/[id]` |
| Cart / Checkout | `/cart`, `/checkout` |
| Order confirmation / tracking / invoice | `/order/[id]`, `/track/[id]`, `/invoice/[id]` |
| Account (orders, quotes, artwork, support, notifications, profile) | `/account`, `/account/[tab]` |
| Sign in | `/login` |
| Bulk quote, samples, wishlist | `/quote`, `/samples`, `/wishlist` |
| About and info pages | `/page/[slug]` (about, services, contact, faq, privacy, terms, refund, blog, careers) |
| Admin panel | `/admin/[tab]` (dashboard, orders, quotes, products, coupons, payments, customers, support, reports, messages, users, activity, settings) |
| Admin order | `/admin/order/[id]` |
| Production screen | `/production` |

## Structure

```
src/
  app/                    one folder per page (see routes), layout.js, globals.css, not-found.js
  components/
    layout/               Header (nav, View-as menu), Footer, AppShell (#app wrapper, title, redirects)
    ui/                   Icon/Photo, ProductTile, Files (upload, file cards), Status, Overlays (cart drawer, modal, toasts)
    shop/                 Login, NotFound
    admin/                AdminTabs (all admin tabs + order page), OrderTable
  context/StoreProvider.js  loads the saved state, re-renders on change
  hooks/useAnimations.js    GSAP scroll animations
  lib/
    data.js               products, option prices, stages, coupons, staff
    core.js               pricing, GST, coupons, demo data, order status, uploads, load/save
    actions.js            every operation that changes data (cart, checkout, quotes, admin, production)
    session.js            in-memory UI state (filters, configurator, cart drawer, modal) + navigation
public/img/               product photos, hero image, logos
```

## Adding the backend later

All data changes go through `src/lib/actions.js`, and loading/saving through `load()` / `save()` in `src/lib/core.js`.
To move to a real backend (Next.js API routes or server actions + a database), replace those functions with API calls —
the pages and components do not need to change. Payments (Razorpay), email/SMS/WhatsApp and file storage are still simulated.

## Admin panel

- Layout: grouped sidebar (collapsible; drawer on tablets and phones), top bar with global search (order no, customer name, phone), **New order** for walk-in customers, and the **View as** role menu.
- Every count and money figure is defined once in `src/lib/metrics.js` (tested in `tests/metrics.test.mjs`) and used by the Dashboard, Reports, Orders filters, sidebar badges and Production screen:
  - **Jobs in production** = status Design approved → Quality check (3–6), the same on the dashboard and the production screen.
  - **Open orders** = not cancelled and not shipped (0–7). **Late** = open and past its due date.
  - **Revenue received** = payments dated in the period minus refunds dated in the period (by payment date, not order date).
  - **Balance outstanding** = order total minus paid, for orders that are not cancelled.
- List filters live in the URL (`/admin/orders?status=late&pay=balance&from=2026-11-01`), so dashboard cards link straight to the matching list and CSV export downloads exactly the filtered rows.
- Roles (`src/lib/roles.js`): Owner — everything; Front office — orders, walk-in orders, quotations, customers, support; Accounts — payments, refunds, invoices, reports, customers; Production — production screen only, no prices or contact details.
- **Reset demo data** is in Admin → Settings & banners and needs RESET typed to confirm.

## Before going live

The role checks in this prototype run in the browser only. They hide menus and block pages for convenience; **they are not security** — anyone can change the role in “View as” or in browser storage, and all data is in localStorage. Before real customer data goes in:

1. **Real staff login**: accounts with hashed passwords (or Google sign-in), secure HTTP-only session cookies, logout, password reset, lockout after failed attempts, and 2-step verification for the Owner.
2. **Server-side role checks on every request**: each API route / server action checks the session's role (the same table as `roles.js`), not just the page. The Production role must get job data **without** prices, phone, email or address from the server — hiding them in the UI is not enough.
3. **Move data to a database** (replace `load()` / `save()` and `actions.js` with API calls). Today any visitor's browser holds the whole demo store.
4. **Protect uploaded files**: `/api/print/files/<id>` serves any file to anyone who knows the id. Require a staff session (or the owning customer) and use short-lived signed links.
5. **Replace the shared rate key**: Print rates saving uses one `PRINT_ADMIN_KEY` typed in the browser. Tie it to the Owner's login instead.
6. **Audit log on the server**: write the activity log server-side with the real staff member's name, so it cannot be edited from the browser.
7. **Payments**: confirm Razorpay payments with server-side signature / webhook checks; offline “record payment” and refunds should be limited to Owner/Accounts on the server.
8. **Customer login**: real sign-in for customers so order tracking, invoices and artwork are only visible to the owner of the order.
9. HTTPS, rate limiting on login and upload routes, CSRF protection for form posts, and regular database backups.
