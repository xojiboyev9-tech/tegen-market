import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, Order } from '../api';
import { StatusPill, useBackButton } from '../components';
import { useApp } from '../store';
import { fmt, fmtQty } from '../tg';

const STEP_UZ: Record<string, string> = { NEW: 'Buyurtma yuborildi', ACCEPTED: 'Qabul qilindi', PREPARING: 'Tayyorlanmoqda', READY: 'Tayyor', DELIVERING: 'Yo\'lga chiqdi', COMPLETED: 'Yakunlandi', CANCELLED: 'Bekor qilindi' };

export default function OrderDetail() {
  useBackButton(true);
  const { id } = useParams();
  const nav = useNavigate();
  const { toast } = useApp();
  const [o, setO] = useState<Order | null>(null);

  useEffect(() => {
    const load = () => api<Order>(`/orders/${id}`).then(setO).catch(() => nav('/orders', { replace: true }));
    load();
    const t = setInterval(load, 15000); // holat o'zgarishini ko'rsatish uchun
    return () => clearInterval(t);
  }, [id, nav]);
  if (!o) return <div className="center muted">Yuklanmoqda…</div>;

  const cancel = async () => {
    try { setO(await api<Order>(`/orders/${o.id}/cancel`, { method: 'POST' })); toast('Buyurtma bekor qilindi'); }
    catch (e) { toast((e as Error).message); }
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h1 style={{ margin: 0 }}>{o.code}</h1><StatusPill status={o.status} /></div>

      {o.status === 'READY' && o.pickupCode && (
        <div className="panel" style={{ marginTop: 12, textAlign: 'center' }}>
          <div className="codedisc"><div><small>Olish kodi</small><b>{o.pickupCode}</b></div></div>
          <p style={{ margin: 0 }}>Kelganda ID <b>{o.code}</b>, shu kod yoki telefon raqamingizni ayting.</p>
        </div>
      )}

      <div className="panel" style={{ marginTop: 12 }}>
        <b>Holat</b>
        <ul className="timeline" style={{ marginTop: 8 }}>
          {o.events.map((e, i) => <li key={i}>{STEP_UZ[e.status]}<span className="t">{new Date(e.at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span></li>)}
        </ul>
      </div>

      <div className="panel">
        <b>Mahsulotlar</b>
        {o.items.map((i) => (
          <div className="total" key={i.id} style={{ alignItems: 'flex-start', gap: 10 }}>
            <span>{i.name}<br /><span className="muted">{fmtQty(i.type, i.actualQuantity ?? i.quantity)}{i.actualQuantity ? ` (buyurtma: ${fmtQty(i.type, i.quantity)})` : ''}</span></span>
            <span>{fmt(i.lineFinal ?? i.lineEstimated)}</span>
          </div>
        ))}
        <div className="total big"><span>Jami</span><span>{fmt(o.totalFinal ?? o.totalEstimated)}</span></div>
        <p className="muted" style={{ margin: '6px 0 0' }}>{o.fulfillment === 'PICKUP' ? '🏪 Olib ketish' : `🚚 Yetkazish: ${o.address}`}</p>
      </div>

      {o.status === 'NEW' && <button className="btn ghost" onClick={cancel}>Buyurtmani bekor qilish</button>}
    </div>
  );
}
