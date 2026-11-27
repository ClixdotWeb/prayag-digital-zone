'use client';
// New order for walk-in / phone customers: catalogue products with options (priced like the website) or a custom job line,
// optional artwork, delivery, and payment taken at the counter. Creates a normal order (see createWalkInOrder).
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { allProducts, calc, defaultSel, isChoice, money, priced, product, totals, visible } from '@/lib/core';
import { createWalkInOrder } from '@/lib/actions';
import { can } from '@/lib/roles';
import { Drop, FileCard } from '@/components/ui/Files';

const newLine = () => ({ k: Math.random().toString(36).slice(2), type: 'product', pid: '', sel: {}, qty: '', name: '', price: '', details: '' });

function lineTotal(l) {
  if (l.type === 'custom') return +l.price > 0 ? +l.price : 0;
  if (!l.pid) return 0;
  const p = product(l.pid);
  const qty = Math.max(p.minQty, parseInt(l.qty, 10) || p.minQty);
  return calc(p, l.sel, qty).total;
}

function Line({ l, i, update, remove, many }) {
  const p = l.pid ? product(l.pid) : null;
  const products = allProducts().filter(priced);
  return (
    <fieldset className="card nl-line">
      <legend className="sr-only">Item {i + 1}</legend>
      <div className="row between"><strong>Item {i + 1}</strong>{many && <button type="button" className="btn-sm" onClick={remove}>Remove</button>}</div>
      <div className="adm-seg nl-type" role="group" aria-label="Item type">
        <button type="button" className={l.type === 'product' ? 'on' : ''} aria-pressed={l.type === 'product'} onClick={() => update({ type: 'product' })}>Catalogue product</button>
        <button type="button" className={l.type === 'custom' ? 'on' : ''} aria-pressed={l.type === 'custom'} onClick={() => update({ type: 'custom' })}>Custom job</button>
      </div>
      {l.type === 'product' ? <>
        <label className="field">Product<select value={l.pid} required onChange={(e) => { const np = product(e.target.value); update({ pid: e.target.value, sel: np ? defaultSel(np) : {}, qty: np ? String(np.minQty) : '' }); }}>
          <option value="">Choose a product…</option>{products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        {p && <div className="nl-opts">
          {p.options.filter((g) => isChoice(g) && visible(g, l.sel)).map((g) => (g.multi ? (
            <fieldset key={g.key} className="field nl-multi"><legend>{g.label}</legend>
              {g.choices.map((c, ci) => c.quote ? null : (
                <label key={ci} className="check"><input type="checkbox" checked={(l.sel[g.key] || []).includes(ci)}
                  onChange={(e) => { const cur = l.sel[g.key] || []; update({ sel: { ...l.sel, [g.key]: e.target.checked ? [...cur, ci] : cur.filter((x) => x !== ci) } }); }} /> {c.label}</label>))}
            </fieldset>
          ) : (
            <label key={g.key} className="field">{g.label}<select value={l.sel[g.key] ?? 0} onChange={(e) => update({ sel: { ...l.sel, [g.key]: +e.target.value } })}>
              {g.choices.map((c, ci) => (c.quote || c.custom ? null : <option key={ci} value={ci}>{c.label}</option>))}</select></label>
          )))}
          <label className="field">Quantity (min {p.minQty.toLocaleString('en-IN')})<input type="number" min={p.minQty} step="1" required value={l.qty} onChange={(e) => update({ qty: e.target.value })} /></label>
        </div>}
        {p && parseInt(l.qty, 10) < p.minQty && <p className="small warn-text">Minimum quantity is {p.minQty}. It will be raised to {p.minQty}.</p>}
      </> : <div className="nl-opts">
        <label className="field nl-wide">Job description<input value={l.name} required placeholder="e.g. Spiral binding, 3 books" onChange={(e) => update({ name: e.target.value })} /></label>
        <label className="field">Quantity<input type="number" min="1" required value={l.qty} onChange={(e) => update({ qty: e.target.value })} /></label>
        <label className="field">Price ₹ (before GST)<input type="number" min="1" step="0.01" required value={l.price} onChange={(e) => update({ price: e.target.value })} /></label>
        <label className="field nl-wide">Details (optional)<input value={l.details} placeholder="Paper, size, finishing…" onChange={(e) => update({ details: e.target.value })} /></label>
      </div>}
      <div className="kv nl-sub"><span>Item total (before GST)</span><b>{money(lineTotal(l))}</b></div>
    </fieldset>
  );
}

export default function NewOrder() {
  const router = useRouter();
  const [c, setC] = useState({ name: '', phone: '', email: '' });
  const [lines, setLines] = useState([newLine()]);
  const [files, setFiles] = useState([]);
  const [method, setMethod] = useState('pickup');
  const [pay, setPay] = useState('full');
  const [advance, setAdvance] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  if (!can('editOrders')) return <div className="card">Your role can&apos;t create orders.</div>;

  const preview = lines.map((l) => ({ total: lineTotal(l) }));
  const t = totals(preview, '', method);
  const update = (i) => (patch) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const submit = (e) => {
    e.preventDefault();
    const digits = c.phone.replace(/\D/g, '');
    if (!c.name.trim()) return setErr('Enter the customer name.');
    if (digits.length < 10) return setErr('Enter a phone number with at least 10 digits.');
    if (lines.some((l) => (l.type === 'product' ? !l.pid : !l.name.trim() || !(+l.price > 0) || !(+l.qty > 0)))) return setErr('Complete every item, or remove the empty one.');
    if (pay === 'advance' && !(+advance > 0 && +advance < t.total)) return setErr(`Advance must be more than ₹0 and less than ${money(t.total)}.`);
    const id = createWalkInOrder({
      customer: c, files, method, payment: pay, advance, payMethod, notes,
      lines: lines.map((l) => (l.type === 'custom' ? { custom: true, name: l.name.trim(), qty: +l.qty, price: +l.price, details: l.details.trim() }
        : { pid: l.pid, sel: l.sel, qty: Math.max(product(l.pid).minQty, parseInt(l.qty, 10) || 0) })),
    });
    router.push(`/admin/order/${id}`);
  };

  return (
    <form className="nl" onSubmit={submit} noValidate>
      <div className="nl-main stack">
        <section className="card stack"><h2>Customer</h2>
          <div className="nl-opts">
            <label className="field">Name<input value={c.name} required autoComplete="off" onChange={(e) => setC({ ...c, name: e.target.value })} /></label>
            <label className="field">Phone<input value={c.phone} required type="tel" inputMode="tel" placeholder="+91 …" onChange={(e) => setC({ ...c, phone: e.target.value })} /></label>
            <label className="field">Email (optional)<input value={c.email} type="email" onChange={(e) => setC({ ...c, email: e.target.value })} /></label>
          </div></section>
        {lines.map((l, i) => <Line key={l.k} l={l} i={i} update={update(i)} many={lines.length > 1} remove={() => setLines((ls) => ls.filter((_, j) => j !== i))} />)}
        <button type="button" className="btn-sm" onClick={() => setLines((ls) => [...ls, newLine()])}>+ Add another item</button>
        <section className="card stack"><h2>Artwork (optional)</h2>
          <Drop onFiles={(r) => setFiles((f) => [...f, ...r])}><span>Drop files here or <u>choose files</u> · PDF, AI, PSD, CDR, images</span></Drop>
          {files.length > 0 && <div className="files">{files.map((f) => <FileCard key={f.id} f={f} onRemove={() => setFiles((x) => x.filter((y) => y.id !== f.id))} />)}</div>}
          <label className="field">Notes<textarea rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the team should know" /></label>
        </section>
      </div>
      <aside className="nl-side card stack">
        <h2>Delivery & payment</h2>
        <label className="field">Delivery<select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="pickup">Pickup at shop</option><option value="standard">Standard courier</option><option value="express">Express courier</option></select></label>
        <fieldset className="field"><legend>Payment now</legend>
          {[['full', 'Paid in full'], ['advance', 'Advance only'], ['none', 'Not paid yet']].map(([v, lbl]) => (
            <label key={v} className="check"><input type="radio" name="pay" value={v} checked={pay === v} onChange={() => setPay(v)} /> {lbl}</label>))}
        </fieldset>
        {pay === 'advance' && <label className="field">Advance received ₹<input type="number" min="1" step="0.01" value={advance} onChange={(e) => setAdvance(e.target.value)} /></label>}
        {pay !== 'none' && <label className="field">Paid by<select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>{['Cash', 'UPI', 'Card', 'Bank transfer'].map((m) => <option key={m}>{m}</option>)}</select></label>}
        <div>
          <div className="kv"><span>Subtotal</span><span>{money(t.sub)}</span></div>
          <div className="kv"><span>GST</span><span>{money(t.gst)}</span></div>
          <div className="kv"><span>Delivery</span><span>{money(t.delivery)}</span></div>
          <div className="kv total"><span>Total</span><span>{money(t.total)}</span></div>
          {pay !== 'full' && <div className="kv small"><span>Balance after this</span><span>{money(Math.max(0, t.total - (pay === 'advance' ? +advance || 0 : 0)))}</span></div>}
        </div>
        {err && <p className="notice warn" role="alert">{err}</p>}
        <button type="submit" className="btn-primary">Create order</button>
        <Link href="/admin/orders" className="small">Cancel</Link>
      </aside>
    </form>
  );
}
