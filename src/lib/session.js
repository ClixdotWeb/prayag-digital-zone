// In-memory UI state that lives for the browser session (the prototype kept these as globals):
// product configurator, product filters, quote attachments, checkout delivery method, admin order filter,
// plus the cart drawer and the modal (payment window / shipping label).
import { rerender } from './core';

export const session = {
  cfg: null,                 // { pid, sel, qty, custom, files }
  quoteFiles: [],
  shopFilter: { q: '', cat: '', paper: [], lam: [], max: 0 },
  checkoutMethod: 'standard',
  adminFilter: 'active',
  cart: { open: false, justAdded: false },
  modal: null,               // { type: 'pay', amount, label, who, onSuccess } | { type: 'label', orderId }
};

/* ---------- Navigation (set by the app shell to Next.js router.push) ---------- */
let pushFn = (href) => { window.location.href = href; };
export function setNavigator(fn) { pushFn = fn; }
export function navigate(href) { pushFn(href); }

/* ---------- Cart drawer ---------- */
export function openCart(justAdded) { session.cart = { open: true, justAdded: !!justAdded }; rerender(); }
export function closeCart() { if (session.cart.open) { session.cart = { open: false, justAdded: false }; rerender(); } }

/* ---------- Modal ---------- */
/** Simulated Razorpay window. onSuccess(method) runs after the fake payment. */
export function openPay(amount, label, who, onSuccess) { session.modal = { type: 'pay', amount, label, who, onSuccess }; rerender(); }
export function openLabel(orderId) { session.modal = { type: 'label', orderId }; rerender(); }
export function closeModal() { session.modal = null; rerender(); }
