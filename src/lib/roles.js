// Staff roles for the admin panel and production screen.
// PROTOTYPE ONLY: the role is picked in the "View as" menu and kept in this browser. Hiding menu items and
// blocking URLs here is a convenience, NOT security — anyone can change it. Real logins and server-side checks
// on every API route are needed before going live (see README → "Before going live").
import { rerender } from './core';

const KEY = 'prayag-staff-role';

export const STAFF_ROLES = {
  owner: { label: 'Owner', home: '/admin/dashboard' },
  front: { label: 'Front office', home: '/admin/dashboard' },
  accounts: { label: 'Accounts', home: '/admin/dashboard' },
  production: { label: 'Production', home: '/production' },
};

/** Admin pages each role can open ('*' = all). 'order' = order detail, 'new-order' = walk-in order form. */
const PAGES = {
  owner: '*',
  front: ['dashboard', 'orders', 'order', 'new-order', 'quotes', 'customers', 'support'],
  accounts: ['dashboard', 'reports', 'orders', 'order', 'payments', 'customers'],
  production: [],
};

/** What each role may do or see inside pages. */
const CAN = {
  finance: ['owner', 'accounts'],            // revenue, balance and refund figures, Reports, Payments
  editOrders: ['owner', 'front'],            // change status, ship, cancel, create walk-in orders
  takePayment: ['owner', 'front', 'accounts'], // record cash / UPI / bank payment
  refund: ['owner', 'accounts'],
  prices: ['owner', 'front', 'accounts'],    // any amount on an order
  contacts: ['owner', 'front', 'accounts'],  // customer phone, email, address
  production: ['owner', 'production'],      // the /production screen
};

let current = 'owner';
/** Called once in the browser after the store loads. */
export function loadRole() {
  try { const r = localStorage.getItem(KEY); if (r && STAFF_ROLES[r]) current = r; } catch { /* storage blocked */ }
}
export const getRole = () => current;
export function setRole(r) {
  if (!STAFF_ROLES[r]) return;
  current = r;
  try { localStorage.setItem(KEY, r); } catch { /* storage blocked */ }
  rerender();
}

export const canOpen = (page, role = current) => PAGES[role] === '*' || (PAGES[role] || []).includes(page);
export const can = (what, role = current) => (CAN[what] || []).includes(role);
