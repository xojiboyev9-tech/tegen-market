// Offline dasturdan olingan mahsulotlarni (server/prisma/data/products.json) bazaga bir martalik yuklash.
//   npm run db:import                 # hammasi
//   npm run db:import -- --in-stock   # faqat qoldig'i bor mahsulotlar
//   npm run db:import -- --file=/yo'l/products.json
// Xavfsiz: qayta ishga tushirsa dublikat yaratmaydi (externalId bo'yicha o'tkazib yuboradi).
// Hamma yangi mahsulot HIDDEN holatda keladi: mijozlarga ko'rinmaydi, admin rasm/kategoriya qo'shgach yoqadi.
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Item = {
  externalId: string; name: string; price: number; barcode: string | null;
  type: 'PIECE' | 'WEIGHT'; categoryName: string; inStock: boolean;
};

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith('--file='))?.slice(7);
  const onlyInStock = args.includes('--in-stock');
  const file = fileArg ?? join(__dirname, 'data', 'products.json');

  let items: Item[] = JSON.parse(readFileSync(file, 'utf8'));
  if (onlyInStock) items = items.filter((i) => i.inStock);
  console.log(`${file}: ${items.length} ta mahsulot${onlyInStock ? ' (faqat qoldiqda)' : ''}`);

  // Kategoriyalar
  const cats = new Map<string, number>();
  for (const c of await prisma.category.findMany()) cats.set(c.name.toLowerCase(), c.id);
  const names = [...new Set(items.map((i) => i.categoryName))];
  for (const name of names) {
    if (cats.has(name.toLowerCase())) continue;
    const c = await prisma.category.create({ data: { name, sortOrder: 900, isActive: name !== 'Tasniflanmagan' } });
    cats.set(name.toLowerCase(), c.id);
  }

  // Mahsulotlar: 1000 tadan, mavjud externalId o'tkazib yuboriladi
  let created = 0;
  for (let i = 0; i < items.length; i += 1000) {
    const chunk = items.slice(i, i + 1000);
    const r = await prisma.product.createMany({
      skipDuplicates: true,
      data: chunk.map((p) => ({
        externalId: p.externalId, name: p.name, price: p.price, barcode: p.barcode,
        type: p.type, status: 'HIDDEN' as const, categoryId: cats.get(p.categoryName.toLowerCase())!,
      })),
    });
    created += r.count;
    console.log(`  ${Math.min(i + 1000, items.length)}/${items.length}`);
  }
  console.log(`Tayyor: yangi ${created}, avvaldan bor edi ${items.length - created}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
