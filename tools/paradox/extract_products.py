#!/usr/bin/env python3
"""Offline dastur (Paradox) Pokupka.db  ->  Tegen import fayli + tahlil jadvali.

Faqat standart kutubxona kerak (Python 3.9+). Hech narsa o'zgartirilmaydi, fayl faqat o'qiladi.

  python3 tools/paradox/extract_products.py /yo'l/Pokupka.db
Natija:
  server/prisma/data/products.json   (npm run db:import shuni o'qiydi; gitga tushmaydi)
  server/prisma/data/tahlil.csv      (Excel'da qo'lda tahlil uchun: tannarx, qoldiq, belgilar)
"""
import csv, json, os, re, sys, collections
sys.path.insert(0, os.path.dirname(__file__))
from px import Table

src = sys.argv[1] if len(sys.argv) > 1 else 'Pokupka.db'
out = os.path.join(os.path.dirname(__file__), '..', '..', 'server', 'prisma', 'data')
os.makedirs(out, exist_ok=True)

t = Table(src, enc='cp1251')          # nomlar rus (Windows-1251) kodirovkasida
rows = [dict(zip(t.names, r)) for r in t.rows()]
if len(rows) != t.nrec:
    sys.exit(f'Xato: sarlavhada {t.nrec} ta yozuv, o\'qildi {len(rows)}')

clean = lambda s: re.sub(r'\s+', ' ', (s or '').replace('\\\\', '/')).strip()
bc_count = collections.Counter(r['RSHTRIH'] for r in rows if r['RSHTRIH'])
products, table = [], []
for r in rows:
    name = clean(r['NAIMENOVANIE'])
    if not name:
        continue
    kol, prodano, spisano = r['KOLICHESTVO'] or 0, r['PRODANO'] or 0, r['SPISANO'] or 0
    stock = round(kol - prodano - spisano, 3)
    price = int(round(r['CENAPROD'] or 0)); cost = r['CENA'] or 0
    is_weight = (r['VESY'] or '') == '1'
    unit = clean(r['IZM']).lower()
    barcode = clean(r['RSHTRIH'])
    kind = clean(r['VID_TOVAR'])
    flags = []
    if price <= 0: flags.append('narx_yoq')
    elif cost and price < cost: flags.append('narx<tannarx')
    if stock < -0.0001: flags.append('qoldiq_manfiy')
    if barcode and bc_count[barcode] > 1: flags.append('barcode_takror')
    if not barcode: flags.append('barcode_yoq')
    if is_weight != unit.startswith('кг'): flags.append('birlik_nomos')
    if unit not in ('шт.', 'кг.'): flags.append('birlik_g\'alati')
    products.append({
        'externalId': str(r['KOD']), 'name': name[:150], 'price': max(price, 0),
        'barcode': barcode or None, 'type': 'WEIGHT' if is_weight else 'PIECE',
        'categoryName': (kind[:1].upper() + kind[1:].lower())[:60] if kind else 'Tasniflanmagan',
        'inStock': stock > 0.0001,
    })
    table.append([r['KOD'], name, barcode, clean(r['SHTRIH']), clean(r['ARTIKUL']), unit, 'ha' if is_weight else '',
                  price, cost, stock, kol, prodano, spisano, r['MINOST'] or '', clean(r['POSTAVSHIK']),
                  r['DATA_POSTAVKI'] or '', r['GodenDo'] or '', clean(r['NDS']), kind, ';'.join(flags)])

with open(os.path.join(out, 'products.json'), 'w', encoding='utf-8') as f:
    json.dump(products, f, ensure_ascii=False)
with open(os.path.join(out, 'tahlil.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['kod', 'nomi', 'barcode', 'ichki_kod', 'artikul', 'birlik', 'ogirlikli', 'sotuv_narxi', 'tannarx',
                'qoldiq', 'kirim', 'sotilgan', 'spisanie', 'minimal', 'yetkazuvchi', 'kirim_sanasi', 'yaroqlilik',
                'nds', 'turi', 'belgilar'])
    w.writerows(table)
print(f'{len(products)} ta mahsulot; qoldiqda: {sum(p["inStock"] for p in products)}; fayllar: {os.path.abspath(out)}')
