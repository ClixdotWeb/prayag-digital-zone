'use client';
// Shared admin building blocks: URL-backed filters, date range picker, KPI card, page head, generic list.
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { change, dayKey, parseDay, period, RANGES } from '@/lib/metrics';
import { downloadCsv } from '@/lib/actions';

/* ---------- Filters live in the URL, so links (KPI cards) and the back button work ---------- */
export function useQuery() {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const get = (k, d = '') => sp.get(k) ?? d;
  const set = (patch) => {
    const q = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) { if (v === '' || v == null) q.delete(k); else q.set(k, String(v)); }
    if (!('page' in patch)) q.delete('page'); // any filter change goes back to page 1
    const s = q.toString();
    router.replace(s ? `${path}?${s}` : path, { scroll: false });
  };
  return { get, set };
}

/** Current period from ?range=today|7d|30d|custom&from=&to= (default 7 days). */
export function useRange(def = '7d') {
  const { get } = useQuery();
  return period(get('range', def), get('from'), get('to'));
}
export const prevLabel = (p) => (p.key === 'today' ? 'yesterday' : `prev. ${p.days} days`);
export const rangeQuery = (p) => (p.key === 'custom' ? `range=custom&from=${p.from}&to=${p.to}` : `range=${p.key}`);

export function RangePicker({ def = '7d' }) {
  const { get, set } = useQuery();
  const p = useRange(def);
  const key = get('range', def);
  return (
    <div className="adm-range" role="group" aria-label="Date range">
      <div className="adm-seg">
        {RANGES.map(([k, l]) => (
          <button key={k} type="button" className={key === k ? 'on' : ''} aria-pressed={key === k}
            onClick={() => set(k === 'custom' ? { range: k, from: p.from, to: p.to } : { range: k, from: '', to: '' })}>{l}</button>
        ))}
      </div>
      {key === 'custom' && <span className="adm-dates">
        <input type="date" aria-label="From" value={get('from', p.from)} max={get('to', p.to)} onChange={(e) => e.target.value && set({ from: e.target.value })} />
        <span className="muted">to</span>
        <input type="date" aria-label="To" value={get('to', p.to)} min={get('from', p.from)} onChange={(e) => e.target.value && set({ to: e.target.value })} />
      </span>}
      <span className="small muted adm-range-lbl">{fmtDay(p.start)}{p.days > 1 ? ` – ${fmtDay(p.end - 1)}` : ''}</span>
    </div>
  );
}
const fmtDay = (t) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function PageHead({ title, sub, children }) {
  return <div className="adm-head"><div><h1>{title}</h1>{sub && <p className="muted small">{sub}</p>}</div>{children && <div className="adm-head-acts">{children}</div>}</div>;
}

/**
 * KPI card. prev → shows the change vs the previous period. good: 'up' | 'down' (which direction is good news).
 */
export function Kpi({ label, value, href, prev, fmt = (v) => v, raw, good = 'up', sub, p, tone }) {
  let delta = null;
  if (prev !== undefined && p) {
    const c = change(raw ?? value, prev);
    const goodNews = c.dir === 'flat' ? null : (c.dir === good);
    delta = (
      <span className={`kpi-delta ${goodNews === null ? '' : goodNews ? 'good' : 'bad'}`}>
        <span aria-hidden="true">{c.dir === 'up' ? '▲' : c.dir === 'down' ? '▼' : '='}</span>{' '}
        <span className="sr-only">{c.dir === 'up' ? 'up' : c.dir === 'down' ? 'down' : 'same'} </span>
        {c.dir === 'flat' ? 'same' : c.pct !== null ? `${Math.abs(c.pct)}%` : fmt(Math.abs(c.diff))} vs {prevLabel(p)}
      </span>
    );
  }
  const body = <>
    <span className="kpi-l">{label}</span>
    <span className="kpi-v">{fmt(raw ?? value)}</span>
    {delta}{sub && <span className="kpi-sub">{sub}</span>}
  </>;
  return href ? <Link href={href} className={`kpi ${tone || ''}`}>{body}</Link> : <div className={`kpi ${tone || ''}`}>{body}</div>;
}

export const Empty = ({ children }) => <div className="adm-empty">{children}</div>;

/**
 * Generic list with search, filters, date range, sort, pagination and CSV export of the filtered result.
 * columns: [{ key, label, value(row) (sort + CSV), render(row), num, sort: false, csvOnly }]
 * filters: [{ key, label, options: [[value, label]], def, test(row, value) }]
 * date(row) → timestamp enables the From/To filter. renderCard(row) → cards instead of a table.
 */
