import {useEffect,useMemo,useState} from 'react';

type Product={
  id:number;
  name:string;
  price:number;
  image?:string;
  category?:{id:number;name:string}
};

type Category={
  id:number;
  name:string;
  icon?:string
};

const API=(import.meta.env.VITE_API_URL||'').replace(/\/$/,'');
const tg=(window as any).Telegram?.WebApp;

async function api<T>(path:string,init:RequestInit={}){
  const h=new Headers(init.headers);
  h.set('Content-Type','application/json');

  if(tg?.initData)
    h.set('Authorization',`twa ${tg.initData}`);

  const r=await fetch(API+'/api'+path,{
    ...init,
    headers:h
  });

  if(!r.ok)
    throw Error(await r.text());

  return r.json() as Promise<T>;
}

export default function App(){
  const[p,setP]=useState<Product[]>([]);
  const[c,setC]=useState<Category[]>([]);
  const[cat,setCat]=useState<number>();
  const[cart,setCart]=useState<Record<number,number>>({});
  const[u,setU]=useState<any>();
  const[b,setB]=useState<any>();
  const[tab,setTab]=useState('shop');
  const[err,setErr]=useState('');

  const items=useMemo(
    ()=>p.filter(x=>cart[x.id]),
    [p,cart]
  );

  const total=items.reduce(
    (s,x)=>s+x.price*cart[x.id],
    0
  );

  useEffect(()=>{
    tg?.ready();
    tg?.expand();

    Promise.all([
      api<Category[]>('/categories'),
      api<Product[]>('/products'),
      api<any>('/users/me')
    ])
      .then(([cc,pp,uu])=>{
        setC(cc);
        setP(pp);
        setU(uu);
      })
      .catch(()=>setErr('Maʼlumotlarni yuklab bo‘lmadi'));
  },[]);

  const add=(id:number)=>
    setCart(x=>({
      ...x,
      [id]:(x[id]||0)+1
    }));

  const sub=(id:number)=>
    setCart(x=>{
      const n={...x};
      n[id]--;

      if(n[id]<=0)
        delete n[id];

      return n;
    });

  async function order(){
    await api('/orders',{
      method:'POST',
      body:JSON.stringify({
        items:items.map(x=>({
          productId:x.id,
          quantity:cart[x.id]
        })),
        phone:u?.phone
      })
    });

    setCart({});
    alert('Buyurtma qabul qilindi');
    setTab('profile');
  }

  async function balance(){
    setB(await api('/nakopitel/my-balance'));
  }

  return <main>
    <header>
      <b>TEGEN</b>
      <span>{u?.firstName||''}</span>
    </header>

    {err&&<div className="error">{err}</div>}

    {tab==='shop'&&<>
      <div className="cats">
        <button onClick={()=>setCat(undefined)}>
          Barchasi
        </button>

        {c.map(x=>
          <button
            key={x.id}
            onClick={()=>setCat(x.id)}
          >
            {x.icon||'•'} {x.name}
          </button>
        )}
      </div>

      <div className="grid">
        {p
          .filter(x=>!cat||x.category?.id===cat)
          .map(x=>
            <article key={x.id}>
              <img src={x.image||'/src/logo.png'}/>
              <b>{x.name}</b>
              <strong>
                {x.price.toLocaleString()} so‘m
              </strong>

              <button onClick={()=>add(x.id)}>
                Qo‘shish
              </button>
            </article>
          )}
      </div>
    </>}

    {tab==='cart'&&
      <section>
        <h2>Savat</h2>

        {items.map(x=>
          <div className="row" key={x.id}>
            <span>
              {x.name}
              <small>
                {cart[x.id]} × {x.price.toLocaleString()} so‘m
              </small>
            </span>

            <div>
              <button onClick={()=>sub(x.id)}>−</button>
              {cart[x.id]}
              <button onClick={()=>add(x.id)}>+</button>
            </div>
          </div>
        )}

        <h3>
          Jami: {total.toLocaleString()} so‘m
        </h3>

        {items.length>0&&
          <button
            className="primary"
            onClick={order}
          >
            Buyurtma berish
          </button>
        }
      </section>
    }

    {tab==='profile'&&
      <section>
        <h2>Profil</h2>

        <p>
          {u?.firstName} {u?.lastName||''}
        </p>

        <p>
          📱 {u?.phone||'—'}
        </p>

        <div className="save">
          <b>TEGEN Nakopitel</b>

          <strong>
            {(b?.points||0).toLocaleString()} so‘m
          </strong>

          <button onClick={balance}>
            Balansni ko‘rish
          </button>

          <button
            onClick={()=>
              api('/nakopitel/apply',{
                method:'POST'
              }).then(()=>alert('Ariza yuborildi'))
            }
          >
            Nakopitelga ariza
          </button>
        </div>
      </section>
    }

    <nav>
      <button onClick={()=>setTab('shop')}>
        🏠
        <small>Do‘kon</small>
      </button>

      <button onClick={()=>setTab('cart')}>
        🛒
        <small>Savat</small>
      </button>

      <button onClick={()=>{
        setTab('profile');
        balance();
      }}>
        👤
        <small>Profil</small>
      </button>
    </nav>
  </main>
        }
