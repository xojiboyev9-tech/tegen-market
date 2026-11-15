import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Order } from '../api';
import { Empty, Stepper } from '../components';
import { useApp } from '../store';
import { fmt, lineTotal, tg } from '../tg';

export default function Cart() {
  const nav = useNavigate();
  const { cart, total, clear, setQty, toast } = useApp();
  const [mode, setMode] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [address, setAddress] = useState('');
  const [saved, setSaved] = useState<{ id: number; text: string }[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<{ id: number; text: string }[]>('/addresses').then(setSaved).catch(() => {}); }, []);

  if (!cart.length) return (
    <div className="page">
      <h1>Savat</h1>
      <Empty
        emoji="🛒"
        text="Savat hozircha bo'sh"
        action={
          <button className="btn" style={{ marginTop: 16, maxWidth: 260 }} onClick={() => nav('/catalog')}>
            Katalogga o'tish
          </button>
        }
      />
    </div>
  );

  const hasWeight = cart.some((l) => l.product.type === 'WEIGHT');

  const submit = async () => {
    if (mode === 'DELIVERY' && address.trim().length < 5) return toast('Yetkazish manzilini kiriting');
    setBusy(true);
    try {
      const o = await api<Order>('/orders', {
        method: 'POST',
        // Faqat ID va miqdor yuboriladi: narxni server o'zi hisoblaydi
        body: { items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })), fulfillment: mode, address: mode === 'DELIVERY' ? address.trim() : null, note: note.trim() || null },
      });
      if (mode === 'DELIVERY' && !saved.some((s) => s.text === address.trim())) api('/addresses', { method: 'POST', body: { text: address.trim() } }).catch(() => {});
      tg?.HapticFeedback?.notificationOccurred('success');
      clear();
      nav(`/orders/${o.id}`, { replace: true });
    } catch (e) { tg?.HapticFeedback?.notificationOccurred('error'); toast((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <h1>Savat <span className="muted" style={{ fontWeight: 500 }}>{cart.length} ta mahsulot</span></h1>
      <div className="panel">
        {cart.map((l) => (
          <div className="cart-line" key={l.product.id}>
            <div className="thumb">{l.product.imageUrl ? <img src={l.product.imageUrl} alt="" /> : <span aria-hidden>🛒</span>}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>{l.product.name}</div>
              <div className="muted">{fmt(l.product.price)}{l.product.type === 'WEIGHT' ? ' / kg' : ''}</div>
              <div style={{ marginTop: 6 }}><Stepper product={l.product} /></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <b>{fmt(lineTotal(l.product.type, l.product.price, l.quantity))}</b>
              <div><button className="link" onClick={() => setQty(l.product.id, 0)}>O'chirish</button></div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <b>Qanday olasiz?</b>
        <div className="chips" style={{ margin: '10px 0 0' }}>
          <button className={`chip ${mode === 'PICKUP' ? 'on' : ''}`} onClick={() => setMode('PICKUP')}>🏪 Olib ketaman</button>
          <button className={`chip ${mode === 'DELIVERY' ? 'on' : ''}`} onClick={() => setMode('DELIVERY')}>🚚 Yetkazib bering</button>
        </div>
        {mode === 'DELIVERY' && (<div style={{ marginTop: 10 }}>
          <textarea className="field" rows={2} placeholder="Manzil: ko'cha, uy, mo'ljal" value={address} onChange={(e) => setAddress(e.target.value)} aria-label="Manzil" />
          {saved.length > 0 && <div className="chips" style={{ marginTop: 8 }}>{saved.slice(0, 3).map((s) => <button key={s.id} className="chip" onClick={() => setAddress(s.text)}>{s.text.slice(0, 28)}</button>)}</div>}
          <p className="muted" style={{ margin: '8px 0 0' }}>Yetkazish narxini operator buyurtmani tasdiqlaganda aytadi.</p>
        </div>)}
        <textarea className="field" rows={2} style={{ marginTop: 10 }} placeholder="Izoh (ixtiyoriy)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Izoh" maxLength={300} />
      </div>

      <div className="panel">
        <div className="total"><span>Mahsulotlar</span><span>{fmt(total)}</span></div>
        <div className="total big"><span>Jami</span><span>{fmt(total)}</span></div>
        {hasWeight && <p className="muted" style={{ margin: '8px 0 0' }}>Og'irlik bo'yicha mahsulotlar yig'ishda tortiladi, yakuniy summa farq qilishi mumkin.</p>}
      </div>

      <div className="sticky-cta"><button className="btn" disabled={busy} onClick={submit}>{busy ? 'Yuborilmoqda…' : `Buyurtma berish · ${fmt(total)}`}</button></div>
    </div>
  );
}
