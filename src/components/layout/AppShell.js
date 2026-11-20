'use client';
// <main id="app">: wraps every page except home in .wrap (as the prototype did), sets the tab title,
// runs the scroll animations, closes the cart on page change and redirects old #/ links.
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useApp } from '@/context/StoreProvider';
import { closeCart, setNavigator } from '@/lib/session';
import useAnimations from '@/hooks/useAnimations';
import { roleOf } from './Header';

export default function AppShell({ children }) {
  const path = usePathname();
  const router = useRouter();
  const { S, ready } = useApp();
  const role = roleOf(path);

  useEffect(() => { setNavigator((href) => router.push(href)); }, [router]);

  // Old prototype links used #/ hashes (e.g. /#/product/boxes) — send them to the matching page.
  useEffect(() => {
    const h = window.location.hash;
    if (h.startsWith('#/')) {
      let p = h.slice(1);
      if (p === '/admin' || p === '/admin/') p = '/admin/dashboard';
      router.replace(p || '/');
    }
  }, [router]);

  useEffect(() => { closeCart(); window.scrollTo(0, 0); }, [path]);
  useEffect(() => {
    if (ready) document.title = `${S.settings.company} — ${role === 'customer' ? 'Online Printing & Packaging' : role === 'admin' ? 'Admin' : 'Production'}`;
  });
  useAnimations(path, ready);

  if (!ready) return <main id="app" />;
  // Inner pages sit on a light page band (Printec-style); role class lets admin/production get their own tweaks.
  return <main id="app" className={`pv-${role}`}>{path === '/' ? children : <div className="pv-band"><div className="wrap">{children}</div></div>}</main>;
}
