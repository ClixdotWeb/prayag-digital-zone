'use client';
// Print Now job details (B&W A4 / Colour A4 / A3 Express): files with page counts, sides, copies, sheets, amount.
// Shown in admin order detail and on the production screen (amount only when showMoney).
import { fileSize, money } from '@/lib/core';
import { downloadFile } from '@/lib/actions';

export const isPrintJob = (it) => it.kind === 'print' && !!it.print;

export function printLabel(o) {
  if (o.type === 'bw') return 'B&W A4';
  return o.size === 'A3' ? 'Colour A3 Express' : `Colour ${o.size}`;
}

export default function PrintJob({ it, showMoney }) {
  const o = it.print.options, q = it.print.quote;
  const files = it.files.filter((f) => !f.superseded);
  const facts = [
    ['Service', printLabel(o)],
    ...(o.type === 'colour' ? [['Paper', `${o.gsm} GSM`]] : []),
    ['Sides', o.side === 'double' ? 'Double side' : 'Single side'],
    ['Pages', q.manual ? '—' : q.pages.toLocaleString('en-IN')],
    ['Copies', q.copies.toLocaleString('en-IN')],
    ['Printed sides', q.quantity.toLocaleString('en-IN')],
    ['Sheets', q.sheets.toLocaleString('en-IN')],
    ...(showMoney ? [['Amount', money(it.total)]] : []),
  ];
  return (
    <div className="pj">
      <dl className="pj-facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {q.manual && <p className="small muted">No file — {q.quantity.toLocaleString('en-IN')} prints entered by the customer.</p>}
      {files.length > 0 && (
        <table className="pj-files">
          <thead><tr><th>File</th><th className="num">Pages</th><th className="num">Size</th><th><span className="sr-only">Download</span></th></tr></thead>
          <tbody>{files.map((f) => (
            <tr key={f.id}><td className="pj-name">{f.name}</td><td className="num">{f.pages ?? '—'}</td><td className="num small muted">{fileSize(f.size)}</td>
              <td className="num">{f.url ? <a className="btn btn-sm" href={f.url} download>Download</a> : <button type="button" className="btn-sm" onClick={() => downloadFile(f.name)}>Download</button>}</td></tr>
          ))}</tbody>
          <tfoot><tr><td>Total × {q.copies} cop{q.copies === 1 ? 'y' : 'ies'}</td><td className="num">{q.pages}</td><td colSpan="2" /></tr></tfoot>
        </table>
      )}
    </div>
  );
}
