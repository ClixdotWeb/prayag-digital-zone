'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/StoreProvider';
import { openCart } from '@/lib/session';
import Icon, { HeartIcon, Photo } from '@/components/ui/Icon';
import { CATEGORIES } from '@/lib/data';
import { allProducts, inCat } from '@/lib/core';
import { getRole, setRole, STAFF_ROLES } from '@/lib/roles';

export const roleOf = (path) => (path.startsWith('/admin') ? 'admin' : path.startsWith('/production') ? 'production' : 'customer');
// View as: the customer site, or one of the staff roles (Owner, Front office, Accounts, Production). Prototype only — see lib/roles.js.
const ROLES = [['customer', 'Customer', '/'], ...Object.entries(STAFF_ROLES).map(([k, r]) => [k, r.label, r.home])];
/** Which entry of the View as menu is current: the customer site, or the saved staff role on admin/production pages. */
export const currentView = (path) => (roleOf(path) === 'customer' ? 'customer' : getRole());
const pickView = (k) => { if (k !== 'customer') setRole(k); };

export function RoleMenu() {
  const role = currentView(usePathname());
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const router = useRouter();
  useEffect(() => {
    const click = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', click); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('click', click); document.removeEventListener('keydown', key); };
  }, []);
  const cur = ROLES.find((r) => r[0] === role);
  return (
    <div className={`role ${open ? 'open' : ''}`} id="roleMenu" ref={box}>
      <button className="role-btn" type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={`View as: ${cur[1]}`} onClick={() => setOpen((o) => !o)}>
        <b>{cur[1]}</b>
        <svg className="role-chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <div className="role-list" role="listbox" aria-label="View as">
        {ROLES.map(([k, l, href]) => (
          <button key={k} type="button" role="option" aria-selected={k === role} className={`role-opt ${k === role ? 'on' : ''}`} onClick={() => { setOpen(false); pickView(k); router.push(href); }}>
            <span>{l}</span>{k === role && <span className="role-tick"><Icon name="check" /></span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Header() {
  const path = usePathname();
  const router = useRouter();
  const { S, ready } = useApp();
  const bar = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [prodOpen, setProdOpen] = useState(false); // phone menu: Products list folds up/down
  const role = roleOf(path);
  const seg = path.split('/')[1] || undefined;

  // Shadow after scrolling; --hdr follows the real header height so the fixed header never covers content.
  useEffect(() => {
    const el = bar.current;
    const update = () => setScrolled((window.scrollY || document.documentElement.scrollTop || 0) > 10);
    const setH = () => document.documentElement.style.setProperty('--hdr', el.offsetHeight + 'px');
    const ro = window.ResizeObserver ? new ResizeObserver(setH) : null;
    ro?.observe(el);
    document.addEventListener('scroll', update, { passive: true, capture: true });
    window.addEventListener('resize', setH);
    setH(); update();
    return () => { ro?.disconnect(); document.removeEventListener('scroll', update, { capture: true }); window.removeEventListener('resize', setH); };
  }, []);
  useEffect(() => { setMenu(false); setProdOpen(false); }, [path]);

  const link = (href, label, key) => <Link key={href + label} href={href} className={`pf-link${seg === key ? ' active' : ''}`}>{label}</Link>;
  const customer = role === 'customer';
  let nav;
  if (role === 'admin') nav = [link('/admin/dashboard', 'Admin panel', 'admin'), link('/', 'View website', '')];
  else if (role === 'production') nav = [link('/production', 'Job queue', 'production')];
  else nav = [
    link('/', 'Home', undefined),
    <div key="products" className={`pf-drop${seg === 'products' || seg === 'product' ? ' active' : ''}${prodOpen ? ' sub-open' : ''}`}>
      <Link href="/products" className="pf-link" aria-expanded={prodOpen} onClick={(e) => { if (window.matchMedia('(max-width: 980px)').matches) { e.preventDefault(); setProdOpen((o) => !o); } }}>Products <svg className="pf-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg></Link>
      <div className="pf-menu">
        {CATEGORIES.map((c) => {
          const ps = allProducts().filter((p) => inCat(p, c.id));
          return (
            <Link key={c.id} href={`/products?cat=${c.id}`} className="pf-mi">
              <span className="pf-mi-img"><Photo id={ps[0].id} alt={c.name} /></span>
              <span className="pf-mi-txt"><b>{c.name}</b><small>{ps.length} product{ps.length > 1 ? 's' : ''}</small></span>
              <Icon name="arrow" className="ico pf-mi-arrow" />
            </Link>
          );
        })}
        <Link href="/products" className="pf-mi-all">View all <Icon name="arrow" className="ico" /></Link>
      </div>
    </div>,
    link('/print', 'Print now', 'print'), link('/samples', 'Samples', 'samples'), link('/page/about', 'About', 'page'),
    <div key="sl" className="pf-sm-links">
      <Link href="/products"><Icon name="search" /> Search products</Link>
      <Link href="/wishlist"><HeartIcon className="ico" size={undefined} /> Wishlist{ready && S.wishlist.length > 0 && <span className="badge">{S.wishlist.length}</span>}</Link>
    </div>,
    <div key="sm" className="pf-sm-btns"><Link className="pf-btn pf-outline" href="/account">{ready && S.user ? 'My account' : 'Sign in'}</Link><Link className="pf-btn pf-fill" href="/quote">Bulk quote</Link></div>,
  ];
  // Transparent over the home hero until the page is scrolled (or the mobile menu is open)
  const clear = path === '/' && !scrolled && !menu;
  nav = [...nav, <div key="va" className="pf-sm-roles"><span>View as</span>{ROLES.map(([k, l, href]) => <Link key={k} href={href} className={k === currentView(path) ? 'on' : ''} onClick={() => pickView(k)}>{l}</Link>)}</div>];
  const n = ready ? S.cart.length : 0;
  const w = ready ? S.wishlist.length : 0;

  return (
    <header className={`topbar pf-head${scrolled ? ' scrolled' : ''}${menu ? ' menu-open' : ''}${clear ? ' pf-clear' : ''}`} ref={bar}>
      <div className="wrap pf-in">
        <Link href="/" className="logo" aria-label="Prayag Digital Zone home">
          <img className="logo-img" src="/img/logo-light.png" alt="Prayag Digital Zone — the ultimate printing solution" width="439" height="300" />
        </Link>
        <nav className="pf-nav" id="mainnav">{nav}</nav>
        <div className="pf-right">
          {customer && <>
            <Link className="pf-ico pf-hide-sm" href="/products" aria-label="Search products"><Icon name="search" /></Link>
            <Link className="pf-ico pf-hide-sm" href="/wishlist" aria-label={`Wishlist (${w})`}><HeartIcon className="ico" size={undefined} />{w > 0 && <span className="badge">{w}</span>}</Link>
            <a className="pf-ico" href="/cart" aria-label={`Cart (${n})`} onClick={(e) => { e.preventDefault(); openCart(false); }}><Icon name="cart" />{n > 0 && <span className="badge">{n}</span>}</a>
            <Link className="pf-btn pf-outline" href="/account">{ready && S.user ? 'My account' : 'Sign in'}</Link>
            <Link className="pf-btn pf-fill" href="/quote">Bulk quote</Link>
          </>}
          <RoleMenu />
          <button className="pf-burger" type="button" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">{menu ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}</svg>
          </button>
        </div>
      </div>
    </header>
  );
}
