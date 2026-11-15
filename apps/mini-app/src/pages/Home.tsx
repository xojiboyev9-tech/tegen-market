import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Banner, Category, Product } from '../api';
import { ProductCard, SearchBox } from '../components';

export default function Home() {
  const nav = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [sale, setSale] = useState<Product[]>([]);
  const [trend, setTrend] = useState<Product[]>([]);

  useEffect(() => {
    api<Banner[]>('/banners').then(setBanners).catch(() => {});
    api<Category[]>('/categories').then(setCats).catch(() => {});
    api<{ items: Product[] }>('/products?sale=1&limit=6').then((r) => setSale(r.items)).catch(() => {});
    api<{ items: Product[] }>('/products?trending=1&limit=6').then((r) => setTrend(r.items)).catch(() => {});
  }, []);

  const openBanner = (b: Banner) => nav(b.productId ? `/product/${b.productId}` : b.categoryId ? `/products?categoryId=${b.categoryId}` : '/products?sale=1');

  return (
    <>
      <div className="topbar">
        <img className="logo-sm" src="/logo.png" alt="Tegen" />
        <SearchBox onSubmit={(q) => q && nav(`/products?q=${encodeURIComponent(q)}`)} />
      </div>
      <div className="page" style={{ paddingTop: 4 }}>
        {banners.length > 0 && (
          <div className="banners">
            {banners.map((b) => (
              <button key={b.id} className="banner" onClick={() => openBanner(b)}>
                {b.imageUrl && <img src={b.imageUrl} alt="" />}
                <b>{b.title}</b>
                {b.subtitle && <span>{b.subtitle}</span>}
                <span className="pill">{b.buttonText ?? 'Ko\'rish'}</span>
              </button>
            ))}
          </div>
        )}

        <div className="cats">
          {cats.slice(0, 8).map((c) => (
            <button key={c.id} className="cat" onClick={() => nav(`/products?categoryId=${c.id}`)}>
              <i aria-hidden>{c.emoji ?? '🛒'}</i>{c.name}
            </button>
          ))}
        </div>

        {sale.length > 0 && (<>
          <div className="section-head"><h2>Aksiya mahsulotlari</h2><button className="link" onClick={() => nav('/products?sale=1')}>Barchasini ko'rish</button></div>
          <div className="grid">{sale.map((p) => <ProductCard key={p.id} p={p} cats={cats} />)}</div>
        </>)}

        {trend.length > 0 && (<>
          <div className="section-head"><h2>Trendda</h2><button className="link" onClick={() => nav('/products?trending=1')}>Barchasini ko'rish</button></div>
          <div className="grid">{trend.map((p) => <ProductCard key={p.id} p={p} cats={cats} />)}</div>
        </>)}
      </div>
    </>
  );
}
