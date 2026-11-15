import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, Me, Product } from './api';
import { lineTotal } from './tg';

export type CartLine = { product: Product; quantity: number }; // WEIGHT: gramm, PIECE: dona

type Ctx = {
  me: Me;
  cart: CartLine[];
  count: number;
  total: number;
  qtyOf(id: number): number;
  add(p: Product, q: number): void;
  setQty(id: number, q: number): void;
  clear(): void;
  favs: Set<number>;
  toggleFav(id: number): void;
  toast(text: string): void;
};

const C = createContext<Ctx>(null as never);
export const useApp = () => useContext(C);

const KEY = 'tegen_cart_v1';
const load = (): CartLine[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } };

export const stepOf = (p: Product) => (p.type === 'WEIGHT' ? 250 : 1);
export const maxOf = (p: Product) => (p.type === 'WEIGHT' ? 20000 : 99);

export function AppProvider({ me, children }: { me: Me; children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>(load);
  const [favs, setFavs] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState('');

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* xotira to'la */ } }, [cart]);
  useEffect(() => { api<Product[]>('/favorites').then((l) => setFavs(new Set(l.map((p) => p.id)))).catch(() => {}); }, []);

  const toast = useCallback((t: string) => { setMsg(t); setTimeout(() => setMsg(''), 2200); }, []);

  const value = useMemo<Ctx>(() => ({
    me, cart, favs, toast,
    count: cart.length,
    total: cart.reduce((s, l) => s + lineTotal(l.product.type, l.product.price, l.quantity), 0),
    qtyOf: (id) => cart.find((l) => l.product.id === id)?.quantity ?? 0,
    add: (p, q) => setCart((c) => {
      const ex = c.find((l) => l.product.id === p.id);
      if (!ex) return [...c, { product: p, quantity: Math.min(q, maxOf(p)) }];
      return c.map((l) => (l.product.id === p.id ? { ...l, product: p, quantity: Math.min(l.quantity + q, maxOf(p)) } : l));
    }),
    setQty: (id, q) => setCart((c) => (q <= 0 ? c.filter((l) => l.product.id !== id) : c.map((l) => (l.product.id === id ? { ...l, quantity: Math.min(q, maxOf(l.product)) } : l)))),
    clear: () => setCart([]),
    toggleFav: (id) => {
      const on = favs.has(id);
      setFavs((s) => { const n = new Set(s); on ? n.delete(id) : n.add(id); return n; });
      api(`/favorites/${id}`, { method: on ? 'DELETE' : 'POST' }).catch(() => toast('Saqlab bo\'lmadi'));
    },
  }), [me, cart, favs, toast]);

  return (
    <C.Provider value={value}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </C.Provider>
  );
}
