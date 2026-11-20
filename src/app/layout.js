import { Archivo, Montserrat } from 'next/font/google';
import './globals.css';
import '@/styles/theme-storex.css';
import { StoreProvider } from '@/context/StoreProvider';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AppShell from '@/components/layout/AppShell';
import { CartDrawer, Modal, Toasts } from '@/components/ui/Overlays';

const mainFont = Montserrat({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-main' });
// Heavy condensed display face for the hero headline (Printify-style)
const displayFont = Archivo({ subsets: ['latin'], weight: 'variable', axes: ['wdth'], display: 'swap', variable: '--font-display' });

export const metadata = {
  title: 'BRD — Online Printing & Packaging',
  description: 'Order visiting cards, brochures, flyers, stickers, boxes and more online. Instant prices, artwork upload, secure payment and live order tracking.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${mainFont.variable} ${displayFont.variable}`}>
      <body>
        <StoreProvider>
          <Header />
          <AppShell>{children}</AppShell>
          <Footer />
          <a className="wa-btn" href="https://wa.me/910000000000" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.5-.3Z" /></svg>
          </a>
          <Modal />
          <Toasts />
          <CartDrawer />
        </StoreProvider>
      </body>
    </html>
  );
}
