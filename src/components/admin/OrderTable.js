import Link from 'next/link';
import { fmtDate, inr } from '@/lib/core';
import { StatusPill } from '@/components/ui/Status';

function OrderRow({ o, cols }) {
  const late = !o.cancelled && o.status < 8 && o.due < Date.now();
  return (
    <tr>
      <td>{cols === 'prod' ? <strong>{o.id}</strong> : <Link href={`/admin/order/${o.id}`}>{o.id}</Link>}</td><td>{fmtDate(o.createdAt)}</td><td>{o.customer.name}</td>
      <td>{o.items.map((i, k) => <span key={i.id}>{k > 0 && <br />}{i.name} × {i.qty}</span>)}</td>
      {cols === 'full' && <><td className="num">{inr(o.totals.total)}</td><td className="num">{o.paid + 0.009 < o.totals.total ? <span style={{ color: 'var(--warn)' }}>{inr(o.paid)}</span> : inr(o.paid)}</td></>}
      <td><StatusPill o={o} /></td>
      <td className={`small ${late ? '' : 'muted'}`} style={late ? { color: 'var(--bad)', fontWeight: 700 } : undefined}>{fmtDate(o.due)}</td>
    </tr>
  );
}

export default function OrderTable({ list, cols = 'full' }) {
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th>{cols === 'full' && <><th className="num">Total</th><th className="num">Paid</th></>}<th>Status</th><th>Due</th></tr></thead>
      <tbody>{list.length ? list.map((o) => <OrderRow key={o.id} o={o} cols={cols} />) : <tr><td colSpan="8" className="muted">Nothing here.</td></tr>}</tbody>
    </table></div>
  );
}
