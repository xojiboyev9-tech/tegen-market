# Offline dastur bazasini Tegen'ga yuklash (bir martalik)

## Nima yuklanadi
Offline dasturning `Pokupka.db` (Paradox) jadvalidan, har bir qator bitta mahsulot kartochkasi (32 146 ta, nomlari takrorlanmaydi):

| Paradox maydoni | Tegen |
|---|---|
| `KOD` | `externalId` |
| `NAIMENOVANIE` | `name` (Windows-1251 dan o'giriladi) |
| `CENAPROD` | `price` (so'm; og'irlikli bo'lsa 1 kg narxi) |
| `RSHTRIH` | `barcode` (13 xonali EAN; og'irlikli tovarda 5 xonali tarozi kodi) |
| `VESY = 1` | `type = WEIGHT`, aks holda `PIECE` |
| `VID_TOVAR` | kategoriya (faqat 99 tasida to'ldirilgan), qolganlari `Tasniflanmagan` |

Hammasi `HIDDEN` holatda keladi: mijozlarga ko'rinmaydi, admin kategoriya/rasm qo'shib yoqadi.
**Yuklanmaydi:** tannarx, qoldiq, yetkazuvchi, sotuvlar, mijozlar (ular faqat tahlil jadvalida).

## Qadamlar
```bash
# 1) (ixtiyoriy) fayllarni qayta yaratish: Python 3.9+, qo'shimcha paket kerak emas
python3 tools/paradox/extract_products.py /yo'l/Pokupka.db
#    -> server/prisma/data/products.json  va  tahlil.csv

# 2) bazaga yuklash (.env dagi DATABASE_URL ga)
npm run db:import                    # hammasi (32 146)
npm run db:import -- --in-stock      # faqat qoldig'i borlar (8 044)
```
Qayta ishga tushirsa dublikat yaratmaydi (`externalId` bo'yicha o'tkazib yuboradi).
Production bazaga yuklash uchun Cloud SQL Auth Proxy orqali `DATABASE_URL` ni vaqtincha shu ulanishga qarating.

## `tahlil.csv` (Excel, `;` ajratgich, UTF-8)
Qo'lda tahlil uchun: sotuv narxi, tannarx, qoldiq (kirim − sotilgan − spisanie), yetkazuvchi, sana va `belgilar` ustuni:
`qoldiq_manfiy` (802), `birlik_nomos` (196: og'irlikli, lekin birligi "шт."), `barcode_takror` (15), `narx<tannarx` (11), `narx_yoq` (2), `birlik_g'alati` (2).

## Maxfiylik
`server/prisma/data/` va `*.db` fayllari `.gitignore` da: GitHub'ga tushmaydi. Ularni repo'ga qo'shmang.
