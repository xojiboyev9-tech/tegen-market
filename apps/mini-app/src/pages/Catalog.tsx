import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Category } from '../api';
import { Icon, SearchBox } from '../components';

export default function Catalog() {
  const nav = useNavigate();
  const [cats, setCats] = useState<Category[]>([]);
  useEffect(() => { api<Category[]>('/categories').then(setCats).catch(() => {}); }, []);
  return (
    <>
      <div className="topbar"><SearchBox onSubmit={(q) => q && nav(`/products?q=${encodeURIComponent(q)}`)} /></div>
      <div className="page">
        <h1>Katalog</h1>
        <div className="list">
          {cats.map((c) => (
            <button key={c.id} className="item" onClick={() => nav(`/products?categoryId=${c.id}`)}>
              <span className="em" aria-hidden>{c.emoji ?? '🛒'}</span>
              <span className="grow">{c.name}</span>{Icon.chev}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
