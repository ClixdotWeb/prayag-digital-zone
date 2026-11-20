'use client';
import { useApp } from '@/context/StoreProvider';
import { SAMPLE_LIBRARY } from '@/lib/data';
import { downloadFile } from '@/lib/actions';

export default function Samples() {
  useApp();
  return (
    <div className="page dr-samples"><div className="slist">
      <h1>Samples & templates</h1>
      <p className="muted">Paper samples, colour charts, texture photos and ready-made design templates. Managed from the admin panel.</p>
      <div className="card slist-card">{SAMPLE_LIBRARY.map((s) => (
        <div className="srow" key={s.name}>
          <div><div className="sname">{s.name}</div><div className="muted small">{s.type}</div></div>
          <button className="sdl" onClick={() => downloadFile(s.name)} aria-label={`Download ${s.name}`}>
            <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></svg>
            <span>Download</span></button>
        </div>))}</div>
    </div></div>
  );
}
