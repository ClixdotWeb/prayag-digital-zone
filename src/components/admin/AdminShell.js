'use client';
// Admin layout: collapsible grouped sidebar (drawer on phones/tablets), top bar with global search,
// "New order" for walk-in customers and the View-as role menu. Menu items are filtered by role.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/StoreProvider';
import { badges, customerList } from '@/lib/metrics';
import { can, canOpen, getRole, STAFF_ROLES } from '@/lib/roles';
import { fmtDate } from '@/lib/core';
import { RoleMenu } from '@/components/layout/Header';

const P = {
  dashboard: 'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z',
  reports: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  orders: 'M6 2h12v20l-3-2-3 2-3-2-3 2V2Zm3 6h6m-6 4h6m-6 4h4',
  quotes: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M8 13h8m-8 4h5',
  payments: 'M2 6h20v12H2V6Zm0 4h20M6 15h4',
  coupons: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8ZM7 7h.01',
  customers: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  products: 'M21 8 12 3 3 8v8l9 5 9-5V8Zm-9 5L3 8m9 5 9-5m-9 5v8',
  'print-rates': 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6v-8Z',
  support: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-6a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.9 4.9l4.3 4.3m5.6 5.6 4.3 4.3m0-14.2-4.3 4.3m-5.6 5.6-4.3 4.3',
  messages: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z',
  users: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  menu: 'M3 6h18M3 12h18M3 18h18', close: 'M18 6 6 18M6 6l12 12', search: 'm21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z',
  plus: 'M12 5v14M5 12h14', collapse: 'm15 18-6-6 6-6', expand: 'm9 18 6-6-6-6', site: 'M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z',
};
export const AIcon = ({ name, size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[name]} /></svg>
);

export const NAV = [
  ['Overview', [['dashboard', 'Dashboard'], ['reports', 'Reports']]],
  ['Sales', [['orders', 'Orders'], ['quotes', 'Quotations'], ['payments', 'Payments'], ['coupons', 'Coupons'], ['customers', 'Customers']]],
  ['Catalogue', [['products', 'Products & pricing'], ['print-rates', 'Print rates']]],
  ['Communication', [['support', 'Support'], ['messages', 'Messages']]],
  ['System', [['users', 'Staff & roles'], ['activity', 'Activity log'], ['settings', 'Settings & banners']]],
];
const BADGE_HINT = { orders: 'artwork to check', quotes: 'new quotes', support: 'open tickets' };
const SIDE_KEY = 'prayag-admin-sidebar';

/* ---------- Global search: order no, customer name, phone ---------- */
function GlobalSearch({ S }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef(null);
  useEffect(() => {
    const click = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, []);
  const t = q.trim().toLowerCase(), d = t.replace(/\D/g, '');
  const hit = (...xs) => xs.some((x) => String(x || '').toLowerCase().includes(t)) || (d.length >= 4 && xs.some((x) => String(x || '').replace(/\D/g, '').includes(d)));
  const res = [];
  if (t.length >= 2) {
    if (canOpen('order')) [...S.orders].sort((a, b) => b.createdAt - a.createdAt).filter((o) => hit(o.id, o.customer.name, o.customer.phone)).slice(0, 6)
      .forEach((o) => res.push({ href: `/admin/order/${o.id}`, title: `${o.id} · ${o.customer.name}`, sub: `Order · ${fmtDate(o.createdAt)}` }));
    if (canOpen('quotes')) S.quotes.filter((x) => hit(x.id, x.name, x.phone)).slice(0, 3)
      .forEach((x) => res.push({ href: `/admin/quotes?q=${encodeURIComponent(x.id)}`, title: `${x.id} · ${x.name}`, sub: `Quotation · ${x.product}` }));
    if (canOpen('customers')) customerList(S.orders).filter((c) => hit(c.name, c.phone, c.email)).slice(0, 3)
      .forEach((c) => res.push({ href: `/admin/orders?status=all&q=${encodeURIComponent(c.phone || c.name)}`, title: c.name, sub: `Customer · ${c.orders} order${c.orders === 1 ? '' : 's'}` }));
  }
  const go = (href) => { setOpen(false); setQ(''); router.push(href); };
  return (
    <div className="adm-gs" ref={box} role="search">
      <AIcon name="search" />
      <input type="search" value={q} placeholder="Order no, customer name, phone…" aria-label="Search orders, customers and quotations"
        role="combobox" aria-expanded={open && t.length >= 2} aria-controls="adm-gs-list" aria-autocomplete="list"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(res.length - 1, h + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
          else if (e.key === 'Escape') setOpen(false);
          else if (e.key === 'Enter' && t) go(res[hi]?.href || `/admin/orders?status=all&q=${encodeURIComponent(q.trim())}`);
        }} />
      {open && t.length >= 2 && (
        <ul className="adm-gs-list" id="adm-gs-list" role="listbox">
          {res.length ? res.map((r, i) => (
            <li key={r.href} role="option" aria-selected={i === hi}><button type="button" className={i === hi ? 'on' : ''} onMouseEnter={() => setHi(i)} onClick={() => go(r.href)}><b>{r.title}</b><small>{r.sub}</small></button></li>
          )) : <li className="adm-gs-none">No orders, customers or quotations match “{q.trim()}”.</li>}
        </ul>
      )}
    </div>
  );
}

