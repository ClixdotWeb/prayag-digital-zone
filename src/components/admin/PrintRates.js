'use client';
// Admin > Print rates — edits data/print-rates.json through /api/print/rates (needs the admin key from .env.local).
import { useEffect, useState } from 'react';
import { toast } from '@/lib/core';
import { GSMS, SIDES, slabLabel } from '@/lib/print-pricing';
import { fetchRates } from '@/lib/print-actions';

const KEY_STORE = 'prayag-print-admin-key';
const toRs = (p) => (p / 100).toFixed(2);
const clone = (x) => JSON.parse(JSON.stringify(x));

function RateTable({ title, slabs, rows, onEdit }) {
  return (
    <div className="mt">
      <h3>{title}</h3>
      <div className="table-wrap"><table>
        <thead><tr><th>₹ per printed side</th>{slabs.map((_, i) => <th key={i} className="num">{slabLabel(slabs, i)}</th>)}</tr></thead>
        <tbody>{rows.map(([label, path, row]) => (
          <tr key={label}><td>{label}</td>{row.map((v, i) => (
            <td key={i} className="num"><input type="number" min="0.01" step="0.01" defaultValue={toRs(v)} key={`${label}-${i}-${v}`} style={{ width: 90 }}
              onBlur={(e) => onEdit(path, i, e.target.value)} aria-label={`${label}, ${slabLabel(slabs, i)} prints`} /></td>
          ))}</tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}

export default function PrintRates() {
  const [rates, setRates] = useState(null);
  const [err, setErr] = useState('');
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRates().then(setRates).catch((e) => setErr(e.message));
    try { setKey(sessionStorage.getItem(KEY_STORE) || ''); } catch { /* storage blocked */ }
  }, []);
  if (err) return <p className="pr-err">{err}</p>;
  if (!rates) return <p className="muted">Loading rates…</p>;

  const edit = (path, i, value) => {
    const paise = Math.round(parseFloat(value) * 100);
    if (!(paise > 0)) { toast('Rate must be more than ₹0'); return; }
    const next = clone(rates);
    let row = next; for (const k of path) row = row[k];
    row[i] = paise;
    setRates(next);
  };
  const save = async () => {
    setSaving(true);
    try { sessionStorage.setItem(KEY_STORE, key); } catch { /* storage blocked */ }
    try {
      const res = await fetch('/api/print/rates', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-key': key }, body: JSON.stringify(rates) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRates(data); toast('Print rates saved', 'New prices apply to the website straight away');
    } catch (e) { toast('Rates not saved', e.message); }
    setSaving(false);
  };

  const side = (s) => (s === 'single' ? 'Single side' : 'Double side');
  return <>
    {rates.placeholder && <div className="pnote"><span><b>These are placeholder rates, not the real tariff.</b> Enter the real rates, untick “placeholder” and save.</span></div>}
    <p className="muted">Rates are in rupees per printed side, before GST. Each order is charged at its slab rate, but never more than the price of a bigger slab’s minimum order.{rates.updatedAt ? ` Last saved ${new Date(rates.updatedAt).toLocaleString('en-IN')}.` : ''}</p>

    <RateTable title="B&W A4" slabs={rates.bw.slabs} onEdit={edit}
      rows={SIDES.map((s) => [side(s), ['bw', 'rates', s], rates.bw.rates[s]])} />
    {['A4', 'A3'].map((size) => (
      <RateTable key={size} title={`Colour ${size === 'A3' ? 'A3 Express' : 'A4'}`} slabs={rates.colour.slabs[size]} onEdit={edit}
        rows={GSMS.flatMap((g) => SIDES.map((s) => [`${g} GSM · ${side(s)}`, ['colour', 'rates', size, String(g), s], rates.colour.rates[size][g][s]]))} />
    ))}

    <div className="card row mt" style={{ alignItems: 'flex-end' }}>
      <label className="check"><input type="checkbox" checked={!!rates.placeholder} onChange={(e) => setRates({ ...rates, placeholder: e.target.checked })} /> Placeholder rates (shows “Sample rates” to customers)</label>
      <label className="field" style={{ flex: 1, minWidth: 200 }}>Admin key<input type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" placeholder="PRINT_ADMIN_KEY from .env.local" /></label>
      <button className="btn-primary" onClick={save} disabled={saving || !key}>{saving ? 'Saving…' : 'Save rates'}</button>
    </div>
    <p className="small muted">Slab ranges are set in data/print-rates.json.</p>
  </>;
}
