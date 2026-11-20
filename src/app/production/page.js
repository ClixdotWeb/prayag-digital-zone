'use client';
// Production screen: job queue for the print floor (prices and customer contact details hidden).
import { useApp } from '@/context/StoreProvider';
import { MACHINES, OPERATORS } from '@/lib/data';
import { fmtDate } from '@/lib/core';
import { prodNext, prodUpdate } from '@/lib/actions';
import { StatusPill } from '@/components/ui/Status';
import { ItemFiles } from '@/components/ui/Files';
import OrderTable from '@/components/admin/OrderTable';
import { live } from '@/components/admin/AdminTabs';

const NEXT_LABEL = { 3: 'Start printing', 4: 'Move to finishing', 5: 'Send to quality check', 6: 'QC passed → Packed' };

function Job({ o }) {
  const late = o.due < Date.now();
  return (
    <div className={`card job ${late ? 'late' : ''}`}>
      <div className="row between"><h3 style={{ margin: 0 }}>{o.id}</h3><StatusPill o={o} /></div>
      <div className={`small ${late ? '' : 'muted'}`} style={late ? { color: 'var(--bad)', fontWeight: 700 } : undefined}>Due {fmtDate(o.due)}{late ? ' · LATE' : ''}</div>
      {o.items.map((it, idx) => (
        <div style={{ marginTop: 10 }} key={it.id}><strong>{it.name} × {it.qty.toLocaleString('en-IN')}</strong><div className="small muted">{it.specs.join(' · ')}</div><ItemFiles o={o} it={it} idx={idx} mode="production" /></div>
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
  useApp();
  const jobs = live().filter((o) => o.status >= 3 && o.status <= 6).sort((a, b) => a.due - b.due);
  const ready = live().filter((o) => o.status === 7);
  const upcoming = live().filter((o) => o.status >= 1 && o.status <= 2);
  return (
    <div className="page"><div className="row between"><h1>Production · Job queue</h1><span className="muted small">Prices and customer contact details are hidden for this role</span></div>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="v">{jobs.length}</div><div className="l">Jobs in progress</div></div>
        <div className="stat"><div className="v">{jobs.filter((o) => o.due < Date.now()).length}</div><div className="l">Late</div></div>
        <div className="stat"><div className="v">{ready.length}</div><div className="l">Ready for dispatch</div></div>
        <div className="stat"><div className="v">{upcoming.length}</div><div className="l">Upcoming (awaiting approval)</div></div></div>
      <div className="grid g2">{jobs.length ? jobs.map((o) => <Job key={o.id} o={o} />) : <div className="card">No jobs to print right now.</div>}</div>
      <h2 className="mt">Ready for dispatch</h2>{ready.length ? <OrderTable list={ready} cols="prod" /> : <p className="muted">None.</p>}
      <h2 className="mt">Upcoming</h2>{upcoming.length ? <OrderTable list={upcoming} cols="prod" /> : <p className="muted">None.</p>}
    </div>
  );
}
