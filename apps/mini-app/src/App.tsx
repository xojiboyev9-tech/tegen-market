import { useEffect, useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { login, Me } from './api';
import { BottomNav } from './components';
import { AppProvider } from './store';
import { initTelegram, tg } from './tg';
import Cart from './pages/Cart';
import Catalog from './pages/Catalog';
import { About as AboutPage, DiscountCard, Favorites, Support } from './pages/Extras';
import Home from './pages/Home';
import OrderDetail from './pages/OrderDetail';
import Orders from './pages/Orders';
import ProductPage from './pages/ProductPage';
import Products from './pages/Products';
import Profile from './pages/Profile';

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => { initTelegram(); login().then(setMe).catch((e) => setErr(e.message)); }, []);

  if (err) return <div className="center"><div><img src="/logo.png" width={84} alt="" style={{ borderRadius: '50%' }} /><p>{err}</p></div></div>;
  if (!me) return <div className="center"><img src="/logo.png" width={84} alt="Tegen" style={{ borderRadius: '50%' }} /></div>;

  // Telefon raqami botda /start orqali olinadi
  if (!me.phone) return (
    <div className="center"><div>
      <img src="/logo.png" width={84} alt="" style={{ borderRadius: '50%' }} />
      <h1>Telefon raqam kerak</h1>
      <p className="muted">Botga qaytib, «Raqamni yuborish» tugmasini bosing, so'ng ilovani qayta oching.</p>
      <button className="btn" onClick={() => tg?.close()}>Botga qaytish</button>
    </div></div>
  );

  return (
    <AppProvider me={me}>
      <HashRouter>
        <div className="app">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/card" element={<DiscountCard />} />
            <Route path="/support" element={<Support />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
          <BottomNav />
        </div>
      </HashRouter>
    </AppProvider>
  );
}
