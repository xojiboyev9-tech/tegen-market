// Telegram Mini App yordamchilari
type WebApp = {
  initData: string; ready(): void; expand(): void; close(): void; setHeaderColor?(c: string): void;
  BackButton: { show(): void; hide(): void; onClick(f: () => void): void; offClick(f: () => void): void };
  HapticFeedback?: { notificationOccurred(t: 'success' | 'error' | 'warning'): void };
};
export const tg: WebApp | undefined = (window as unknown as { Telegram?: { WebApp?: WebApp } }).Telegram?.WebApp;

export function initTelegram() {
  tg?.ready();
  tg?.expand();
  try { tg?.setHeaderColor?.('#fb0200'); } catch { /* eski versiya */ }
}

export const fmt = (n: number) => `${Math.round(n).toLocaleString('en-US').replace(/,/g, ' ')} so'm`;
export const fmtQty = (type: 'PIECE' | 'WEIGHT', q: number) => (type === 'WEIGHT' ? `${+(q / 1000).toFixed(3)} kg` : `${q} dona`);
export const lineTotal = (type: 'PIECE' | 'WEIGHT', price: number, q: number) => (type === 'WEIGHT' ? Math.round((price * q) / 1000) : price * q);
export const discountPct = (price: number, old?: number | null) => (old && old > price ? Math.round((1 - price / old) * 100) : 0);
