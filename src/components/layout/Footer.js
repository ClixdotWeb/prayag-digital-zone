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
            <div className="socials"><Link href="/" aria-label="Facebook">f</Link><Link href="/" aria-label="Instagram">in</Link><Link href="/" aria-label="YouTube">yt</Link><a href="https://wa.me/910000000000" aria-label="WhatsApp">wa</a></div>
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
