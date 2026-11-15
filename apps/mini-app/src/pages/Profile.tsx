import { useNavigate } from 'react-router-dom';
import { Icon } from '../components';
import { useApp } from '../store';

export default function Profile() {
  const nav = useNavigate();
  const { me } = useApp();
  const initials = (me.name ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const rows: [string, string, string, string?][] = [
    ['📦', 'Buyurtmalarim', '/orders'], ['❤️', 'Sevimlilar', '/favorites'], ['💳', 'Diskont karta', '/card'],
    ['💬', 'Murojaatlar', '/support'], ['ℹ️', 'Biz haqida', '/about'],
  ];
  return (
    <div className="page">
      <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="codedisc" style={{ width: 62, height: 62, margin: 0, boxShadow: 'none', fontWeight: 800, fontSize: 20 }}>{initials}</div>
        <div><b style={{ fontSize: 17 }}>{me.name}</b><div className="muted">{me.phone}</div></div>
      </div>
      <div className="list">
        {rows.map(([em, label, to]) => (
          <button key={to} className="item" onClick={() => nav(to)}><span className="em" aria-hidden>{em}</span><span className="grow">{label}</span>{Icon.chev}</button>
        ))}
      </div>
    </div>
  );
}
