import { useEffect, useMemo, useState } from 'react';

type Product = {
  id: number;
  name: string;
  price: number;
  image?: string;
  category?: {
    id: number;
    name: string;
  };
};

type Category = {
  id: number;
  name: string;
  icon?: string;
};

type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  initData?: string;
  initDataUnsafe?: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
  };
};

type User = {
  id: string;
  telegramId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  language?: string;
};

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const tg = (window as Window & {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}).Telegram?.WebApp;

async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  headers.set('Content-Type', 'application/json');

  const telegramId = tg?.initDataUnsafe?.user?.id;

  if (telegramId) {
    headers.set('x-telegram-id', String(telegramId));
  }

  const response = await fetch(`${API}/api${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<T>;
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<number>();

  const [cart, setCart] =
    useState<Record<number, number>>({});

  const [user, setUser] = useState<User>();
  const [balanceData, setBalanceData] =
    useState<any>();

  const [tab, setTab] = useState('shop');
  const [error, setError] = useState('');

  const items = useMemo(
    () => products.filter((product) => cart[product.id]),
    [products, cart],
  );

  const total = items.reduce(
    (sum, product) =>
      sum + product.price * cart[product.id],
    0,
  );

  useEffect(() => {
    tg?.ready();
    tg?.expand();

    Promise.all([
      api<Category[]>('/categories'),
      api<Product[]>('/products'),
      api<User>('/users/me'),
    ])
      .then(([categoryData, productData, userData]) => {
        setCategories(categoryData);
        setProducts(productData);
        setUser(userData);
      })
      .catch((error) => {
        console.error(error);
        setError(
          'Maʼlumotlarni yuklab bo‘lmadi',
        );
      });
  }, []);

  const add = (id: number) => {
    setCart((current) => ({
      ...current,
      [id]: (current[id] || 0) + 1,
    }));
  };

  const sub = (id: number) => {
    setCart((current) => {
      const next = { ...current };

      next[id] = (next[id] || 0) - 1;

      if (next[id] <= 0) {
        delete next[id];
      }

      return next;
    });
  };

  async function createOrder() {
    if (!items.length) {
      return;
    }

    try {
      await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map((product) => ({
            productId: product.id,
            quantity: cart[product.id],
          })),
          phone: user?.phone || null,
        }),
      });

      setCart({});
      alert('Buyurtma qabul qilindi');
      setTab('profile');
    } catch (error) {
      console.error(error);
      alert('Buyurtmani yuborishda xatolik yuz berdi');
    }
  }

  async function loadBalance() {
    try {
      const data = await api<any>(
        '/nakopitel/my-balance',
      );

      setBalanceData(data);
    } catch (error) {
      console.error(error);
      alert('Balansni olishda xatolik yuz berdi');
    }
  }

  async function applyNakopitel() {
    try {
      await api('/nakopitel/apply', {
        method: 'POST',
      });

      alert('Ariza yuborildi');
    } catch (error) {
      console.error(error);
      alert('Arizani yuborishda xatolik yuz berdi');
    }
  }

  return (
    <main>
      <header>
        <b>TEGEN</b>

        <span>
          {user?.firstName || ''}
        </span>
      </header>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {tab === 'shop' && (
        <>
          <div className="cats">
            <button
              onClick={() =>
                setSelectedCategory(undefined)
              }
            >
              Barchasi
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() =>
                  setSelectedCategory(category.id)
                }
              >
                {category.icon || '•'}{' '}
                {category.name}
              </button>
            ))}
          </div>

          <div className="grid">
            {products
              .filter(
                (product) =>
                  !selectedCategory ||
                  product.category?.id ===
                    selectedCategory,
              )
              .map((product) => (
                <article key={product.id}>
                  <img
                    src={
                      product.image ||
                      '/logo.png'
                    }
                    alt={product.name}
                  />

                  <b>{product.name}</b>

                  <strong>
                    {product.price.toLocaleString()}{' '}
                    so‘m
                  </strong>

                  <button
                    onClick={() =>
                      add(product.id)
                    }
                  >
                    Qo‘shish
                  </button>
                </article>
              ))}
          </div>
        </>
      )}

      {tab === 'cart' && (
        <section>
          <h2>Savat</h2>

          {items.map((product) => (
            <div
              className="row"
              key={product.id}
            >
              <span>
                {product.name}

                <small>
                  {cart[product.id]} ×{' '}
                  {product.price.toLocaleString()}{' '}
                  so‘m
                </small>
              </span>

              <div>
                <button
                  onClick={() =>
                    sub(product.id)
                  }
                >
                  −
                </button>

                {cart[product.id]}

                <button
                  onClick={() =>
                    add(product.id)
                  }
                >
                  +
                </button>
              </div>
            </div>
          ))}

          <h3>
            Jami: {total.toLocaleString()} so‘m
          </h3>

          {items.length > 0 && (
            <button
              className="primary"
              onClick={createOrder}
            >
              Buyurtma berish
            </button>
          )}
        </section>
      )}

      {tab === 'profile' && (
        <section>
          <h2>Profil</h2>

          <p>
            {user?.firstName || ''}{' '}
            {user?.lastName || ''}
          </p>

          <p>
            📱 {user?.phone || '—'}
          </p>

          <div className="save">
            <b>TEGEN Nakopitel</b>

            <strong>
              {(balanceData?.points || 0).toLocaleString()}{' '}
              so‘m
            </strong>

            <button onClick={loadBalance}>
              Balansni ko‘rish
            </button>

            <button onClick={applyNakopitel}>
              Nakopitelga ariza
            </button>
          </div>
        </section>
      )}

      <nav>
        <button onClick={() => setTab('shop')}>
          🏠
          <small>Do‘kon</small>
        </button>

        <button onClick={() => setTab('cart')}>
          🛒
          <small>Savat</small>
        </button>

        <button
          onClick={() => {
            setTab('profile');
            loadBalance();
          }}
        >
          👤
          <small>Profil</small>
        </button>
      </nav>
    </main>
  );
         }
