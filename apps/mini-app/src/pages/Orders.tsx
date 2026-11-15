import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Order } from '../api';
import { Empty, StatusPill } from '../components';
import { fmt } from '../tg';

const TABS: [string, string, (o: Order) => boolean][] = [
  ['all', 'Barchasi', () => true],
  ['active', 'Faol', (o) => !['COMPLETED', 'CANCELLED'].includes(o.status)],
  ['done', 'Yakunlangan', (o) => o.status === 'COMPLETED'],
  ['cancel', 'Bekor qilingan', (o) => o.status === 'CANCELLED'],
];

export default function Orders() {
  const nav = useNavigate();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [tab, setTab] = useState('all');
  useEffect(() => { api<Order[]>('/orders/my').then(setOrders).catch(() => setOrders([])); }, []);
  const shown = (orders ?? []).filter(TABS.find((t) => t[0] === tab)![2]);

  return (
    <div className="page">
      <h1>Buyurtmalarim</h1>
      <div className="tabs">{TABS.map(([k, label]) => <button key={k} className={`chip ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{label}</button>)}</div>
      {orders && !shown.length && (
        <Empty
          emoji="📦"
          text={tab === "all" ? "Hali buyurtma berilmagan" : "Bu bo'limda buyurtma yo'q"}
          action={tab === "all" ? <button className="btn" style={{ marginTop: 16, maxWidth: 240 }} onClick={() => nav("/catalog")}>Xarid qilish</button> : undefined}
        />
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {shown.map((o) => (
          <button key={o.id} className="panel" style={{ textAlign: 'left', margin: 0 }} onClick={() => nav(`/orders/${o.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b>{o.code}</b><StatusPill status={o.status} /></div>
            <div className="muted" style={{ margin: '4px 0 8px' }}>{new Date(o.createdAt).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {o.items.length} ta mahsulot · {o.fulfillment === 'PICKUP' ? 'Olib ketish' : 'Yetkazish'}</div>
            <b>{fmt(o.totalFinal ?? o.totalEstimated)}</b>
          </button>
        ))}
      </div>
    </div>
  );
}
