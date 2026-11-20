'use client';
// File cards, drag & drop upload areas and the per-item artwork block (customer / admin / production views).
import { useState } from 'react';
import { fileSize, readUploads } from '@/lib/core';
import { downloadFile, orderArtwork } from '@/lib/actions';

export function FileCard({ f, onRemove, children }) {
  const th = f.preview ? <img src={f.preview} alt="" /> : f.blobUrl ? <a href={f.blobUrl} target="_blank" rel="noopener">PDF ↗</a> : f.ext.toUpperCase();
  return (
    <div className="file" style={f.superseded ? { opacity: 0.55 } : undefined}>
      {onRemove && <button className="x btn-sm" onClick={onRemove} aria-label="Remove">×</button>}
      <div className="thumb">{th}</div>
      <div className="name">{f.name}</div>
      <div className="muted">{fileSize(f.size)} · v{f.version}{f.superseded ? ' · replaced' : ''}</div>
      {children}
    </div>
  );
}

/** <label class="drop"> with drag & drop; onFiles(records) gets validated file records. */
export function Drop({ className = 'drop', onFiles, multiple = true, accept, children }) {
  const [over, setOver] = useState(false);
  const take = async (list) => { const recs = await readUploads(list); if (recs.length) onFiles(recs); };
  return (
    <label className={`${className}${over ? ' over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}>
      {children}
      <input type="file" multiple={multiple} hidden accept={accept} onChange={(e) => { take(e.target.files); e.target.value = ''; }} />
    </label>
  );
}

/** Hidden file input inside a label (used for Replace / + Add file buttons). */
function PickFile({ className, style, multiple, onFiles, children }) {
  return (
    <label className={className} style={style}>{children}
      <input type="file" hidden multiple={multiple} onChange={async (e) => { const r = await readUploads(e.target.files); e.target.value = ''; if (r.length) onFiles(r); }} />
    </label>
  );
}

export function ItemFiles({ o, it, idx, mode }) {
  const canReplace = mode === 'customer' && o.status <= 3 && !o.cancelled;
  return (
    <>
      <div className="files">
        {it.files.length ? it.files.map((f) => (
          <FileCard key={f.id} f={f}>
            {!f.superseded && <>
              {mode !== 'customer' && <button className="btn-sm" onClick={() => downloadFile(f.name)}>Download</button>}
              {canReplace && <PickFile className="btn btn-sm" onFiles={(r) => orderArtwork('replace', o.id, idx, r, f.id)}>Replace</PickFile>}
            </>}
          </FileCard>
        )) : <div className="muted small">No design uploaded yet.</div>}
      </div>
      {canReplace && <PickFile className="btn btn-sm" style={{ marginTop: 8 }} multiple onFiles={(r) => orderArtwork('add', o.id, idx, r)}>+ Add file</PickFile>}
    </>
  );
}