export default function AdminShell({ children }) {
  const { S } = useApp();
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const role = getRole();
  const tab = path.split('/')[2] || 'dashboard';
  const current = tab === 'order' || tab === 'new-order' ? 'orders' : tab;
  const b = badges(S);

  useEffect(() => { try { setCollapsed(localStorage.getItem(SIDE_KEY) === '1'); } catch { /* storage blocked */ } }, []);
  useEffect(() => { setDrawer(false); }, [path]);
  useEffect(() => {
    if (!drawer) return;
    const k = (e) => { if (e.key === 'Escape') setDrawer(false); };
    document.addEventListener('keydown', k);
    document.body.classList.add('adm-lock');
    return () => { document.removeEventListener('keydown', k); document.body.classList.remove('adm-lock'); };
  }, [drawer]);
  const toggle = () => setCollapsed((c) => { try { localStorage.setItem(SIDE_KEY, c ? '0' : '1'); } catch { /* storage blocked */ } return !c; });

  const groups = NAV.map(([g, items]) => [g, items.filter(([k]) => canOpen(k))]).filter(([, items]) => items.length);
  return (
    <div className={`adm${collapsed ? ' collapsed' : ''}${drawer ? ' drawer-open' : ''}`}>
      <aside className="adm-side" id="adm-side" aria-label="Admin menu">
        <div className="adm-brand">
          <Link href="/admin/dashboard" className="adm-logo" aria-label="Admin dashboard"><img src="/img/logo-light.png" alt="Prayag Digital Zone" width="439" height="300" /></Link>
          <button type="button" className="adm-x" aria-label="Close menu" onClick={() => setDrawer(false)}><AIcon name="close" /></button>
        </div>
        <nav className="adm-nav">
          {groups.length ? groups.map(([g, items]) => (
            <div className="adm-group" key={g}>
              <div className="adm-group-l">{g}</div>
              {items.map(([k, l]) => {
                const n = b[k] || 0;
                return (
                  <Link key={k} href={`/admin/${k}`} className={`adm-link${current === k ? ' active' : ''}`} aria-current={current === k ? 'page' : undefined} title={collapsed ? l : undefined}>
                    <AIcon name={k} /><span className="adm-link-l">{l}</span>
                    {n > 0 && <span className="adm-badge" aria-label={`${n} ${BADGE_HINT[k]}`} title={`${n} ${BADGE_HINT[k]}`}>{n}</span>}
                  </Link>
                );
              })}
            </div>
          )) : <p className="small muted adm-noaccess-side">No admin pages for {STAFF_ROLES[role].label}.</p>}
          {can('production') && <div className="adm-group"><div className="adm-group-l">Floor</div>
            <Link href="/production" className="adm-link" title={collapsed ? 'Production screen' : undefined}><AIcon name="print-rates" /><span className="adm-link-l">Production screen</span></Link></div>}
        </nav>
        <div className="adm-side-foot">
          <Link href="/" className="adm-link" title={collapsed ? 'View website' : undefined}><AIcon name="site" /><span className="adm-link-l">View website</span></Link>
          <button type="button" className="adm-collapse" onClick={toggle} aria-expanded={!collapsed} aria-controls="adm-side" aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}>
            <AIcon name={collapsed ? 'expand' : 'collapse'} /><span className="adm-link-l">Collapse</span>
          </button>
        </div>
      </aside>
      <div className="adm-backdrop" onClick={() => setDrawer(false)} aria-hidden="true" />
      <div className="adm-main">
        <header className="adm-top">
          <button type="button" className="adm-burger" aria-label="Open menu" aria-expanded={drawer} aria-controls="adm-side" onClick={() => setDrawer(true)}><AIcon name="menu" size={22} /></button>
          {canOpen('order') ? <GlobalSearch S={S} /> : <span className="adm-gs-spacer" />}
          {can('editOrders') && canOpen('new-order') && <Link href="/admin/new-order" className="btn btn-primary adm-new"><AIcon name="plus" /><span>New order</span></Link>}
          <RoleMenu />
        </header>
        <div className="adm-content"><Suspense fallback={null}>{children}</Suspense></div>
      </div>
    </div>
  );
}
