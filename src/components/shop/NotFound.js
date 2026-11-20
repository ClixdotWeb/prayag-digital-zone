import Link from 'next/link';

export default function NotFoundCard() {
  return <div className="page"><div className="card">Page not found. <Link href="/">Go home</Link></div></div>;
}
