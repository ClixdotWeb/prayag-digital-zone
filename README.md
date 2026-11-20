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
