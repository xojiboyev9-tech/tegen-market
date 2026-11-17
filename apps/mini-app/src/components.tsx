import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Category, Product } from './api';
import { stepOf, useApp } from './store';
import { discountPct, fmt, fmtQty, tg } from './tg';

export const Icon = {
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  ),
  heart: (on: boolean) => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M12 21s-7-4.6-9.3-9A5.3 5.3 0 0 1 12 6.6 5.3 5.3 0 0 1 21.3 12C19 16.4 12 21 12 21Z" />
    </svg>
  ),
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </svg>
  ),
  grid: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  cart: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h2l2.4 11h10.2L20 7H6" />
      <circle cx="9" cy="19.5" r="1.4" />
      <circle cx="17" cy="19.5" r="1.4" />
    </svg>
  ),
  orders: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  ),
  user: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
    </svg>
  ),
  chev: (
    <svg className="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  ),
};

export function BottomNav() {
  const { count } = useApp();
  const items: [string, string, ReactNode][] = [
    ['/', 'Bosh sahifa', Icon.home],
    ['/catalog', 'Katalog', Icon.grid],
    ['/cart', 'Savat', Icon.cart],
    ['/orders', 'Buyurtmalar', Icon.orders],
    ['/profile', 'Profil', Icon.user],
  ];

  return (
    <nav className="nav" aria-label="Asosiy">
      {items.map(([to, label, icon]) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
          {icon}
          {label}
          {to === '/cart' && count > 0 && <span className="count">{count}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

/** Telegram'ning orqaga tugmasi: bosh sahifadan boshqa joyda ko'rinadi */
export function useBackButton(show: boolean) {
  const nav = useNavigate();

  useEffect(() => {
    const telegram = tg;
    if (!telegram) return;

    const back = () => nav(-1);

    if (show) {
      telegram.BackButton.show();
      telegram.BackButton.onClick(back);
    } else {
      telegram.BackButton.hide();
    }

    return () => telegram.BackButton.offClick(back);
  }, [show, nav]);
}

export function SearchBox({
  initial = '',
  onSubmit,
  auto,
}: {
  initial?: string;
  onSubmit: (q: string) => void;
  auto?: boolean;
}) {
  const [q, setQ] = useState(initial);

  return (
    <form
      className="search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(q.trim());
      }}
    >
      {Icon.search}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Mahsulot va toifalarni qidirish"
        aria-label="Qidirish"
        autoFocus={auto}
        enterKeyHint="search"
      />
    </form>
  );
}

export function Stepper({ product }: { product: Product }) {
  const { qtyOf, setQty } = useApp();
  const q = qtyOf(product.id);
  const step = stepOf(product);

  return (
    <span className="stepper">
      <button aria-label="Kamaytirish" onClick={() => setQty(product.id, q - step)}>
        −
      </button>
      <span>{fmtQty(product.type, q)}</span>
      <button className="plus" aria-label="Ko'paytirish" onClick={() => setQty(product.id, q + step)}>
        +
      </button>
    </span>
  );
}

export function ProductCard({ p, cats }: { p: Product; cats?: Category[] }) {
  const nav = useNavigate();
  const { add, qtyOf, favs, toggleFav, toast } = useApp();
  const pct = discountPct(p.price, p.oldPrice);
  const inCart = qtyOf(p.id) > 0;
  const emoji = cats?.find((c) => c.id === p.categoryId)?.emoji ?? '🛒';

  return (
    <div className="card">
      {pct > 0 && <span className="badge">−{pct}%</span>}
      <button
        className={`heart ${favs.has(p.id) ? 'on' : ''}`}
        aria-label="Sevimlilarga"
        onClick={() => toggleFav(p.id)}
      >
        {Icon.heart(favs.has(p.id))}
      </button>
      <button className="img" onClick={() => nav(`/product/${p.id}`)} aria-label={p.name}>
        {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" /> : <span aria-hidden>{emoji}</span>}
      </button>
      <div className="name">{p.name}</div>
      <div className="row">
        <div className="price">
          {p.oldPrice && p.oldPrice > p.price && <span className="old">{fmt(p.oldPrice)}</span>}
          {fmt(p.price)}
          {p.type === 'WEIGHT' && <small> / kg</small>}
        </div>
        {inCart ? (
          <Stepper product={p} />
        ) : (
          <button
            className="add"
            aria-label="Savatga qo'shish"
            onClick={() => {
              add(p, p.type === 'WEIGHT' ? 500 : 1);
              toast(p.type === 'WEIGHT' ? "0.5 kg savatga qo'shildi" : "Savatga qo'shildi");
            }}
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}

export function Empty({ emoji, text, action }: { emoji: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="disc" aria-hidden>
        {emoji}
      </div>
      <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'var(--ink)' }}>{text}</p>
      {action}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const t: Record<string, string> = {
    NEW: 'Kutilmoqda',
    ACCEPTED: 'Qabul qilindi',
    PREPARING: 'Tayyorlanmoqda',
    READY: 'Tayyor',
    DELIVERING: "Yo'lda",
    COMPLETED: 'Yakunlandi',
    CANCELLED: 'Bekor qilindi',
  };

  return <span className={`status s-${status}`}>{t[status] ?? status}</span>;
}
