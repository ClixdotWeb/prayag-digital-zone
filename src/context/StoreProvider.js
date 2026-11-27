'use client';
// Loads the saved state once in the browser and re-renders the app whenever it changes.
import { createContext, useContext, useEffect, useState } from 'react';
import { load, onChange, store } from '@/lib/core';
import { loadRole } from '@/lib/roles';

const Ctx = createContext({ ready: false, ver: 0 });

export function StoreProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [ver, setVer] = useState(0);
  useEffect(() => {
    load();
    loadRole();
    setReady(true);
    return onChange(() => setVer((v) => v + 1));
  }, []);
  return <Ctx.Provider value={{ ready, ver }}>{children}</Ctx.Provider>;
}

/** Re-renders the caller on every state change. Returns { S, ready }. */
export function useApp() {
  const { ready } = useContext(Ctx);
  return { S: store.S, ready };
}
