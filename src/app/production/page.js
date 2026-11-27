'use client';
// Production screen: job queue for the print floor. Prices and customer contact details are hidden for the Production role
// (the Owner also sees Print Now amounts). Counts use lib/metrics.js, so "Jobs in production" matches the admin dashboard.
import Link from 'next/link';
import { useApp } from '@/context/StoreProvider';
import { MACHINES, OPERATORS } from '@/lib/data';
import { fmtDate } from '@/lib/core';
import { prodNext, prodUpdate } from '@/lib/actions';
import { isArtworkToCheck, isAwaitingApproval, isInProduction, isLate, isReadyToShip } from '@/lib/metrics';
import { can, getRole, STAFF_ROLES } from '@/lib/roles';
import { StatusPill } from '@/components/ui/Status';
import { ItemFiles } from '@/components/ui/Files';
import OrderTable from '@/components/admin/OrderTable';
import PrintJob, { isPrintJob } from '@/components/admin/PrintJob';

const NEXT_LABEL = { 3: 'Start printing', 4: 'Move to finishing', 5: 'Send to quality check', 6: 'QC passed → Packed' };

function Job({ o, showMoney }) {
  const late = isLate(o);
  return (
    <div className={`card job ${late ? 'late' : ''}`}>
      <div className="row between"><h3 style={{ margin: 0 }}>{o.id}</h3><StatusPill o={o} /></div>
      <div className={late ? 'due-late' : 'small muted'}>Due {fmtDate(o.due)}{late && <span className="late-tag">Late</span>}</div>
      {o.items.map((it, idx) => (
        <div style={{ marginTop: 10 }} key={it.id}>
          <strong>{it.name}{isPrintJob(it) ? '' : ` × ${it.qty.toLocaleString('en-IN')}`}</strong>
          {isPrintJob(it) ? <PrintJob it={it} showMoney={showMoney} />
            : <><div className="small muted">{it.specs.join(' · ')}</div><ItemFiles o={o} it={it} idx={idx} mode="production" /></>}
        </div>
      ))}
      {o.notes && <p className="notice small">Customer note: {o.notes}</p>}
      <div className="row" style={{ marginTop: 10 }}>
        <label className="field" style={{ flex: 1 }}>Operator<select value={o.operator} onChange={(e) => prodUpdate(o.id, 'operator', e.target.value)}><option value="">—</option>{OPERATORS.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="field" style={{ flex: 1 }}>Machine<select value={o.machine} onChange={(e) => prodUpdate(o.id, 'machine', e.target.value)}><option value="">—</option>{MACHINES.map((x) => <option key={x}>{x}</option>)}</select></label></div>
      <label className="field" style={{ marginTop: 8 }}>Production notes (internal)<textarea rows="2" defaultValue={o.prodNotes} onBlur={(e) => { if (e.target.value !== o.prodNotes) prodUpdate(o.id, 'prodNotes', e.target.value); }} /></label>
      <label className="field" style={{ marginTop: 8 }}>Expected completion<input type="date" value={new Date(o.due).toISOString().slice(0, 10)} onChange={(e) => e.target.value && prodUpdate(o.id, 'due', e.target.value)} /></label>
      <div className="row" style={{ marginTop: 12 }}><button className="btn-primary" onClick={() => prodNext(o.id)}>{NEXT_LABEL[o.status]}</button></div>
    </div>
  );
}

export default function Production() {
  const { S } = useApp();
  const role = getRole();
  if (!can('production')) return (
    <div className="page"><div className="row between"><h1>No access</h1></div>
      <div className="card"><p>The <b>{STAFF_ROLES[role].label}</b> role can&apos;t open the production screen.</p><Link className="btn btn-sm" href={STAFF_ROLES[role].home}>Go to dashboard</Link></div></div>
  );
  const showMoney = role === 'owner';
  const jobs = S.orders.filter(isInProduction).sort((a, b) => a.due - b.due);
  const ready = S.orders.filter(isReadyToShip);
  const upcoming = S.orders.filter((o) => isArtworkToCheck(o) || isAwaitingApproval(o));
  return (
    <div className="page"><div className="row between"><h1>Production · Job queue</h1><span className="muted small">{showMoney ? 'Owner view: Print Now amounts shown' : 'Prices and customer contact details are hidden for this role'}</span></div>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="v">{jobs.length}</div><div className="l">Jobs in production</div></div>
        <div className="stat"><div className="v">{jobs.filter((o) => isLate(o)).length}</div><div className="l">Late (in production)</div></div>
        <div className="stat"><div className="v">{ready.length}</div><div className="l">Ready to ship</div></div>
        <div className="stat"><div className="v">{upcoming.length}</div><div className="l">Upcoming (artwork / approval)</div></div></div>
      <div className="grid g2">{jobs.length ? jobs.map((o) => <Job key={o.id} o={o} showMoney={showMoney} />) : <div className="card">No jobs to print right now.</div>}</div>
      <h2 className="mt">Ready to ship</h2><OrderTable list={ready} cols="prod" empty="None." />
      <h2 className="mt">Upcoming</h2><OrderTable list={upcoming} cols="prod" empty="None." />
    </div>
  );
}
