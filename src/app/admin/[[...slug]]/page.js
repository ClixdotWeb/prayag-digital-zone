'use client';
// /admin, /admin/<tab> and /admin/order/<id> — same tabs and URLs as the prototype's #/admin/...
import Link from 'next/link';
import { use } from 'react';
import { useApp } from '@/context/StoreProvider';
import { resetAll } from '@/lib/actions';
import * as T from '@/components/admin/AdminTabs';

const ADMIN_TABS = [
  ['dashboard', 'Dashboard'], ['orders', 'Orders'], ['quotes', 'Quotations'], ['products', 'Products & pricing'], ['coupons', 'Coupons'],
  ['payments', 'Payments'], ['customers', 'Customers'], ['support', 'Support'], ['reports', 'Reports'], ['messages', 'Messages'],
  ['users', 'Staff & roles'], ['activity', 'Activity log'], ['settings', 'Settings & banners'],
];
const VIEWS = {
  dashboard: T.Dashboard, orders: T.Orders, quotes: T.Quotes, products: T.Products, coupons: T.Coupons, payments: T.Payments,
  customers: T.Customers, support: T.Support, reports: T.Reports, messages: T.Messages, users: T.Users, activity: T.Activity, settings: T.Settings,
};

export default function Admin({ params }) {
  const { slug } = use(params);
  useApp();
  const tab = slug?.[0] || 'dashboard';
  const arg = slug?.[1];
  const View = VIEWS[tab] || T.Dashboard;
  return (
    <div className="page">
      <div className="row between"><h1>Admin panel</h1><button className="btn-sm" onClick={resetAll}>Reset demo data</button></div>
      <nav className="tabs">{ADMIN_TABS.map(([k, l]) => <Link key={k} href={`/admin/${k}`} className={k === tab || (tab === 'order' && k === 'orders') ? 'active' : ''}>{l}</Link>)}</nav>
      {tab === 'order' ? <T.OrderDetail key={arg} id={arg} /> : <View />}
    </div>
  );
}