export function DataList({ rows, columns, search, searchLabel = 'Search', filters = [], date, defSort, csv, rowClass, pageSize = 25, empty = 'Nothing here.', renderCard, rowKey = (r) => r.id }) {
  const { get, set } = useQuery();
  const q = get('q').trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  let list = rows;
  if (q && search) list = list.filter((r) => { const s = search(r).toLowerCase(); return s.includes(q) || (digits.length >= 4 && s.replace(/\D/g, '').includes(digits)); });
  for (const f of filters) { const v = get(f.key, f.def ?? ''); if (v !== '') list = list.filter((r) => f.test(r, v)); }
  const from = get('from'), to = get('to');
  if (date && from) list = list.filter((r) => date(r) >= parseDay(from));
  if (date && to) list = list.filter((r) => date(r) < parseDay(to) + 86400000);
  const sortable = columns.filter((c) => c.value && c.sort !== false && !c.csvOnly);
  const [sk, sd] = get('sort', defSort || '').split(':');
  const sc = columns.find((c) => c.key === sk);
  if (sc?.value) {
    const dir = sd === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => { const x = sc.value(a), y = sc.value(b); return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir; });
  }
  const pages = Math.max(1, Math.ceil(list.length / pageSize));
  const page = Math.min(pages, Math.max(1, +get('page', '1') || 1));
  const shown = list.slice((page - 1) * pageSize, page * pageSize);
  const toggleSort = (c) => set({ sort: `${c.key}:${sk === c.key && sd === 'desc' ? 'asc' : 'desc'}` });
  const exportCsv = () => {
    if (csv.custom) return csv.custom(list);
    const cols = columns.filter((c) => c.value || c.csv);
    downloadCsv(csv.name, cols.map((c) => c.label), list.map((r) => cols.map((c) => (c.csv ? c.csv(r) : c.value(r)))));
  };
  const visible = columns.filter((c) => !c.csvOnly);
  const active = !!q || filters.some((f) => get(f.key, f.def ?? '') !== (f.def ?? '')) || !!from || !!to;

  return <>
    <div className="adm-toolbar">
      {search && <input type="search" className="adm-search-in" placeholder={searchLabel} aria-label={searchLabel} defaultValue={get('q')} key={'q' + get('q')}
        onKeyDown={(e) => { if (e.key === 'Enter') set({ q: e.currentTarget.value.trim() }); }} onBlur={(e) => { if (e.target.value.trim() !== get('q')) set({ q: e.target.value.trim() }); }} />}
      {filters.map((f) => (
        <label key={f.key} className="adm-filter"><span>{f.label}</span>
          <select value={get(f.key, f.def ?? '')} onChange={(e) => set({ [f.key]: e.target.value === (f.def ?? '') ? '' : e.target.value })}>
            {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></label>
      ))}
      {date && <span className="adm-filter adm-dates"><span>Date</span>
        <input type="date" aria-label="From date" value={from} onChange={(e) => set({ from: e.target.value })} />
        <input type="date" aria-label="To date" value={to} onChange={(e) => set({ to: e.target.value })} /></span>}
      {sortable.length > 0 && <label className="adm-filter adm-sort-sel"><span>Sort</span>
        <select value={sc ? `${sk}:${sd}` : ''} onChange={(e) => set({ sort: e.target.value })}>
          {!sc && <option value="">Default</option>}
          {sortable.flatMap((c) => [<option key={c.key + 'd'} value={`${c.key}:desc`}>{c.label} ↓</option>, <option key={c.key + 'a'} value={`${c.key}:asc`}>{c.label} ↑</option>])}
        </select></label>}
      <span className="adm-toolbar-end">
        {active && <button type="button" className="btn-sm" onClick={() => set(Object.fromEntries([['q', ''], ['from', ''], ['to', ''], ...filters.map((f) => [f.key, ''])]))}>Clear filters</button>}
        {csv && <button type="button" className="btn-sm" onClick={exportCsv} disabled={!list.length}>Export CSV ({list.length})</button>}
      </span>
    </div>
    {!shown.length ? <Empty>{active ? 'No results match these filters.' : empty}</Empty>
      : renderCard ? <div className="adm-cards">{shown.map((r) => <div key={rowKey(r)}>{renderCard(r)}</div>)}</div>
        : <div className="table-wrap"><table className="rt">
          <thead><tr>{visible.map((c) => (
            <th key={c.key} className={c.num ? 'num' : ''} aria-sort={sk === c.key ? (sd === 'asc' ? 'ascending' : 'descending') : undefined}>
              {c.value && c.sort !== false ? <button type="button" className="th-sort" onClick={() => toggleSort(c)}>{c.label}{sk === c.key ? (sd === 'asc' ? ' ↑' : ' ↓') : ''}</button> : c.label}
            </th>))}</tr></thead>
          <tbody>{shown.map((r) => (
            <tr key={rowKey(r)} className={rowClass?.(r) || ''}>
              {visible.map((c) => <td key={c.key} data-label={c.label} className={c.num ? 'num' : ''}><div>{c.render ? c.render(r) : c.value(r)}</div></td>)}
            </tr>))}</tbody>
        </table></div>}
    {list.length > pageSize && (
      <nav className="adm-pager" aria-label="Pages">
        <span className="small muted">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, list.length)} of {list.length}</span>
        <button type="button" className="btn-sm" disabled={page <= 1} onClick={() => set({ page: page - 1 })}>‹ Prev</button>
        {Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1).map((n, i, arr) => (
          <span key={n}>{i > 0 && n - arr[i - 1] > 1 && <span className="muted"> … </span>}
            <button type="button" className={`btn-sm ${n === page ? 'on' : ''}`} aria-current={n === page ? 'page' : undefined} onClick={() => set({ page: n })}>{n}</button></span>
        ))}
        <button type="button" className="btn-sm" disabled={page >= pages} onClick={() => set({ page: page + 1 })}>Next ›</button>
      </nav>
    )}
  </>;
}

/** Typed confirmation for destructive actions (e.g. type RESET). */
export function TypeToConfirm({ word, label, button, onConfirm, children }) {
  const [v, setV] = useState('');
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); if (v.trim().toUpperCase() === word) { onConfirm(); setV(''); } }}>
      {children}
      <label className="field">{label}<input value={v} onChange={(e) => setV(e.target.value)} placeholder={word} autoComplete="off" /></label>
      <button type="submit" className="btn-danger" disabled={v.trim().toUpperCase() !== word}>{button}</button>
    </form>
  );
}

export { dayKey };
