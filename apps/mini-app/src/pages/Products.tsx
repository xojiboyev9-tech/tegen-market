import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, Category, Product } from '../api';
import { Empty, ProductCard, SearchBox, useBackButton } from '../components';

export default function Products() {
  useBackButton(true);
  const [sp, setSp] = useSearchParams();
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const key = sp.toString();
  const title = sp.get('sale') ? 'Aksiya mahsulotlari' : sp.get('trending') ? 'Trendda' : sp.get('q') ? `"${sp.get('q')}"` : cats.find((c) => c.id === Number(sp.get('categoryId')))?.name ?? 'Mahsulotlar';

  useEffect(() => { api<Category[]>('/categories').then(setCats).catch(() => {}); }, []);
  useEffect(() => {
    setLoading(true); setPage(1);
    api<{ items: Product[]; total: number }>(`/products?${key}&limit=30`)
      .then((r) => { setItems(r.items); setTotal(r.total); })
      .catch(() => setItems([])).finally(() => setLoading(false));
  }, [key]);

  const more = () => {
    const next = page + 1;
    api<{ items: Product[] }>(`/products?${key}&limit=30&page=${next}`).then((r) => { setItems((l) => [...l, ...r.items]); setPage(next); });
  };

  return (
    <>
      <div className="topbar">
        <SearchBox key={sp.get('q') ?? ''} initial={sp.get('q') ?? ''} onSubmit={(q) => { const n = new URLSearchParams(sp); q ? n.set('q', q) : n.delete('q'); setSp(n, { replace: true }); }} />
      </div>
      <div className="page">
        <h1>{title}</h1>
        {!loading && items.length === 0 && <Empty emoji="🔎" text="Hech narsa topilmadi. So'rovni o'zgartirib ko'ring." />}
        <div className="grid">{items.map((p) => <ProductCard key={p.id} p={p} cats={cats} />)}</div>
        {items.length < total && <button className="btn ghost" style={{ marginTop: 14 }} onClick={more}>Yana ko'rsatish</button>}
      </div>
    </>
  );
}
