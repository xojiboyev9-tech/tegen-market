import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  ['Non mahsulotlari', '🍞'],
  ["Go'sht va kolbasa", '🥩'],
  ['Meva-sabzavot', '🍎'],
  ['Sut mahsulotlari', '🧀'],
  ['Ichimliklar', '🥤'],
  ['Qandolat', '🍰'],
  ["Uy-ro'zg'or", '🧴'],
  ['Taom mahsulotlari', '🍔'],
];

async function main() {
  for (const [i, [name, emoji]] of categories.entries()) {
    const exists = await prisma.category.findFirst({ where: { name } });
    if (!exists) await prisma.category.create({ data: { name, emoji, sortOrder: i } });
  }

  const cat = async (name: string) => (await prisma.category.findFirstOrThrow({ where: { name } })).id;

  const demo = [
    // Non
    { name: 'Tandir non', price: 5000, type: 'PIECE' as const, category: 'Non mahsulotlari', isTrending: true },
    { name: 'Baton non', price: 4500, type: 'PIECE' as const, category: 'Non mahsulotlari' },
    { name: 'Lavash', price: 3000, type: 'PIECE' as const, category: 'Non mahsulotlari' },

    // Go'sht
    { name: 'Doktor kolbasa', price: 45000, type: 'WEIGHT' as const, category: "Go'sht va kolbasa", isTrending: true },
    { name: 'Mol go\'shti (qiyma)', price: 85000, type: 'WEIGHT' as const, category: "Go'sht va kolbasa" },
    { name: 'Tovuq go\'shti', price: 42000, type: 'WEIGHT' as const, category: "Go'sht va kolbasa" },
    { name: 'Sosiska', price: 38000, type: 'WEIGHT' as const, category: "Go'sht va kolbasa" },

    // Meva
    { name: 'Banan', price: 13900, oldPrice: 19900, type: 'WEIGHT' as const, category: 'Meva-sabzavot', isTrending: true },
    { name: 'Olma (qizil)', price: 12000, type: 'WEIGHT' as const, category: 'Meva-sabzavot' },
    { name: 'Kartoshka', price: 4500, type: 'WEIGHT' as const, category: 'Meva-sabzavot' },
    { name: 'Piyoz', price: 3500, type: 'WEIGHT' as const, category: 'Meva-sabzavot' },

    // Sut
    { name: 'Sut 1 l', price: 11000, type: 'PIECE' as const, category: 'Sut mahsulotlari' },
    { name: 'Qatiq 0.5 l', price: 7000, type: 'PIECE' as const, category: 'Sut mahsulotlari' },
    { name: 'Pishloq (rossiyskiy)', price: 95000, type: 'WEIGHT' as const, category: 'Sut mahsulotlari' },

    // Ichimlik
    { name: 'Suv 1.5 l', price: 3500, type: 'PIECE' as const, category: 'Ichimliklar', isTrending: true },
    { name: 'Coca-Cola 1.5 l', price: 14000, type: 'PIECE' as const, category: 'Ichimliklar' },
    { name: 'Sok 1 l', price: 12000, type: 'PIECE' as const, category: 'Ichimliklar' },

    // Qandolat
    { name: 'Shokolad "Alpen Gold"', price: 18000, type: 'PIECE' as const, category: 'Qandolat' },
    { name: 'Pechenye', price: 15000, type: 'PIECE' as const, category: 'Qandolat' },
  ];

  for (const d of demo) {
    const exists = await prisma.product.findFirst({ where: { name: d.name } });
    if (exists) continue;
    await prisma.product.create({
      data: {
        name: d.name,
        price: d.price,
        oldPrice: (d as any).oldPrice,
        type: d.type,
        status: 'ACTIVE',
        categoryId: await cat(d.category),
        isTrending: !!(d as any).isTrending,
      },
    });
  }

  if (!(await prisma.banner.count())) {
    await prisma.banner.createMany({
      data: [
        { title: 'Bugun barcha tortlarga 15% chegirma', subtitle: 'Sevimli shirinliklaringiz', buttonText: "Ko'rish", sortOrder: 0 },
        { title: "Yangi kolbasalar keldi!", subtitle: "Doktor, sosiska va boshqalar", buttonText: "Katalog", sortOrder: 1 },
        { title: "Meva-sabzavot aksiyasi", subtitle: "Banan, olma va kartoshka arzon", buttonText: "Xarid qilish", sortOrder: 2 },
      ],
    });
  }

  console.log('✅ Seed muvaffaqiyatli yakunlandi (kengaytirilgan demo ma\'lumotlar)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
