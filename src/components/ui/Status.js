import { STAGES } from '@/lib/data';
import { fmtDT } from '@/lib/core';

export function StatusPill({ o }) {
  if (o.cancelled) return <span className="st bad">Cancelled</span>;
  return <span className={`st s${o.status}`}>{STAGES[o.status].name}</span>;
}

export function Timeline({ o }) {
  return (
    <ol className="timeline">
      {STAGES.map((s, i) => {
        const h = [...o.history].reverse().find((x) => x.s === i);
        const cls = o.cancelled ? (i <= o.status ? 'done' : '') : i < o.status ? 'done' : i === o.status ? (i === 10 ? 'done' : 'cur') : '';
        return <li key={s.name} className={cls}>{s.name}{h && <div className="meta">{fmtDT(h.at)} · {h.by}</div>}</li>;
      })}
    </ol>
  );
}
