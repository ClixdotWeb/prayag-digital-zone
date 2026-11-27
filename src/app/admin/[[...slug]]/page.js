'use client';
// /admin, /admin/<page>, /admin/order/<id>, /admin/new-order — rendered inside AdminShell (see AppShell).
// Unknown pages show "Page not found"; pages the current role may not open show "No access".
// PROTOTYPE: these role checks run in the browser only and are not security (see lib/roles.js).
import Link from 'next/link';
import { use, useEffect } from 'react';
import { useApp } from '@/context/StoreProvider';
import * as T from '@/components/admin/AdminTabs';
import PrintRates from '@/components/admin/PrintRates';
import NewOrder from '@/components/admin/NewOrder';
import { PageHead } from '@/components/admin/ui';
import { canOpen, getRole, STAFF_ROLES } from '@/lib/roles';

const VIEWS = {
  dashboard: ['Dashboard', T.Dashboard], reports: ['Reports', T.Reports],
  orders: ['Orders', T.Orders], quotes: ['Quotations', T.Quotes], payments: ['Payments', T.Payments], coupons: ['Coupons', T.Coupons], customers: ['Customers', T.Customers],
  products: ['Products & pricing', T.Products], 'print-rates': ['Print rates', PrintRates],
  support: ['Support', T.Support], messages: ['Messages', T.Messages],
  users: ['Staff & roles', T.Users], activity: ['Activity log', T.Activity], settings: ['Settings & banners', T.Settings],
  'new-order': ['New order', NewOrder],
};

export default function Admin({ params }) {
  const { slug } = use(params);
  useApp();
  const tab = slug?.[0] || 'dashboard';
  const arg = slug?.[1];
  const role = getRole();
  const known = tab === 'order' ? slug.length === 2 : !!VIEWS[tab] && (slug?.length || 0) <= 1;
  const title = !known ? 'Page not found' : tab === 'order' ? `Order ${arg}` : VIEWS[tab][0];
  useEffect(() => { document.title = `${title} · PRAYAG Admin`; });
  const home = <Link className="btn btn-sm" href={STAFF_ROLES[role].home}>Go to {role === 'production' ? 'production screen' : 'dashboard'}</Link>;

  if (!known) return <>
    <PageHead title="Page not found" />
    <div className="card"><p>There is no admin page at this address.</p>{home}</div>
  </>;
  if (!canOpen(tab)) return <>
    <PageHead title="No access" />
    <div className="card"><p>The <b>{STAFF_ROLES[role].label}</b> role can&apos;t open {tab === 'order' ? 'orders' : `“${VIEWS[tab][0]}”`}.</p>
      <p className="small muted">Ask the owner to change your role, or switch role in “View as” (prototype only).</p>{home}</div>
  </>;
  if (tab === 'order') return <T.OrderDetail key={arg} id={arg} />;
  const View = VIEWS[tab][1];
  return <><PageHead title={title} /><View /></>;
}
