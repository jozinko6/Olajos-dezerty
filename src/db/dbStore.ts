/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  User,
  UserRole,
  CustomerProfile,
  Address,
  Branch,
  BusinessHours,
  ProductCategory,
  Product,
  ProductImage,
  ProductVariant,
  ProductOptionGroup,
  ProductOption,
  Allergen,
  ProductAllergen,
  Collection,
  CollectionProduct,
  Inventory,
  InventoryMovement,
  Order,
  OrderItem,
  OrderItemOption,
  OrderStatusHistory,
  Courier,
  CourierVehicle,
  CourierShift,
  CourierLocation,
  CourierAssignment,
  CourierEarning,
  CashLedger,
  CashSettlement,
  CustomCakeInquiry,
  CustomCakeImage,
  CateringInquiry,
  AuditLog
} from '../types/db';

// Helper to safely import "fs" and "path" on server-side only
let fs: any = null;
let path: any = null;
if (typeof window === 'undefined') {
  try {
    fs = require('fs');
    path = require('path');
  } catch (e) {
    // If running in ES Module natively
    import('fs').then((m) => { fs = m; });
    import('path').then((m) => { path = m; });
  }
}

const DB_FILE_PATH = typeof window === 'undefined' 
  ? (process.env.DB_FILE_PATH || './data/db.json')
  : '';

export interface DatabaseState {
  users: User[];
  userRoles: UserRole[];
  customerProfiles: CustomerProfile[];
  addresses: Address[];
  branches: Branch[];
  businessHours: BusinessHours[];
  productCategories: ProductCategory[];
  products: Product[];
  productImages: ProductImage[];
  productVariants: ProductVariant[];
  productOptionGroups: ProductOptionGroup[];
  productOptions: ProductOption[];
  allergens: Allergen[];
  productAllergens: ProductAllergen[];
  collections: Collection[];
  collectionProducts: CollectionProduct[];
  inventories: Inventory[];
  inventoryMovements: InventoryMovement[];
  orders: Order[];
  orderItems: OrderItem[];
  orderItemOptions: OrderItemOption[];
  orderStatusHistories: OrderStatusHistory[];
  couriers: Courier[];
  courierVehicles: CourierVehicle[];
  courierShifts: CourierShift[];
  courierLocations: CourierLocation[];
  courierAssignments: CourierAssignment[];
  courierEarnings: CourierEarning[];
  cashLedgers: CashLedger[];
  cashSettlements: CashSettlement[];
  customCakeInquiries: CustomCakeInquiry[];
  customCakeImages: CustomCakeImage[];
  cateringInquiries: CateringInquiry[];
  auditLogs: AuditLog[];
}

