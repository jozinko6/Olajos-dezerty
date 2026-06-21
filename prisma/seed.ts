// prisma/seed.ts
// Seeds the Olajos Dezerty database with real product catalog data.
// NO public demo passwords, NO fake customer accounts, NO demo orders,
// NO fake cash ledger. Staff accounts are created with random passwords
// printed to stdout (must be changed on first login).

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

const db = new PrismaClient()

function randomPassword() {
  return randomBytes(6).toString('hex')
}

async function main() {
  console.log('Seeding Olajos Dezerty...')

  // --- Allergens ---
  const allergens = await Promise.all([
    db.allergen.upsert({ where: { code: 'GLUTEN' }, update: {}, create: { code: 'GLUTEN', name: 'Obiloviny obsahujúce lepk' } }),
    db.allergen.upsert({ where: { code: 'MILK' }, update: {}, create: { code: 'MILK', name: 'Mlieko a mliečne výrobky' } }),
    db.allergen.upsert({ where: { code: 'EGGS' }, update: {}, create: { code: 'EGGS', name: 'Vajcia' } }),
    db.allergen.upsert({ where: { code: 'NUTS' }, update: {}, create: { code: 'NUTS', name: 'Orechy' } }),
    db.allergen.upsert({ where: { code: 'SOY' }, update: {}, create: { code: 'SOY', name: 'Sója' } }),
    db.allergen.upsert({ where: { code: 'PEANUTS' }, update: {}, create: { code: 'PEANUTS', name: 'Arašidy' } }),
    db.allergen.upsert({ where: { code: 'SESAME' }, update: {}, create: { code: 'SESAME', name: 'Sezam' } }),
  ])

  // --- Branches ---
  const hlohovec = await db.branch.upsert({
    where: { slug: 'hlohovec' },
    update: {},
    create: {
      name: 'Olajos Dezerty — Hlohovec',
      slug: 'hlohovec',
      street: 'M. R. Štefánika',
      city: 'Hlohovec',
      postalCode: '920 01',
      phone: '+421 905 000 000',
      latitude: 48.4336,
      longitude: 17.7967,
      isMain: true,
    },
  })

  // --- Business hours ---
  const hoursData = [
    { day: 1, open: '08:00', close: '18:00' },
    { day: 2, open: '08:00', close: '18:00' },
    { day: 3, open: '08:00', close: '18:00' },
    { day: 4, open: '08:00', close: '18:00' },
    { day: 5, open: '08:00', close: '18:00' },
    { day: 6, open: '08:00', close: '14:00' },
    { day: 0, open: '09:00', close: '13:00' },
  ]
  for (const h of hoursData) {
    await db.businessHours.upsert({
      where: { branchId_dayOfWeek: { branchId: hlohovec.id, dayOfWeek: h.day } },
      update: {},
      create: { branchId: hlohovec.id, dayOfWeek: h.day, openTime: h.open, closeTime: h.close },
    })
  }

  // --- Delivery zones ---
  const zones = [
    { name: 'Hlohovec', cities: 'Hlohovec', postalCodes: '920 01', baseFee: 3.90, freeFrom: 35, minOrder: 10, est: 45 },
    { name: 'Šulekovo', cities: 'Šulekovo', postalCodes: '920 41', baseFee: 4.90, freeFrom: 45, minOrder: 15, est: 60 },
    { name: 'Leopoldov', cities: 'Leopoldov', postalCodes: '920 02', baseFee: 5.90, freeFrom: 55, minOrder: 20, est: 75 },
    { name: 'Červeník', cities: 'Červeník', postalCodes: '920 03', baseFee: 6.90, freeFrom: 65, minOrder: 25, est: 90 },
    { name: 'Okolité obce', cities: 'Bojničky, Jalšové, Kľačany, Koplotovce', postalCodes: '', baseFee: 8.90, freeFrom: 80, minOrder: 30, est: 120 },
  ]
  for (const z of zones) {
    await db.deliveryZone.upsert({
      where: { name: z.name },
      update: {},
      create: {
        name: z.name,
        branchId: hlohovec.id,
        cities: z.cities,
        postalCodes: z.postalCodes,
        baseFee: z.baseFee,
        freeFromAmount: z.freeFrom,
        minOrderAmount: z.min,
        estimatedMinutes: z.est,
      },
    })
  }

  // --- Categories ---
  const categories = await Promise.all([
    db.productCategory.upsert({ where: { slug: 'torty' }, update: {}, create: { name: 'Torty', slug: 'torty', sortOrder: 1, description: 'Domáce torty podľa vlastného receptu.' } }),
    db.productCategory.upsert({ where: { slug: 'zákusky' }, update: {}, create: { name: 'Zákusky', slug: 'zákusky', sortOrder: 2, description: 'Klasické aj moderné zákusky.' } }),
    db.productCategory.upsert({ where: { slug: 'dezerty' }, update: {}, create: { name: 'Dezerty', slug: 'dezerty', sortOrder: 3, description: 'Jednoporciové dezerty a poháre.' } }),
    db.productCategory.upsert({ where: { slug: 'koláče' }, update: {}, create: { name: 'Koláče', slug: 'koláče', sortOrder: 4, description: 'Tradičné slovenské koláče.' } }),
    db.productCategory.upsert({ where: { slug: 'macerovane-ovocie' }, update: {}, create: { name: 'Macerované ovocie', slug: 'macerovane-ovocie', sortOrder: 5, description: 'Ovocie namáčané v čokoláde.' } }),
  ])

  // --- Products (real Olajos-style catalog) ---
  const products = [
    {
      categorySlug: 'torty', name: 'Smetanovo-jahodová torta', slug: 'smetanovo-jahodova-torta',
      description: 'Vláčny piškótový korpus, jemný smotanový krém a čerstvé jahody.',
      longDescription: 'Naša obľúbená smotanovo-jahodová torta je zložená z troch vrstiev vláčneho vanilkového piškótu, prekladaného ľahký smotanovým krémom a čerstvými jahodami. Ideálna pre narodeninové oslavy a letné oslavy.',
      price: 32.90, featured: true, lead: 48, variants: [
        { name: '1 kg', delta: 0 }, { name: '1,5 kg', delta: 14 }, { name: '2 kg', delta: 28 }
      ],
      allergens: ['GLUTEN', 'MILK', 'EGGS'],
      options: [
        { group: 'Darčekové balenie', options: [{ name: 'Áno', delta: 3.50 }, { name: 'Nie', delta: 0 }] },
        { group: 'Kartička', options: [{ name: 'Bez kartičky', delta: 0 }, { name: 'S darčekovou kartičkou', delta: 1.50 }] },
      ],
    },
    {
      categorySlug: 'torty', name: 'Čokoládovo-oriešková torta', slug: 'cokoladovo-orieskova-torta',
      description: 'Horká čokoláda, mleté orechy a krémový ganache.',
      longDescription: 'Intenzívna čokoládovo-oriešková torta s hodvábnym ganache z belgickej čokolády a mletých vlašských orechov. Pre milovníkov čokolády.',
      price: 35.90, featured: true, lead: 48, variants: [
        { name: '1 kg', delta: 0 }, { name: '1,5 kg', delta: 16 }, { name: '2 kg', delta: 32 }
      ],
      allergens: ['GLUTEN', 'MILK', 'EGGS', 'NUTS', 'SOY'],
      options: [
        { group: 'Darčekové balenie', options: [{ name: 'Áno', delta: 3.50 }, { name: 'Nie', delta: 0 }] },
      ],
    },
    {
      categorySlug: 'torty', name: 'Pistáciová torta s malinami', slug: 'pistaciova-torta-s-malinami',
      description: 'Jemne zelený pistáciový krém s kyslastými malinami.',
      price: 38.90, featured: true, lead: 72, variants: [
        { name: '1 kg', delta: 0 }, { name: '1,5 kg', delta: 18 }, { name: '2 kg', delta: 36 }
      ],
      allergens: ['GLUTEN', 'MILK', 'EGGS', 'NUTS'],
      options: [
        { group: 'Darčekové balenie', options: [{ name: 'Áno', delta: 3.50 }, { name: 'Nie', delta: 0 }] },
      ],
    },
    {
      categorySlug: 'torty', name: 'Tiramisu torta', slug: 'tiramisu-torta',
      description: 'Káva, mascarpone a jemný piškót.',
      price: 34.90, lead: 48, variants: [
        { name: '1 kg', delta: 0 }, { name: '1,5 kg', delta: 15 }, { name: '2 kg', delta: 30 }
      ],
      allergens: ['GLUTEN', 'MILK', 'EGGS', 'SOY'],
      options: [],
    },
    {
      categorySlug: 'zákusky', name: 'Veterník s krémom', slug: 'veternik-s-kremom',
      description: 'Lámané cesto, vanilkový krém, horká čokoláda.',
      price: 1.90, lead: 12, variants: [
        { name: '1 ks', delta: 0 }, { name: '6 ks', delta: 9.50 }, { name: '12 ks', delta: 19.00 }
      ],
      allergens: ['GLUTEN', 'MILK', 'EGGS'],
      options: [],
    },
    {
      categorySlug: 'zákusky', name: 'Krémeš', slug: 'kremes',
      description: 'Klasický krémeš s vanilkovým pudingom a cukrovou polevou.',
      price: 1.80, lead: 12, variants: [
        { name: '1 ks', delta: 0 }, { name: '6 ks', delta: 9.00 }, { name: '12 ks', delta: 18.00 }
      ],
      allergens: ['GLUTEN', 'MILK', 'EGGS'],
      options: [],
    },
    {
      categorySlug: 'zákusky', name: 'Límcový rezeň', slug: 'limcovy-rezen',
      description: 'Chrumkavé lístkové cesto s tvarohovým krémom a malinami.',
      price: 2.20, lead: 12, variants: [
        { name: '1 ks', delta: 0 }, { name: '6 ks', delta: 11.00 }, { name: '12 ks', delta: 22.00 }
      ],
      allergens: ['GLUTEN', 'MILK', 'EGGS'],
      options: [],
    },
    {
      categorySlug: 'dezerty', name: 'Panna cotta s malinami', slug: 'panna-cotta-s-malinami',
      description: 'Jemný krémový panna cotta s malinovým coulis.',
      price: 3.90, lead: 8, variants: [
        { name: '1 ks', delta: 0 }, { name: '4 ks', delta: 14.00 }
      ],
      allergens: ['MILK'],
      options: [],
    },
    {
      categorySlug: 'dezerty', name: 'Tiramisu pohár', slug: 'tiramisu-pohar',
      description: 'Vrstvy piškótu namočeného v kave s mascarpone krémom.',
      price: 4.50, lead: 8, variants: [
        { name: '1 ks', delta: 0 }, { name: '4 ks', delta: 16.00 }
      ],
      allergens: ['GLUTEN', 'MILK', 'EGGS'],
      options: [],
    },
    {
      categorySlug: 'dezerty', name: 'Čokoládový fondant', slug: 'cokoladovy-fondant',
      description: 'Teplý čokoládový zákusok s tekutým stredom a zmrzlinou.',
      price: 5.20, lead: 24, variants: [
        { name: '1 ks', delta: 0 }, { name: '4 ks', delta: 19.00 }
      ],
      allergens: ['GLUTEN', 'MILK', 'EGGS', 'SOY'],
      options: [],
    },
    {
      categorySlug: 'koláče', name: 'Makový koláč', slug: 'makovy-kolac',
      description: 'Tradičný makový koláč s drobením.',
      price: 1.60, lead: 12, variants: [
        { name: '1 ks', delta: 0 }, { name: '6 ks', delta: 8.50 }, { name: '12 ks', delta: 16.00 }
      ],
      allergens: ['GLUTEN', 'MILK', 'EGGS'],
      options: [],
    },
    {
      categorySlug: 'koláče', name: 'Tvarohový koláč', slug: 'tvarohovy-kolac',
      description: 'Jemný tvarohový krém na piškóte, posypaný ovocím.',
      price: 1.80, lead: 12, variants: [
        { name: '1 ks', delta: 0 }, { name: '6 ks', delta: 9.50 }, { name: '12 ks', delta: 18.00 }
      ],
      allergens: ['GLUTEN', 'MILK', 'EGGS'],
      options: [],
    },
    {
      categorySlug: 'macerovane-ovocie', name: 'Macerované jahody v čokoláde', slug: 'macerovane-jahody-v-cokolade',
      description: 'Čerstvé jahody máčané v belgickej čokoláde.',
      price: 6.90, lead: 4, variants: [
        { name: '6 ks', delta: 0 }, { name: '12 ks', delta: 8.00 }
      ],
      allergens: ['MILK', 'SOY'],
      options: [],
    },
    {
      categorySlug: 'macerovane-ovocie', name: 'Macerované maliny v bielej čokoláde', slug: 'macerovane-maliny-v-bielej-cokolade',
      description: 'Maliny máčané v bielej čokoláde s lístkami mäty.',
      price: 7.50, lead: 4, variants: [
        { name: '6 ks', delta: 0 }, { name: '12 ks', delta: 9.00 }
      ],
      allergens: ['MILK', 'SOY'],
      options: [],
    },
  ]

  for (const p of products) {
    const category = categories.find(c => c.slug === p.categorySlug)!
    const product = await db.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        longDescription: p.longDescription ?? null,
        basePrice: p.price,
        categoryId: category.id,
        isFeatured: p.featured ?? false,
        productionLeadHours: p.lead,
      },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        longDescription: p.longDescription ?? null,
        basePrice: p.price,
        categoryId: category.id,
        isFeatured: p.featured ?? false,
        productionLeadHours: p.lead,
        imageUrl: `/products/${p.slug}.png`,
      },
    })

    // variants — clean & recreate to keep idempotent
    await db.productVariant.deleteMany({ where: { productId: product.id } })
    for (const v of p.variants) {
      await db.productVariant.create({
        data: { productId: product.id, name: v.name, priceDelta: v.delta }
      })
    }

    // option groups — clean & recreate
    await db.productOptionGroup.deleteMany({ where: { productId: product.id } })
    for (const og of p.options) {
      const group = await db.productOptionGroup.create({
        data: { productId: product.id, name: og.group, isRequired: false, maxSelect: 1 }
      })
      for (const opt of og.options) {
        await db.productOption.create({
          data: { groupId: group.id, name: opt.name, priceDelta: opt.delta }
        })
      }
    }

    // allergens — clean & recreate
    await db.productAllergen.deleteMany({ where: { productId: product.id } })
    for (const code of p.allergens) {
      const a = allergens.find(x => x.code === code)!
      await db.productAllergen.create({
        data: { productId: product.id, allergenId: a.id }
      })
    }

    // inventory at main branch
    await db.inventory.upsert({
      where: { productId_branchId: { productId: product.id, branchId: hlohovec.id } },
      update: {},
      create: { productId: product.id, branchId: hlohovec.id, quantity: 50, reservedQty: 0, minThreshold: 5 },
    })
  }

  // --- Staff accounts (random passwords printed to stdout) ---
  const staff = [
    { email: 'admin@olajos-dezerty.sk', name: 'Prevádzka Olajos', role: 'ADMIN' },
    { email: 'manager@olajos-dezerty.sk', name: 'Manažér pobočky', role: 'STORE_MANAGER' },
    { email: 'vyroba@olajos-dezerty.sk', name: 'Výroba', role: 'PRODUCTION' },
    { email: 'balenie@olajos-dezerty.sk', name: 'Balenie', role: 'PACKING' },
    { email: 'dispecing@olajos-dezerty.sk', name: 'Dispečing', role: 'DISPATCHER' },
    { email: 'kurier@olajos-dezerty.sk', name: 'Kuriér', role: 'COURIER' },
  ]
  console.log('\n=== STAFF ACCOUNTS (change password after first login) ===')
  for (const s of staff) {
    const pwd = randomPassword()
    const hash = await bcrypt.hash(pwd, 12)
    const user = await db.user.upsert({
      where: { email: s.email },
      update: { role: s.role, passwordHash: hash, isActive: true },
      create: { email: s.email, fullName: s.name, role: s.role, passwordHash: hash, isActive: true, emailVerified: true },
    })
    console.log(`${s.role.padEnd(15)} ${s.email}  heslo: ${pwd}  (id: ${user.id})`)

    if (s.role === 'COURIER') {
      const courier = await db.courier.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          vehicleType: 'SCOOTER',
          hasCooler: true,
          isOnline: false,
          maxCapacity: 5,
          baseLatitude: 48.4336,
          baseLongitude: 17.7967,
        },
      })
      console.log(`  courier id: ${courier.id}`)
    }
  }

  // --- Promo code ---
  await db.promoCode.upsert({
    where: { code: 'VITAJ10' },
    update: {},
    create: {
      code: 'VITAJ10',
      description: '10% zľava pre nových zákazníkov',
      discountType: 'PERCENT',
      discountValue: 10,
      minOrderAmount: 20,
      maxDiscountAmount: 15,
      isActive: true,
    },
  })

  console.log('\nSeed complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
