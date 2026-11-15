import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, Product } from '../api';
import { Icon, useBackButton } from '../components';
import { maxOf, useApp } from '../store';
import { discountPct, fmt, fmtQty, lineTotal } from '../tg';

const WEIGHTS = [250, 500, 1000];

export default function ProductPage() {
  useBackButton(true);
  const { id } = useParams();
  const nav = useNavigate();
  const { add, favs, toggleFav, toast } = useApp();
  const [p, setP] = useState<Product | null>(null);
  const [q, setQ] = useState(1);
  const [custom, setCustom] = useState(false);
  const [customKg, setCustomKg] = useState('');

  useEffect(() => {
    api<Product>(`/products/${id}`).then((r) => { setP(r); setQ(r.type === 'WEIGHT' ? 500 : 1); }).catch(() => nav(-1));
  }, [id, nav]);
  if (!p) return <div className="center muted">Yuklanmoqda…</div>;

  const pct = discountPct(p.price, p.oldPrice);
  const setKg = (v: string) => {
    setCustomKg(v);
    const g = Math.round(parseFloat(v.replace(',', '.')) * 100) * 10; // 10 grammgacha aniqlik
    if (g >= 50 && g <= maxOf(p)) setQ(g);
  };

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <div className="hero">{p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : <span aria-hidden>🛒</span>}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 4px' }}>
        {pct > 0 && <span className="status s-CANCELLED">−{pct}%</span>}
        <button className="heart on" style={{ position: 'static', marginLeft: 'auto', color: favs.has(p.id) ? 'var(--red)' : 'var(--muted)', background: 'var(--surface)' }} onClick={() => toggleFav(p.id)} aria-label="Sevimlilarga">{Icon.heart(favs.has(p.id))}</button>
      </div>
      <h1 style={{ margin: '0 0 6px' }}>{p.name}</h1>
      <div className="price" style={{ fontSize: 22 }}>
        {fmt(p.price)}{p.type === 'WEIGHT' && <small> / kg</small>}
        {p.oldPrice && p.oldPrice > p.price && <span className="old" style={{ display: 'inline', marginLeft: 8, fontSize: 14 }}>{fmt(p.oldPrice)}</span>}
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        {p.type === 'WEIGHT' ? (<>
          <b>Miqdorni tanlang</b>
          <div className="chips" style={{ margin: '10px 0' }}>
            {WEIGHTS.map((w) => (
              <button key={w} className={`chip ${!custom && q === w ? 'on' : ''}`} onClick={() => { setCustom(false); setQ(w); }}>{w / 1000} kg</button>
            ))}
            <button className={`chip ${custom ? 'on' : ''}`} onClick={() => setCustom(true)}>Boshqa</button>
          </div>
          {custom && <input className="field" inputMode="decimal" placeholder="Necha kg? Masalan 0.75" value={customKg} onChange={(e) => setKg(e.target.value)} aria-label="Kilogramm" />}
          <p className="muted" style={{ margin: '10px 0 0' }}>Yig'ishda aniq tortiladi, yakuniy narx biroz farq qilishi mumkin.</p>
        </>) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <b>Soni</b>
            <span className="stepper">
              <button aria-label="Kamaytirish" onClick={() => setQ(Math.max(1, q - 1))}>−</button><span>{q}</span>
              <button className="plus" aria-label="Ko'paytirish" onClick={() => setQ(Math.min(99, q + 1))}>+</button>
            </span>
          </div>
        )}
      </div>

      {p.description && <div className="panel"><b>Mahsulot haqida</b><p style={{ margin: '6px 0 0' }}>{p.description}</p></div>}

      <div className="sticky-cta">
        <button className="btn" onClick={() => { add(p, q); toast('Savatga qo\'shildi'); nav('/cart'); }}>
          Savatga qo'shish · {fmt(lineTotal(p.type, p.price, q))} <span style={{ opacity: .8, fontWeight: 500 }}>({fmtQty(p.type, q)})</span>
        </button>
      </div>
    </div>
  );
}