// Initial robust seed data representable Sk-focused Olajos dezerty
export const INITIAL_STATE: DatabaseState = {
  users: [
    {
      id: 'usr_admin',
      email: 'olajosdezerty@gmail.com',
      password_hash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // admin123 (sha256)
      first_name: 'František',
      last_name: 'Olajos',
      phone: '+421901111222',
      created_at: '2026-06-20T06:30:00Z',
      updated_at: '2026-06-20T06:30:00Z'
    },
    {
      id: 'usr_courier1',
      email: 'kurier1@olajos.sk',
      password_hash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // admin123
      first_name: 'Peter',
      last_name: 'Rýchly',
      phone: '+421903333444',
      created_at: '2026-06-20T06:30:00Z',
      updated_at: '2026-06-20T06:30:00Z'
    },
    {
      id: 'usr_courier2',
      email: 'kurier2@olajos.sk',
      password_hash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // admin123
      first_name: 'Martin',
      last_name: 'Opatrný',
      phone: '+421904444555',
      created_at: '2026-06-20T06:30:00Z',
      updated_at: '2026-06-20T06:30:00Z'
    },
    {
      id: 'usr_customer_demo',
      email: 'jozinko66@gmail.com',
      password_hash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // admin123
      first_name: 'Jozef',
      last_name: 'Novák',
      phone: '+421905888999',
      created_at: '2026-06-20T06:30:00Z',
      updated_at: '2026-06-20T06:30:00Z'
    }
  ],
  userRoles: [
    { user_id: 'usr_admin', role: 'ADMIN' },
    { user_id: 'usr_admin', role: 'STORE_MANAGER' },
    { user_id: 'usr_courier1', role: 'COURIER' },
    { user_id: 'usr_courier2', role: 'COURIER' },
    { user_id: 'usr_customer_demo', role: 'CUSTOMER' }
  ],
  customerProfiles: [
    {
      id: 'usr_customer_demo',
      loyalty_points: 150,
      birth_date: '1990-05-15',
      marketing_consent: true
    }
  ],
  addresses: [
    {
      id: 'adr_demo1',
      user_id: 'usr_customer_demo',
      street: 'M. R. Štefánika 45',
      city: 'Hlohovec',
      postal_code: '92001',
      country: 'Slovensko',
      latitude: 48.4239,
      longitude: 17.7975,
      is_default: true,
      type: 'DELIVERY'
    }
  ],
  branches: [
    {
      id: 'br_hlohovec',
      name: 'Olajos Cukráreň Pribinova',
      address: 'Pribinova 95, Hlohovec',
      phone: '+421901111222',
      email: 'olajosdezerty@gmail.com',
      is_active: true,
      latitude: 48.4275,
      longitude: 17.7992
    }
  ],
  businessHours: [
    { id: 'bh_0', branch_id: 'br_hlohovec', day_of_week: 0, open_time: '10:00', close_time: '18:00', is_closed: false }, // sun
    { id: 'bh_1', branch_id: 'br_hlohovec', day_of_week: 1, open_time: '08:00', close_time: '18:00', is_closed: false }, // mon
    { id: 'bh_2', branch_id: 'br_hlohovec', day_of_week: 2, open_time: '08:00', close_time: '18:00', is_closed: false },
    { id: 'bh_3', branch_id: 'br_hlohovec', day_of_week: 3, open_time: '08:00', close_time: '18:00', is_closed: false },
    { id: 'bh_4', branch_id: 'br_hlohovec', day_of_week: 4, open_time: '08:00', close_time: '19:00', is_closed: false },
    { id: 'bh_5', branch_id: 'br_hlohovec', day_of_week: 5, open_time: '08:00', close_time: '19:00', is_closed: false },
    { id: 'bh_6', branch_id: 'br_hlohovec', day_of_week: 6, open_time: '09:00', close_time: '18:00', is_closed: false }
  ],
  productCategories: [
    { id: 'cat_french', slug: 'francuzske-dezerty', name_sk: 'Francúzske dezerty', description_sk: 'Moderné a odľahčené dezerty podľa originálnych receptúr.', display_order: 1, is_active: true },
    { id: 'cat_classics', slug: 'klasicke-zakusky', name_sk: 'Klasické zákusky', description_sk: 'Tradičné zákusky pripravované poctivo z najlepších surovín.', display_order: 2, is_active: true },
    { id: 'cat_cakes', slug: 'torty', name_sk: 'Torty', description_sk: 'Oslávte narodeniny alebo sviatky s našimi dizajnovými tortami.', display_order: 3, is_active: true },
    { id: 'cat_icecream', slug: 'zmrzlina', name_sk: 'Surová zmrzlina & Poháre', description_sk: 'Poctivá remeselná zmrzlina a lahodné dezertné poháre.', display_order: 4, is_active: true },
    { id: 'cat_pastry', slug: 'briose-a-pecivo', name_sk: 'Kysnuté pečivo & Croissanty', description_sk: 'Čerstvo pečené maslové pečivo z našej pece.', display_order: 5, is_active: true },
    { id: 'cat_gifts', slug: 'darcekove-balenia', name_sk: 'Darčekové balenia & Maškrty', description_sk: 'Exkluzívne čokolády, makrónky a darčekové sety.', display_order: 6, is_active: true }
  ],
  products: [
    {
      id: 'p_eclair',
      category_id: 'cat_french',
      slug: 'karamelovy-eclair',
      name_sk: 'Karamelový Eclair',
      short_desc_sk: 'Odpaľované cesto s bohatým karamelovým krémom a glatúrou.',
      long_desc_sk: 'Tradičný eclair z jemného a krehkého odpaľovaného cesta, plnený jemným karamelovým šľahaným krémom s chrumkavou morskou soľou, poliaty zrkadlovou karamelovou polevou.',
      base_price: 3.80,
      unit: 'ks',
      weight_g: 90,
      pieces_per_pack: 1,
      shelf_life_days: 2,
      storage_temp_sk: 'Skladujte pri teplote 2-6 °C',
      is_gluten_free: false,
      is_lactose_free: false,
      is_sugar_free: false,
      delivery_allowed: true,
      pickup_allowed: true,
      min_lead_hours: 12,
      is_active: true,
      created_at: '2026-06-20T06:30:00Z'
    },
    {
      id: 'p_tart_raspberry',
      category_id: 'cat_french',
      slug: 'malinovy-tartlet',
      name_sk: 'Malinový Tartelette',
      short_desc_sk: 'Krehké maslové cesto plnené vanilkovým krémom a lesnými malinami.',
      long_desc_sk: 'Francúzsky tartlet z krehkého maslového cesta naložený s delikátnym vanilkovým creme patissiere, zdobený výberovými čerstvými malinami.',
      base_price: 4.20,
      unit: 'ks',
      weight_g: 110,
      pieces_per_pack: 1,
      shelf_life_days: 2,
      storage_temp_sk: 'Skladujte pri teplote 2-6 °C',
      is_gluten_free: false,
      is_lactose_free: false,
      is_sugar_free: false,
      delivery_allowed: true,
      pickup_allowed: true,
      min_lead_hours: 12,
      is_active: true,
      created_at: '2026-06-20T06:30:00Z'
    },
    {
      id: 'p_veternik',
      category_id: 'cat_classics',
      slug: 'tradicny-veternik',
      name_sk: 'Poctivý Karamelový Veterník',
      short_desc_sk: 'Klasický veterník s pravou žĺtkovou penou a karamelovou šľahačkou.',
      long_desc_sk: 'Obľúbený poctivý veterník s pravým karamelovým fondánom, plnený jemným vanilkovým krémom a pravou karamelovou šľahačkou zo 100% smotany.',
      base_price: 3.20,
      unit: 'ks',
      weight_g: 130,
      pieces_per_pack: 1,
      shelf_life_days: 1,
      storage_temp_sk: 'Skladujte pri teplote 2-6 °C',
      is_gluten_free: false,
      is_lactose_free: false,
      is_sugar_free: false,
      delivery_allowed: true,
      pickup_allowed: true,
      min_lead_hours: 12,
      is_active: true,
      created_at: '2026-06-20T06:30:00Z'
    },
    {
      id: 'p_torta_coko',
      category_id: 'cat_cakes',
      slug: 'cokoladovo-malinova-torta',
      name_sk: 'Čokoládovo-malinová torta Royal',
      short_desc_sk: 'Slávnostná čokoládová torta s osviežujúcim malinovým pyré.',
      long_desc_sk: 'Kráľovská torta s bohatým nadýchaným čokoládovým korpusom, jemnou penou z belgickej čokolády a výraznou vrstvou acidného malinového pyré. Zdobená makrónkami a čokoládovými hoblinami.',
      base_price: 38.00,
      unit: 'ks',
      weight_g: 1200,
      pieces_per_pack: 1,
      shelf_life_days: 3,
      storage_temp_sk: 'Skladujte pri teplote 2-6 °C',
      is_gluten_free: false,
      is_lactose_free: false,
      is_sugar_free: false,
      delivery_allowed: true,
      pickup_allowed: true,
      min_lead_hours: 48,
      is_active: true,
      created_at: '2026-06-20T06:30:00Z'
    },
    {
      id: 'p_macarons_gift',
      category_id: 'cat_gifts',
      slug: 'darcekova-krabicka-makroniek',
      name_sk: 'Darčeková krabička makróniek (12ks)',
      short_desc_sk: 'Výber farebných francúzskych makróniek v elegantnom balení.',
      long_desc_sk: 'Exkluzívne darčekové balenie s dvanástimi kusmi originálnych mandľových makróniek. Príchute: Pistácia, Slaný karamel, Malinový ganache, Citrón a Belgická čokoláda.',
      base_price: 18.50,
      unit: 'bal',
      weight_g: 180,
      pieces_per_pack: 12,
      shelf_life_days: 7,
      storage_temp_sk: 'Skladujte pri teplote 2-12 °C',
      is_gluten_free: true,
      is_lactose_free: false,
      is_sugar_free: false,
      delivery_allowed: true,
      pickup_allowed: true,
      min_lead_hours: 6,
      is_active: true,
      created_at: '2026-06-20T06:30:00Z'
    },
    {
      id: 'p_pistachio_cup',
      category_id: 'cat_icecream',
      slug: 'pistaciovy-dezertny-pohar',
      name_sk: 'Pistáciový dezertný pohár premium',
      short_desc_sk: 'Delikátny pohár so sicílskou pistáciou a chrumkavým posypom.',
      long_desc_sk: 'Prémiový dezertný pohár s vrstvami pistáciového krému z pravej sícilskej pistácie, jemným mascarpone a chrumkavou sušienkovou mrveničkou.',
      base_price: 4.50,
      unit: 'ks',
      weight_g: 140,
      pieces_per_pack: 1,
      shelf_life_days: 2,
      storage_temp_sk: 'Skladujte pri teplote 2-6 °C',
      is_gluten_free: false,
      is_lactose_free: false,
      is_sugar_free: false,
      delivery_allowed: true,
      pickup_allowed: true,
      min_lead_hours: 12,
      is_active: true,
      created_at: '2026-06-20T06:30:00Z'
    }
  ],
  productImages: [
    { id: 'img_eclair', product_id: 'p_eclair', image_url: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=600&auto=format&fit=crop&q=80', is_primary: true, focal_point_x: 0.5, focal_point_y: 0.5, alt_text: 'Karamelový Eclair' },
    { id: 'img_tart_rasp', product_id: 'p_tart_raspberry', image_url: 'https://images.unsplash.com/photo-1519869325930-281384150729?w=600&auto=format&fit=crop&q=80', is_primary: true, focal_point_x: 0.5, focal_point_y: 0.5, alt_text: 'Malinový Tartelette' },
    { id: 'img_veternik', product_id: 'p_veternik', image_url: 'https://images.unsplash.com/photo-1558961309-dbdf71799f5a?w=600&auto=format&fit=crop&q=80', is_primary: true, focal_point_x: 0.5, focal_point_y: 0.5, alt_text: 'Veterník' },
    { id: 'img_torta', product_id: 'p_torta_coko', image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80', is_primary: true, focal_point_x: 0.5, focal_point_y: 0.5, alt_text: 'Čokoládová torte' },
    { id: 'img_macarons', product_id: 'p_macarons_gift', image_url: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=600&auto=format&fit=crop&q=80', is_primary: true, focal_point_x: 0.5, focal_point_y: 0.5, alt_text: 'Krabica makróniek' },
    { id: 'img_pist_cup', product_id: 'p_pistachio_cup', image_url: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&auto=format&fit=crop&q=80', is_primary: true, focal_point_x: 0.5, focal_point_y: 0.5, alt_text: 'Pistáciový pohár' }
  ],
  productVariants: [
    { id: 'v_torta_8p', product_id: 'p_torta_coko', name_sk: 'Malá torta Ø 18cm (8-10 porcií)', price_modifier: 0.00, sku: 'T-COKO-M', is_active: true },
    { id: 'v_torta_14p', product_id: 'p_torta_coko', name_sk: 'Stredná torta Ø 24cm (14-16 porcií)', price_modifier: 12.00, sku: 'T-COKO-S', is_active: true },
    { id: 'v_torta_22p', product_id: 'p_torta_coko', name_sk: 'Veľká torta Ø 30cm (22-26 porcií)', price_modifier: 24.00, sku: 'T-COKO-L', is_active: true }
  ],
  productOptionGroups: [
    { id: 'opg_torta', product_id: 'p_torta_coko', name_sk: 'Doplnky na tortu', min_selection: 0, max_selection: 1 }
  ],
  productOptions: [
    { id: 'op_coko_text', group_id: 'opg_torta', name_sk: 'Custom čokoládový nápis na tortu (+20g)', price: 3.50, is_active: true },
    { id: 'op_gold_sparkle', group_id: 'opg_torta', name_sk: 'Prskačky a sviečky premium (+3ks)', price: 1.50, is_active: true }
  ],
  allergens: [
    { id: 1, code: '1', name_sk: 'Obilniny obsahujúce lepok' },
    { id: 3, code: '3', name_sk: 'Vajcia a výrobky z nich' },
    { id: 7, code: '7', name_sk: 'Mlieko a mliečne výrobky (vrátane laktózy)' },
    { id: 8, code: '8', name_sk: 'Orechy (mandle, lieskovce, vlašské orechy, pistácie)' }
  ],
  productAllergens: [
    { product_id: 'p_eclair', allergen_id: 1 },
    { product_id: 'p_eclair', allergen_id: 3 },
    { product_id: 'p_eclair', allergen_id: 7 },
    { product_id: 'p_tart_raspberry', allergen_id: 1 },
    { product_id: 'p_tart_raspberry', allergen_id: 3 },
    { product_id: 'p_tart_raspberry', allergen_id: 7 },
    { product_id: 'p_veternik', allergen_id: 1 },
    { product_id: 'p_veternik', allergen_id: 3 },
    { product_id: 'p_veternik', allergen_id: 7 },
    { product_id: 'p_torta_coko', allergen_id: 1 },
    { product_id: 'p_torta_coko', allergen_id: 3 },
    { product_id: 'p_torta_coko', allergen_id: 7 },
    { product_id: 'p_torta_coko', allergen_id: 8 },
    { product_id: 'p_macarons_gift', allergen_id: 3 },
    { product_id: 'p_macarons_gift', allergen_id: 7 },
    { product_id: 'p_macarons_gift', allergen_id: 8 },
    { product_id: 'p_pistachio_cup', allergen_id: 1 },
    { product_id: 'p_pistachio_cup', allergen_id: 7 },
    { product_id: 'p_pistachio_cup', allergen_id: 8 }
  ],
  collections: [
    { id: 'col_weekend', slug: 'vikendova-navsteva', name_sk: 'Víkendová návšteva', description_sk: 'Najobľúbenejšia ponuka pre perfektné víkendové posedenie v rodinnom kruhu.', is_active: true }
  ],
  collectionProducts: [
    { collection_id: 'col_weekend', product_id: 'p_eclair' },
    { collection_id: 'col_weekend', product_id: 'p_tart_raspberry' },
    { collection_id: 'col_weekend', product_id: 'p_veternik' }
  ],
  inventories: [
    { id: 'inv_eclair', product_id: 'p_eclair', branch_id: 'br_hlohovec', quantity: 24, reserved_quantity: 0, min_stock_alert: 5 },
    { id: 'inv_tart', product_id: 'p_tart_raspberry', branch_id: 'br_hlohovec', quantity: 18, reserved_quantity: 0, min_stock_alert: 5 },
    { id: 'inv_veternik', product_id: 'p_veternik', branch_id: 'br_hlohovec', quantity: 0, reserved_quantity: 0, min_stock_alert: 5 }, // VÝPREDAJ TEST (0ks!)
    { id: 'inv_torta', product_id: 'p_torta_coko', branch_id: 'br_hlohovec', quantity: 5, reserved_quantity: 0, min_stock_alert: 2 },
    { id: 'inv_mac', product_id: 'p_macarons_gift', branch_id: 'br_hlohovec', quantity: 30, reserved_quantity: 0, min_stock_alert: 4 },
    { id: 'inv_pist', product_id: 'p_pistachio_cup', branch_id: 'br_hlohovec', quantity: 12, reserved_quantity: 0, min_stock_alert: 3 }
  ],
  inventoryMovements: [],
  orders: [],
  orderItems: [],
  orderItemOptions: [],
  orderStatusHistories: [],
  couriers: [
    { id: 'usr_courier1', vehicle_type: 'CAR', is_active: true, status: 'AVAILABLE', current_latitude: 48.4278, current_longitude: 17.7995, last_location_updated_at: '2026-06-20T06:30:00Z' },
    { id: 'usr_courier2', vehicle_type: 'E_BIKE', is_active: true, status: 'BREAK', current_latitude: 48.4211, current_longitude: 17.7912, last_location_updated_at: '2026-06-20T06:30:00Z' }
  ],
  courierVehicles: [
    { id: 'veh_1', courier_id: 'usr_courier1', plate_number: 'HC-999AA', has_cooling_box: true, max_payload_volume: 1.5 },
    { id: 'veh_2', courier_id: 'usr_courier2', plate_number: undefined, has_cooling_box: false, max_payload_volume: 0.2 }
  ],
  courierShifts: [],
  courierLocations: [],
  courierAssignments: [],
  courierEarnings: [],
  cashLedgers: [],
  cashSettlements: [],
  customCakeInquiries: [],
  customCakeImages: [],
  cateringInquiries: [],
  auditLogs: []
};

// Simple singleton state holder in memory
let dbState: DatabaseState = { ...INITIAL_STATE };

// Save DB state to file (JSON helper)
export function saveState(): void {
  if (typeof window !== 'undefined' || !fs || !path) {
    return;
  }
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dbState, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving DB state:', e);
  }
}

// Load DB state from file
export function loadState(): void {
  if (typeof window !== 'undefined' || !fs || !fs.existsSync) {
    return;
  }
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      dbState = JSON.parse(raw);
    } else {
      saveState();
    }
  } catch (e) {
    console.error('Error loading DB state, using initial seed:', e);
    dbState = { ...INITIAL_STATE };
  }
}

// Ensure loaded at start
if (typeof window === 'undefined') {
  loadState();
}

/**
 * Robust relational queries and mutations mimics SQL with simple transactional safety
 */
export const db = {
  get: () => dbState,
  
  save: () => {
    saveState();
  },

  reset: () => {
    dbState = { ...INITIAL_STATE };
    saveState();
  },

  // Generic helper for UUID generation
  generateId: (prefix: string = 'id') => {
    return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // USERS & ROLES
  users: {
    all: () => dbState.users,
    find: (id: string) => dbState.users.find(u => u.id === id),
    findByEmail: (email: string) => dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase()),
    create: (user: Omit<User, 'id' | 'created_at' | 'updated_at'>) => {
      const newUser: User = {
        ...user,
        id: db.generateId('usr'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      dbState.users.push(newUser);
      db.save();
      return newUser;
    },
    addUserRole: (userId: string, role: typeof INITIAL_STATE.userRoles[0]['role']) => {
      dbState.userRoles.push({ user_id: userId, role });
      db.save();
    },
    getRoles: (userId: string) => {
      return dbState.userRoles.filter(ur => ur.user_id === userId).map(ur => ur.role);
    }
  },

  // CUSTOMER PROFILES & ADDRESSES
  customers: {
    findProfile: (userId: string) => dbState.customerProfiles.find(p => p.id === userId),
    getAddresses: (userId: string) => dbState.addresses.filter(a => a.user_id === userId),
    createProfile: (profile: CustomerProfile) => {
      dbState.customerProfiles.push(profile);
      db.save();
      return profile;
    },
    addAddress: (address: Omit<Address, 'id'>) => {
      const newAddr: Address = {
        ...address,
        id: db.generateId('adr'),
        is_default: address.is_default || false
      };
      if (newAddr.is_default && newAddr.user_id) {
        dbState.addresses.forEach(a => {
          if (a.user_id === newAddr.user_id) a.is_default = false;
        });
      }
      dbState.addresses.push(newAddr);
      db.save();
      return newAddr;
    }
  },

  // BRANCHES & OPERATIONAL HOURS
  branches: {
    all: () => dbState.branches,
    find: (id: string) => dbState.branches.find(b => b.id === id),
    getHours: (branchId: string) => dbState.businessHours.filter(bh => bh.branch_id === branchId),
    update: (id: string, updates: Partial<Branch>) => {
      const idx = dbState.branches.findIndex(b => b.id === id);
      if (idx !== -1) {
        dbState.branches[idx] = { ...dbState.branches[idx], ...updates };
        db.save();
        return dbState.branches[idx];
      }
      return null;
    },
    updateHours: (branchId: string, hours: BusinessHours[]) => {
      dbState.businessHours = dbState.businessHours.filter(bh => bh.branch_id !== branchId).concat(hours);
      db.save();
    }
  },

  // CATALOG PRODUCTS & OPTIONS
  categories: {
    all: () => dbState.productCategories.filter(c => c.is_active).sort((a,b) => a.display_order - b.display_order),
    create: (cat: Omit<ProductCategory, 'id'>) => {
      const newCat: ProductCategory = { ...cat, id: db.generateId('cat') };
      dbState.productCategories.push(newCat);
      db.save();
      return newCat;
    },
    update: (id: string, updates: Partial<ProductCategory>) => {
      const idx = dbState.productCategories.findIndex(c => c.id === id);
      if (idx !== -1) {
        dbState.productCategories[idx] = { ...dbState.productCategories[idx], ...updates };
        db.save();
        return dbState.productCategories[idx];
      }
      return null;
    }
  },

  products: {
    all: () => dbState.products,
    active: () => dbState.products.filter(p => p.is_active),
    find: (id: string) => dbState.products.find(p => p.id === id),
    findBySlug: (slug: string) => dbState.products.find(p => p.slug === slug),
    getImages: (productId: string) => dbState.productImages.filter(img => img.product_id === productId),
    getVariants: (productId: string) => dbState.productVariants.filter(v => v.product_id === productId && v.is_active),
    getOptions: (productId: string) => {
      const groups = dbState.productOptionGroups.filter(g => g.product_id === productId);
      return groups.map(g => ({
        ...g,
        options: dbState.productOptions.filter(o => o.group_id === g.id && o.is_active)
      }));
    },
    getAllergens: (productId: string) => {
      const pAllergens = dbState.productAllergens.filter(pa => pa.product_id === productId);
      return dbState.allergens.filter(a => pAllergens.some(pa => pa.allergen_id === a.id));
    },
    create: (p: Omit<Product, 'id' | 'created_at'>) => {
      const newP: Product = {
        ...p,
        id: db.generateId('p'),
        created_at: new Date().toISOString()
      };
      dbState.products.push(newP);
      db.save();
      return newP;
    },
    update: (id: string, updates: Partial<Product>) => {
      const idx = dbState.products.findIndex(p => p.id === id);
      if (idx !== -1) {
        dbState.products[idx] = { ...dbState.products[idx], ...updates };
        db.save();
        return dbState.products[idx];
      }
      return null;
    },
    setImages: (productId: string, images: Omit<ProductImage, 'id' | 'product_id'>[]) => {
      dbState.productImages = dbState.productImages.filter(img => img.product_id !== productId);
      images.forEach(img => {
        dbState.productImages.push({
          ...img,
          id: db.generateId('img'),
          product_id: productId
        });
      });
      db.save();
    },
    setAllergens: (productId: string, allergenIds: number[]) => {
      dbState.productAllergens = dbState.productAllergens.filter(pa => pa.product_id !== productId);
      allergenIds.forEach(aId => {
        dbState.productAllergens.push({ product_id: productId, allergen_id: aId });
      });
      db.save();
    },
    setVariants: (productId: string, variants: Omit<ProductVariant, 'id' | 'product_id'>[]) => {
      dbState.productVariants = dbState.productVariants.filter(v => v.product_id !== productId);
      variants.forEach(v => {
        dbState.productVariants.push({
          ...v,
          id: db.generateId('v'),
          product_id: productId
        });
      });
      db.save();
    }
  },

  // INVENTORY & REALTIME STOCK
  inventory: {
    get: (productId: string, branchId: string) => {
      return dbState.inventories.find(i => i.product_id === productId && i.branch_id === branchId);
    },
    updateStock: (productId: string, branchId: string, delta: number, userId: string, type: 'SALE' | 'STOCK_IN' | 'WASTE' | 'ADJUSTMENT', reason?: string) => {
      let inv = dbState.inventories.find(i => i.product_id === productId && i.branch_id === branchId);
      if (!inv) {
        inv = {
          id: db.generateId('inv'),
          product_id: productId,
          branch_id: branchId,
          quantity: 0,
          reserved_quantity: 0,
          min_stock_alert: 5
        };
        dbState.inventories.push(inv);
      }
      
      inv.quantity += delta;
      if (inv.quantity < 0) {
        inv.quantity = 0; // prevent negative stock
      }
      
      // Log Movement
      const movement: InventoryMovement = {
        id: db.generateId('mov'),
        inventory_id: inv.id,
        user_id: userId,
        quantity: delta,
        type,
        reason,
        created_at: new Date().toISOString()
      };
      dbState.inventoryMovements.push(movement);
      db.save();
      return inv;
    }
  },

  // COURIERS & LOGISTICS
  couriers: {
    all: () => dbState.couriers.map(c => {
      const u = dbState.users.find(usr => usr.id === c.id);
      return {
        ...c,
        user: u ? { first_name: u.first_name, last_name: u.last_name, email: u.email, phone: u.phone } : null,
        vehicle: dbState.courierVehicles.find(v => v.courier_id === c.id)
      };
    }),
    find: (id: string) => {
      const c = dbState.couriers.find(c => c.id === id);
      if (!c) return null;
      const u = dbState.users.find(usr => usr.id === id);
      return {
        ...c,
        user: u ? { first_name: u.first_name, last_name: u.last_name, email: u.email, phone: u.phone } : null,
        vehicle: dbState.courierVehicles.find(v => v.courier_id === id)
      };
    },
    updateStatus: (id: string, status: Courier['status']) => {
      const c = dbState.couriers.find(c => c.id === id);
      if (c) {
        c.status = status;
        db.save();
        return c;
      }
      return null;
    },
    updateLocation: (id: string, lat: number, lng: number, speed: number = 0) => {
      const c = dbState.couriers.find(c => c.id === id);
      if (c) {
        c.current_latitude = lat;
        c.current_longitude = lng;
        c.last_location_updated_at = new Date().toISOString();
        
        // Save historic trace
        dbState.courierLocations.push({
          id: db.generateId('loc'),
          courier_id: id,
          latitude: lat,
          longitude: lng,
          speed_kmh: speed,
          recorded_at: new Date().toISOString()
        });
        
        db.save();
        return c;
      }
      return null;
    }
  },

  // ORDERS & WORKFLOW
  orders: {
    all: () => dbState.orders.sort((a,b) => b.created_at.localeCompare(a.created_at)),
    find: (id: string) => dbState.orders.find(o => o.id === id),
    findByTracking: (token: string) => dbState.orders.find(o => o.tracking_token === token),
    getItems: (orderId: string) => {
      const items = dbState.orderItems.filter(i => i.order_id === orderId);
      return items.map(i => ({
        ...i,
        options: dbState.orderItemOptions.filter(o => o.order_item_id === i.id)
      }));
    },
    getHistory: (orderId: string) => {
      return dbState.orderStatusHistories.filter(h => h.order_id === orderId).sort((a,b) => a.created_at.localeCompare(b.created_at));
    },
    create: (orderData: {
      order: Omit<Order, 'id' | 'tracking_token' | 'order_number' | 'status' | 'created_at' | 'updated_at'>,
      items: {
        product_id: string;
        variant_id?: string;
        quantity: number;
        customization_notes?: string;
        options?: { option_id: string }[];
      }[]
    }) => {
      const id = db.generateId('ord');
      const count = dbState.orders.length + 1;
      const orderNumber = `OL-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;
      const trackingToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const newOrder: Order = {
        ...orderData.order,
        id,
        tracking_token: trackingToken,
        order_number: orderNumber,
        status: 'NEW',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      dbState.orders.push(newOrder);
      
      // Save Items
      orderData.items.forEach(itm => {
        const item_id = db.generateId('item');
        const prod = dbState.products.find(p => p.id === itm.product_id);
        const variant = itm.variant_id ? dbState.productVariants.find(v => v.id === itm.variant_id) : undefined;
        
        const price = prod ? prod.base_price + (variant ? variant.price_modifier : 0) : 0;
        
        dbState.orderItems.push({
          id: item_id,
          order_id: id,
          product_id: itm.product_id,
          product_name_snapshot: prod ? prod.name_sk : 'Neznámy produkt',
          variant_id: itm.variant_id,
          variant_name_snapshot: variant ? variant.name_sk : undefined,
          unit_price: price,
          quantity: itm.quantity,
          customization_notes: itm.customization_notes
        });
        
        // Options
        if (itm.options) {
          itm.options.forEach(opt => {
            const prodOpt = dbState.productOptions.find(po => po.id === opt.option_id);
            if (prodOpt) {
              dbState.orderItemOptions.push({
                id: db.generateId('opt'),
                order_item_id: item_id,
                option_id: opt.option_id,
                option_name_snapshot: prodOpt.name_sk,
                option_price_snapshot: prodOpt.price
              });
            }
          });
        }
      });
      
      // Log initial status
      dbState.orderStatusHistories.push({
        id: db.generateId('osh'),
        order_id: id,
        status: 'NEW',
        notes: 'Objednávka bola vytvorená zákazníkom',
        created_at: new Date().toISOString()
      });
      
      db.save();
      return newOrder;
    },
    updateStatus: (id: string, status: string, changedBy?: string, notes?: string) => {
      const order = dbState.orders.find(o => o.id === id);
      if (order) {
        order.status = status;
        order.updated_at = new Date().toISOString();
        
        // Record Status history
        dbState.orderStatusHistories.push({
          id: db.generateId('osh'),
          order_id: id,
          status,
          changed_by: changedBy,
          notes,
          created_at: new Date().toISOString()
        });
        
        db.save();
        return order;
      }
      return null;
    }
  },

  // CASH LEDGER (COURIER CASH MANAGEMENT)
  cash: {
    addLedger: (ledger: Omit<CashLedger, 'id' | 'created_at'>) => {
      const entry: CashLedger = {
        ...ledger,
        id: db.generateId('csh'),
        created_at: new Date().toISOString()
      };
      dbState.cashLedgers.push(entry);
      db.save();
      return entry;
    },
    getCourierBalance: (courierId: string) => {
      return dbState.cashLedgers
        .filter(cl => cl.courier_id === courierId)
        .reduce((sum, cl) => {
          if (cl.type === 'COLLECT' || cl.type === 'FLOAT_START') {
            return sum + cl.amount;
          } else if (cl.type === 'SETTLE') {
            return sum - cl.amount;
          }
          return sum;
        }, 0);
    },
    createSettlement: (settlement: Omit<CashSettlement, 'id' | 'created_at'>) => {
      const newSettlement: CashSettlement = {
        ...settlement,
        id: db.generateId('set'),
        created_at: new Date().toISOString()
      };
      dbState.cashSettlements.push(newSettlement);
      // Automatically subtract settled amount in CashLedger
      db.cash.addLedger({
        courier_id: settlement.courier_id,
        shift_id: settlement.shift_id,
        amount: settlement.received_amount,
        type: 'SETTLE',
        notes: `Uzávierka pokladne. Verifikoval: ${settlement.verified_by}`
      });
      db.save();
      return newSettlement;
    },
    getSettlements: (courierId?: string) => {
      if (courierId) {
        return dbState.cashSettlements.filter(cs => cs.courier_id === courierId);
      }
      return dbState.cashSettlements;
    }
  },

  // AUDIT LOGS
  audit: {
    all: () => dbState.auditLogs.sort((a,b) => b.created_at.localeCompare(a.created_at)),
    log: (log: Omit<AuditLog, 'id' | 'created_at'>) => {
      const newLog: AuditLog = {
        ...log,
        id: db.generateId('aud'),
        created_at: new Date().toISOString()
      };
      dbState.auditLogs.push(newLog);
      db.save();
      return newLog;
    }
  }
};
