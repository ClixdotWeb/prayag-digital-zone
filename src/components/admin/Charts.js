'use client';
// Small dependency-free charts for the admin (HTML + CSS so labels stay readable on phones).
// Single series each → one brand hue, no legend; values in text colour; tooltip on hover/focus; table view for every chart.
import Link from 'next/link';

/** Round the axis maximum up to a clean number (1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 × 10ⁿ). */
function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * p).find((x) => x >= v);
}
const compact = (v) => (v >= 1e7 ? `${+(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `${+(v / 1e5).toFixed(1)}L` : v >= 1000 ? `${+(v / 1000).toFixed(1)}K` : String(Math.round(v)));

function TableView({ head, rows }) {
  return (
    <details className="chart-tbl"><summary>View as table</summary>
      <table><thead><tr>{head.map((h, i) => <th key={h} className={i ? 'num' : ''}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j ? 'num' : ''}>{c}</td>)}</tr>)}</tbody></table>
    </details>
  );
}

/** Height above the baseline: the plot keeps 20px at the bottom for the day labels. */
const at = (f) => `calc(20px + (100% - 20px) * ${f})`;

/** Columns over time. data: [{ label, tip, value }]. fmt formats values (₹). */
export function ColumnChart({ data, fmt, empty, axisLabel = (v) => `₹${compact(v)}` }) {
  const max = Math.max(0, ...data.map((d) => d.value));
  if (!data.length || max <= 0) return <div className="chart-empty">{empty}</div>;
  const top = niceMax(max);
  const every = Math.ceil(data.length / 8); // at most ~8 x labels, counted back from the latest day so it is always labelled
  const peak = data.findIndex((d) => d.value === max);
  return <>
    <div className="cc" role="group" aria-label={`Column chart, highest ${fmt(max)} on ${data[peak].tip}`}>
      <div className="cc-axis" aria-hidden="true">{[1, 0.5, 0].map((f) => <span key={f} style={{ bottom: at(f) }}>{axisLabel(top * f)}</span>)}</div>
      <div className="cc-plot">
        <i className="cc-grid" style={{ bottom: at(0.5) }} /><i className="cc-grid" style={{ bottom: at(1) }} />
        {data.map((d, i) => (
          <div className="cc-col" key={i} tabIndex={0} aria-label={`${d.tip}: ${fmt(d.value)}`}>
            <div className="cc-bar-wrap">
              {i === peak && <b className="cc-peak">{axisLabel(d.value)}</b>}
              <i className="cc-bar" style={{ height: `${(d.value / top) * 100}%` }} />
            </div>
            <span className="cc-x" aria-hidden="true">{(data.length - 1 - i) % every === 0 ? d.label : ''}</span>
            <span className="cc-tip" role="tooltip"><b>{fmt(d.value)}</b>{d.tip}</span>
          </div>
        ))}
      </div>
    </div>
    <TableView head={['Day', 'Amount']} rows={data.map((d) => [d.tip, fmt(d.value)])} />
  </>;
}

/** Horizontal bars, one per row. rows: [{ label, value, href, sub }]. */
export function BarList({ rows, fmt = (v) => v, empty, head = ['Item', 'Value'] }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  if (!rows.length || max <= 0) return <div className="chart-empty">{empty}</div>;
  return <>
    <ul className="hb">
      {rows.map((r) => {
        const inner = <>
          <span className="hb-l">{r.label}{r.sub && <small>{r.sub}</small>}</span>
          <span className="hb-track"><i style={{ width: `${Math.max(r.value ? 2 : 0, (r.value / max) * 100)}%` }} /></span>
          <span className="hb-v">{fmt(r.value)}</span>
        </>;
        return <li key={r.label}>{r.href ? <Link href={r.href} className="hb-row">{inner}</Link> : <div className="hb-row">{inner}</div>}</li>;
      })}
    </ul>
    <TableView head={head} rows={rows.map((r) => [r.label, fmt(r.value)])} />
  </>;
}
