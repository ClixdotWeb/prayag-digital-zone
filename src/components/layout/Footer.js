'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { subscribe } from '@/lib/actions';
import { roleOf } from './Header';

export default function Footer() {
  const path = usePathname();
  return (
    <footer className="footer sx-foot" id="footer" hidden={roleOf(path) !== 'customer'}>
      <div className="wrap">
        <div className="newsletter" id="newsletter">
          <div><h2>Sign up for exclusive offers</h2><div style={{ opacity: 0.85 }}>New products, festival offers and corporate deals. No spam.</div></div>
          <form id="newsForm" onSubmit={(e) => { e.preventDefault(); e.currentTarget.reset(); subscribe(); }}>
            <input type="email" name="email" placeholder="Your email address" required aria-label="Email" /><button className="btn-dark" type="submit">Subscribe</button>
          </form>
        </div>
        <div className="footer-cols">
          <div>
            <Link href="/" className="logo logo-foot" aria-label="Prayag Digital Zone home"><img className="logo-img" src="/img/logo.png" alt="Prayag Digital Zone — the ultimate printing solution" width="1158" height="340" /></Link>
            <p>Online printing and packaging from Kozhikode. Order any time, track every step, delivered across India.</p>
            <div className="socials">
              <Link href="/" aria-label="Facebook"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.5c0-.9.3-1.6 1.6-1.6h1.7V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.3v2.4H7.4v3.2h2.8V22h3.3Z" /></svg></Link>
              <Link href="/" aria-label="Instagram"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.2 4.8 1.7 5 5 .1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.2 3.3-1.7 4.8-5 5-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.2-4.8-1.7-5-5C2.1 15.6 2 15.2 2 12s0-3.6.1-4.8c.2-3.3 1.7-4.8 5-5 1.2-.1 1.6-.1 4.9-.1Zm0 4.9a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8Zm0 8.1a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Zm5.1-9.4a1.2 1.2 0 1 0 0 2.3 1.2 1.2 0 0 0 0-2.3Z" /></svg></Link>
              <Link href="/" aria-label="YouTube"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M23 7.2a2.9 2.9 0 0 0-2-2C19.2 4.7 12 4.7 12 4.7s-7.2 0-9 .5a2.9 2.9 0 0 0-2 2C.5 9 .5 12 .5 12s0 3 .5 4.8a2.9 2.9 0 0 0 2 2c1.8.5 9 .5 9 .5s7.2 0 9-.5a2.9 2.9 0 0 0 2-2c.5-1.8.5-4.8.5-4.8s0-3-.5-4.8ZM9.7 15.1V8.9l6 3.1-6 3.1Z" /></svg></Link>
              <a href="https://wa.me/910000000000" aria-label="WhatsApp"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.5-.3Z" /></svg></a>
            </div>
          </div>
          <div><h4>Products</h4><ul>
            <li><Link href="/product/visiting-cards">Visiting cards</Link></li><li><Link href="/product/brochures">Brochures</Link></li>
            <li><Link href="/product/flyers">Flyers</Link></li><li><Link href="/product/stickers">Stickers</Link></li><li><Link href="/product/boxes">Boxes</Link></li></ul></div>
          <div><h4>Company</h4><ul>
            <li><Link href="/page/about">About us</Link></li><li><Link href="/page/services">Services</Link></li><li><Link href="/page/blog">Blog</Link></li>
            <li><Link href="/page/careers">Careers</Link></li><li><Link href="/page/contact">Contact</Link></li></ul></div>
          <div><h4>Help</h4><ul>
            <li><Link href="/page/faq">FAQ</Link></li><li><Link href="/samples">Samples & templates</Link></li><li><Link href="/page/refund">Refund policy</Link></li>
            <li><Link href="/page/privacy">Privacy policy</Link></li><li><Link href="/page/terms">Terms & conditions</Link></li></ul></div>
          <div><h4>Visit us</h4>
            <p>Mavoor Road, Kozhikode,<br />Kerala 673004<br />Mon–Sat · 9:30 am – 7:00 pm</p>
            <p><a href="tel:+910000000000">+91 00000 00000</a><br /><a href="mailto:hello@brd.example">hello@brd.example</a></p></div>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>© 2026 BRD · Powered by <a href="https://clixdot.com" target="_blank" rel="noopener">Clixdot</a></span>
        <span className="paychips"><span>UPI</span><span>VISA</span><span>Mastercard</span><span>RuPay</span><span>Net banking</span></span>
        <button className="pv-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top <span aria-hidden="true">↑</span></button>
      </div>
    </footer>
  );
}
