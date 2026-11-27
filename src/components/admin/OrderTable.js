import Link from 'next/link';
import { fmtDate, money } from '@/lib/core';
import { balanceOf, isLate } from '@/lib/metrics';
import { StatusPill } from '@/components/ui/Status';

/** Due date cell: red "Late" badge when the order is open and past due. */
export function DueCell({ o }) {
  const late = isLate(o);
  return <span className={late ? 'due-late' : 'small muted'}>{fmtDate(o.due)}{late && <span className="late-tag">Late</span>}</span>;
}

function OrderRow({ o, cols }) {
  const prod = cols === 'prod';
  return (
    <tr className={isLate(o) ? 'late' : ''}>
      <td data-label="Order">{prod ? <strong>{o.id}</strong> : <Link href={`/admin/order/${o.id}`}><strong>{o.id}</strong></Link>}</td>
      <td data-label="Placed">{fmtDate(o.createdAt)}</td>
      <td data-label="Customer">{o.customer.name}</td>
      <td data-label="Items"><div>{o.items.map((i) => <div key={i.id}>{i.name} × {i.qty.toLocaleString('en-IN')}</div>)}</div></td>
      {!prod && <><td data-label="Total" className="num">{money(o.totals.total)}</td>
        <td data-label="Balance" className="num">{balanceOf(o) > 0.009 ? <span className="bal-due">{money(balanceOf(o))}</span> : <span className="muted">Paid</span>}</td></>}
      <td data-label="Status"><div><StatusPill o={o} /></div></td>
      <td data-label="Due"><div><DueCell o={o} /></div></td>
    </tr>
  );
}

/** cols: 'full' (admin, with amounts) | 'prod' (production: no prices, no links to admin). */
export default function OrderTable({ list, cols = 'full', empty = 'Nothing here.' }) {
  if (!list.length) return <div className="adm-empty">{empty}</div>;
  return (
    <div className="table-wrap"><table className="rt">
      <thead><tr><th>Order</th><th>Placed</th><th>Customer</th><th>Items</th>{cols === 'full' && <><th className="num">Total</th><th className="num">Balance</th></>}<th>Status</th><th>Due</th></tr></thead>
      <tbody>{list.map((o) => <OrderRow key={o.id} o={o} cols={cols} />)}</tbody>
    </table></div>
  );
}
