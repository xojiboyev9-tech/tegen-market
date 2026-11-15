import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export function useList<T = any>(path: string, poll = 0) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    api<T[]>(path).then(setData).catch((e) => message.error(e.message)).finally(() => setLoading(false));
  }, [path]);
  useEffect(() => {
    setLoading(true); load();
    if (!poll) return;
    const t = setInterval(load, poll);
    return () => clearInterval(t);
  }, [load, poll]);
  return { data, loading, reload: load };
}

export async function act(fn: () => Promise<unknown>, ok = 'Saqlandi') {
  try { await fn(); message.success(ok); return true; }
  catch (e) { message.error((e as Error).message); return false; }
}
