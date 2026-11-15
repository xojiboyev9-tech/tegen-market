import { tg } from './tg';

const BASE = import.meta.env.VITE_API_URL ?? '/api';
let token: string | null = null;

export type Product = {
  id: number; name: string; description?: string | null; imageUrl?: string | null; price: number; oldPrice?: number | null;
  type: 'PIECE' | 'WEIGHT'; categoryId: number; isTrending?: boolean;
};
export type Category = { id: number; name: string; emoji?: string | null };
export type Banner = { id: number; title: string; subtitle?: string | null; buttonText?: string | null; imageUrl?: string | null; categoryId?: number | null; productId?: number | null };
export type Me = { id: number; name: string | null; phone: string | null; role: string };
export type OrderItem = { id: number; productId: number; name: string; type: 'PIECE' | 'WEIGHT'; unitPrice: number; quantity: number; actualQuantity?: number | null; lineEstimated: number; lineFinal?: number | null };
export type Order = {
  id: number; code: string; pickupCode?: string; status: string; fulfillment: 'PICKUP' | 'DELIVERY'; address?: string | null; note?: string | null;
  totalEstimated: number; totalFinal?: number | null; createdAt: string; items: OrderItem[]; events: { status: string; at: string }[];
};

export async function login(): Promise<Me> {
  const initData = tg?.initData || (import.meta.env.DEV ? `dev:${import.meta.env.VITE_DEV_TELEGRAM_ID ?? '1'}` : '');
  if (!initData) throw new Error('Ilovani Telegram ichidan oching');
  const r = await raw<{ token: string; user: Me }>('/auth/telegram', { method: 'POST', body: { initData } });
  token = r.token;
  return r.user;
}

async function raw<T>(path: string, o: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch(BASE + path, {
    method: o.method ?? 'GET',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: o.body ? JSON.stringify(o.body) : undefined,
  });
  if (r.status === 401 && token) { token = null; throw new Error('401'); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof data.message === 'string' ? data.message : 'Xatolik yuz berdi');
  return data as T;
}

export async function api<T>(path: string, o: { method?: string; body?: unknown } = {}): Promise<T> {
  try { return await raw<T>(path, o); }
  catch (e) {
    if ((e as Error).message === '401') { await login(); return raw<T>(path, o); } // token eskirsa jimgina yangilanadi
    throw e;
  }
}
