import { useEffect, useState } from 'react';
import { api, Category, Product } from '../api';
import { Empty, ProductCard, useBackButton } from '../components';
import { useApp } from '../store';
import { tg } from '../tg';

export function Favorites() {
  useBackButton(true);
  const [items, setItems] = useState<Product[] | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const { favs } = useApp();
  useEffect(() => { api<Product[]>('/favorites').then(setItems).catch(() => setItems([])); api<Category[]>('/categories').then(setCats).catch(() => {}); }, []);
  const shown = (items ?? []).filter((p) => favs.has(p.id));
  return (
    <div className="page"><h1>Sevimlilar</h1>
      {items && !shown.length && <Empty emoji="❤️" text="Hozircha sevimli mahsulot yo'q." />}
      <div className="grid">{shown.map((p) => <ProductCard key={p.id} p={p} cats={cats} />)}</div>
    </div>
  );
}

type Card = { id: number; number?: string | null; status: string };
const CARD_UZ: Record<string, string> = { PENDING: 'Tekshirilmoqda', LINKED: 'Biriktirilgan', REJECTED: 'Rad etilgan' };

export function DiscountCard() {
  useBackButton(true);
  const { toast } = useApp();
  const [cards, setCards] = useState<Card[]>([]);
  const [number, setNumber] = useState('');
  const load = () => api<Card[]>('/cards').then(setCards).catch(() => {});
  useEffect(() => { load(); }, []);
  const send = async () => {
    try { await api('/cards', { method: 'POST', body: { number } }); setNumber(''); toast('Yuborildi, xodim tekshiradi'); load(); }
    catch { toast('Karta raqami noto\'g\'ri'); }
  };
  return (
    <div className="page"><h1>Diskont karta</h1>
      <div className="panel">
        <b>Kartani qo'shish</b>
        <input className="field" style={{ margin: '10px 0' }} placeholder="Karta raqami" value={number} onChange={(e) => setNumber(e.target.value)} aria-label="Karta raqami" />
        <button className="btn" disabled={number.trim().length < 4} onClick={send}>Yuborish</button>
        <p className="muted" style={{ margin: '10px 0 0' }}>Rasmini yubormoqchimisiz? Botda «💳 Diskont karta» tugmasini bosing.</p>
      </div>
      {cards.map((c) => <div key={c.id} className="panel" style={{ display: 'flex', justifyContent: 'space-between' }}><span>{c.number ?? 'Rasm orqali'}</span><b>{CARD_UZ[c.status]}</b></div>)}
    </div>
  );
}

type Msg = { id: number; direction: 'IN' | 'OUT'; kind: string; text?: string | null };
export function Support() {
  useBackButton(true);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  useEffect(() => { api<Msg[]>('/support/messages').then(setMsgs).catch(() => {}); }, []);
  return (
    <div className="page"><h1>Murojaatlar</h1>
      {!msgs.length && <Empty emoji="💬" text="Hali murojaat yo'q." />}
      {msgs.map((m) => <div key={m.id} className={`bubble ${m.direction === 'IN' ? 'me' : ''}`}>{m.kind === 'text' ? m.text : `[${m.kind}] ${m.text ?? ''}`}</div>)}
      <button className="btn" style={{ marginTop: 16 }} onClick={() => tg?.close()}>Botda yozish</button>
      <p className="muted">Matn, rasm, ovozli xabar yoki video yuborish uchun botga o'ting.</p>
    </div>
  );
}

export function About() {
  useBackButton(true);
  return <div className="page"><h1>Biz haqida</h1><div className="panel"><img src="/logo.png" alt="Tegen" width={72} height={72} style={{ borderRadius: '50%' }} /><p>Tegen: oziq-ovqat va uy-ro'zg'or mahsulotlari. Katalogdan tanlang, olib ketish yoki yetkazib berishni belgilang.</p></div></div>;
}
