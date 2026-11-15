const BASE = import.meta.env.VITE_API_URL ?? '/api';
const KEY = 'tegen_admin_token';

// Bot /admin buyrug'i havolada ?token= beradi. O'qib, manzildan darhol olib tashlaymiz.
const fromUrl = new URLSearchParams(location.search).get('token');
if (fromUrl) {
  sessionStorage.setItem(KEY, fromUrl);
  history.replaceState(null, '', location.pathname + location.hash);
}

export const getToken = () => sessionStorage.getItem(KEY);
export const setToken = (t: string | null) => (t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY));

export class ApiError extends Error { constructor(m: string, public status: number) { super(m); } }

export async function api<T = any>(path: string, o: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch(BASE + path, {
    method: o.method ?? 'GET',
    headers: { 'content-type': 'application/json', ...(getToken() ? { authorization: `Bearer ${getToken()}` } : {}) },
    body: o.body ? JSON.stringify(o.body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401) { setToken(null); window.dispatchEvent(new Event('tegen-logout')); }
    throw new ApiError(typeof data.message === 'string' ? data.message : 'Xatolik', r.status);
  }
  return data as T;
}

export async function upload(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch(BASE + '/admin/upload', { method: 'POST', headers: { authorization: `Bearer ${getToken()}` }, body: fd });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message ?? 'Yuklab bo\'lmadi');
  return data.url;
}

export const fmt = (n: number) => `${Math.round(n).toLocaleString('en-US').replace(/,/g, ' ')} so'm`;
export const fmtQty = (type: string, q: number) => (type === 'WEIGHT' ? `${+(q / 1000).toFixed(3)} kg` : `${q} dona`);

export type Role = 'SUPER_ADMIN' | 'CATEGORY_ADMIN' | 'OPERATOR' | 'COURIER' | 'CUSTOMER';
export type Me = { id: number; name: string | null; role: Role; categoryIds: number[] };
