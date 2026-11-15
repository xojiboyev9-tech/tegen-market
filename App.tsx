import { Button, Input, Layout, Menu, Result } from 'antd';
import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api, getToken, Me, Role, setToken } from './api';
import Audit from './pages/Audit';
import Banners from './pages/Banners';
import Cards from './pages/Cards';
import Categories from './pages/Categories';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Staff from './pages/Staff';
import Stats from './pages/Stats';
import Support from './pages/Support';

const ALL: Role[] = ['SUPER_ADMIN', 'CATEGORY_ADMIN', 'OPERATOR', 'COURIER'];
const PAGES: { key: string; label: string; roles: Role[]; el: (me: Me) => JSX.Element }[] = [
  { key: 'orders', label: 'Buyurtmalar', roles: ['SUPER_ADMIN', 'OPERATOR', 'COURIER'], el: (me) => <Orders me={me} /> },
  { key: 'products', label: 'Mahsulotlar', roles: ['SUPER_ADMIN', 'CATEGORY_ADMIN', 'OPERATOR'], el: (me) => <Products me={me} /> },
  { key: 'categories', label: 'Kategoriyalar', roles: ['SUPER_ADMIN'], el: () => <Categories /> },
  { key: 'banners', label: 'Bannerlar', roles: ['SUPER_ADMIN'], el: () => <Banners /> },
  { key: 'support', label: 'Murojaatlar', roles: ['SUPER_ADMIN', 'OPERATOR'], el: () => <Support /> },
  { key: 'cards', label: 'Diskont kartalar', roles: ['SUPER_ADMIN', 'OPERATOR'], el: () => <Cards /> },
  { key: 'stats', label: 'Statistika', roles: ['SUPER_ADMIN', 'OPERATOR'], el: () => <Stats /> },
  { key: 'staff', label: 'Xodimlar', roles: ['SUPER_ADMIN'], el: () => <Staff /> },
  { key: 'audit', label: 'Audit', roles: ['SUPER_ADMIN'], el: () => <Audit /> },
];

function Shell({ me }: { me: Me }) {
  const nav = useNavigate();
  const loc = useLocation();
  const pages = PAGES.filter((p) => p.roles.includes(me.role));
  const cur = loc.pathname.split('/')[1] || pages[0]?.key;
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider breakpoint="lg" collapsedWidth={0} width={220} theme="light" style={{ borderRight: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16 }}>
          <img src="/logo.png" width={36} height={36} alt="" style={{ borderRadius: '50%' }} /><b>Tegen admin</b>
        </div>
        <Menu mode="inline" selectedKeys={[cur]} items={pages.map((p) => ({ key: p.key, label: p.label }))} onClick={(e) => nav('/' + e.key)} />
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{me.name} · {me.role}</div>
          <Button block onClick={() => { setToken(null); location.reload(); }}>Chiqish</Button>
        </div>
      </Layout.Sider>
      <Layout.Content style={{ padding: 20, minWidth: 0 }}>
        <Routes>
          {pages.map((p) => <Route key={p.key} path={'/' + p.key} element={p.el(me)} />)}
          <Route path="*" element={<Navigate to={'/' + pages[0].key} replace />} />
        </Routes>
      </Layout.Content>
    </Layout>
  );
}

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [token, setTok] = useState('');
  const [ready, setReady] = useState(false);

  const boot = () => {
    if (!getToken()) return setReady(true);
    api<Me>('/auth/me').then((m) => (ALL.includes(m.role) ? setMe(m) : setToken(null))).catch(() => {}).finally(() => setReady(true));
  };
  useEffect(() => { boot(); window.addEventListener('tegen-logout', () => setMe(null)); }, []);

  if (!ready) return null;
  if (!me) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <Result
        icon={<img src="/logo.png" width={84} alt="" style={{ borderRadius: '50%' }} />}
        title="Tegen admin"
        subTitle="Botda /admin buyrug'ini yuboring va kelgan tugma orqali kiring."
        extra={<div style={{ maxWidth: 360, margin: '0 auto', display: 'grid', gap: 8 }}>
          <Input.Password placeholder="Yoki tokenni qo'ying" value={token} onChange={(e) => setTok(e.target.value)} />
          <Button type="primary" disabled={!token} onClick={() => { setToken(token.trim()); boot(); }}>Kirish</Button>
        </div>}
      />
    </div>
  );
  return <HashRouter><Shell me={me} /></HashRouter>;
}
