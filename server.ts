/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { db } from './src/db/dbStore';
import { hashPassword, generateToken, verifyToken } from './src/db/authUtil';

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON & general URL encoding parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Simplistic cookie extraction helper middleware
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    let token = '';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/token=([^;]+)/);
      if (match) token = match[1];
    }
    
    if (token) {
      const userPayload = verifyToken(token);
      if (userPayload) {
        (req as any).user = userPayload;
      }
    }
    next();
  });

  // API - Auth - Register
  app.post('/api/auth/register', (req, res) => {
    try {
      const { email, password, first_name, last_name, phone } = req.body;
      if (!email || !password || !first_name || !last_name) {
        res.status(400).json({ error: 'Chýbajú povinné registračné údaje' });
        return;
      }

      const existing = db.users.findByEmail(email);
      if (existing) {
        res.status(400).json({ error: 'Účet s týmto e-mailom už existuje' });
        return;
      }

      const passHash = hashPassword(password);
      const newUser = db.users.create({
        email,
        password_hash: passHash,
        first_name,
        last_name,
        phone
      });

      // Default role as CUSTOMER
      db.users.addUserRole(newUser.id, 'CUSTOMER');
      db.customers.createProfile({
        id: newUser.id,
        loyalty_points: 0,
        marketing_consent: req.body.marketing_consent || false
      });

      // Log audit action
      db.audit.log({
        user_id: newUser.id,
        action_type: 'REGISTER_SUCCESS',
        table_name: 'User',
        record_id: newUser.id,
        new_values: JSON.stringify({ email: newUser.email }),
        ip_address: req.ip || '127.0.0.1'
      });

      const token = generateToken({ userId: newUser.id, email: newUser.email, roles: ['CUSTOMER'] });
      res.json({ token, user: { id: newUser.id, email: newUser.email, first_name: newUser.first_name, last_name: newUser.last_name, roles: ['CUSTOMER'] } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API - Auth - Login
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Zadajte e-mail a heslo' });
        return;
      }

      const user = db.users.findByEmail(email);
      if (!user) {
        res.status(401).json({ error: 'Nesprávne prihlasovacie údaje' });
        return;
      }

      const hash = hashPassword(password);
      if (user.password_hash !== hash) {
        res.status(401).json({ error: 'Nesprávne prihlasovacie údaje' });
        return;
      }

      const roles = db.users.getRoles(user.id);
      const token = generateToken({ userId: user.id, email: user.email, roles });

      // Action Audit
      db.audit.log({
        user_id: user.id,
        action_type: 'LOGIN_SUCCESS',
        table_name: 'User',
        record_id: user.id,
        ip_address: req.ip || '127.0.0.1'
      });

      res.json({ token, user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, roles } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API - Auth - Profile / Profile update
  app.get('/api/auth/profile', (req, res) => {
    const userPayload = (req as any).user;
    if (!userPayload) {
      res.status(401).json({ error: 'Používateľ nie je prihlásený' });
      return;
    }
    const user = db.users.find(userPayload.userId);
    if (!user) {
      res.status(404).json({ error: 'Profil sa nenašiel' });
      return;
    }
    const profile = db.customers.findProfile(user.id);
    const addresses = db.customers.getAddresses(user.id);
    const roles = db.users.getRoles(user.id);

    res.json({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      roles,
      loyalty_points: profile ? profile.loyalty_points : 0,
      addresses
    });
  });

  // API - Products List & Details (No Auth required)
  app.get('/api/products', (req, res) => {
    try {
      const activeProds = db.products.active();
      const payload = activeProds.map(p => {
        return {
          ...p,
          images: db.products.getImages(p.id),
          variants: db.products.getVariants(p.id),
          options: db.products.getOptions(p.id),
          allergens: db.products.getAllergens(p.id),
          stock: db.inventory.get(p.id, 'br_hlohovec')
        };
      });
      res.json(payload);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/categories', (req, res) => {
    res.json(db.categories.all());
  });

  app.get('/api/branches', (req, res) => {
    const bHash = db.branches.all().map(b => ({
      ...b,
      hours: db.branches.getHours(b.id)
    }));
    res.json(bHash);
  });

  // API - Create Order (Checkout flow)
  app.post('/api/orders', (req, res) => {
    try {
      const { order, items } = req.body;
      if (!order || !items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Nekompletné údaje objednávky plnené košíkom' });
        return;
      }

      // Check stock first! (Test Case 1)
      for (const item of items) {
        const prod = db.products.find(item.product_id);
        if (!prod) {
          res.status(400).json({ error: `Produkt neexistuje` });
          return;
        }

        const stock = db.inventory.get(item.product_id, 'br_hlohovec');
        const available = stock ? stock.quantity : 0;
        
        if (available < item.quantity) {
          res.status(400).json({ 
            error: `Nedostatočné skladové množstvo pre váš obľúbený '${prod.name_sk}'. Skladom iba ${available} ks.`,
            outOfStock: true
          });
          return;
        }
      }

      const activeUser = (req as any).user;

      // Deduct stock (Realtime movement updates)
      items.forEach(itm => {
        db.inventory.updateStock(
          itm.product_id, 
          'br_hlohovec', 
          -itm.quantity, 
          activeUser ? activeUser.userId : 'usr_anon_checkout', 
          'SALE', 
          'Zákaznícky nákup cez e-shop'
        );
      });

      // Create order records
      const finalOrder = db.orders.create({ 
        order: {
          user_id: activeUser ? activeUser.userId : undefined,
          total_price: parseFloat(order.total_price),
          delivery_price: parseFloat(order.delivery_price || 0),
          discount_amount: parseFloat(order.discount_amount || 0),
          final_price: parseFloat(order.final_price),
          delivery_type: order.delivery_type || 'PICKUP',
          branch_id: order.branch_id || 'br_hlohovec',
          scheduled_date: order.scheduled_date || new Date().toISOString().split('T')[0],
          scheduled_time_slot: order.scheduled_time_slot || 'Ihneď k odberu',
          customer_notes: order.customer_notes,
          contact_email: order.contact_email,
          contact_phone: order.contact_phone,
          customer_name: order.customer_name,
          delivery_address_id: order.delivery_address_id,
          invoice_address_id: order.invoice_address_id,
          promo_code_id: order.promo_code_id
        }, 
        items 
      });

      // Award loyalty points to CUSTOMER
      if (activeUser) {
        const profile = db.customers.findProfile(activeUser.userId);
        if (profile) {
          // If they redeemed points, deduct them from progress profile
          const discountAmt = parseFloat(order.discount_amount || 0);
          if (discountAmt > 0) {
            const pointsToDeduct = Math.round(discountAmt / 0.05); // each point is 0.05 EUR
            profile.loyalty_points = Math.max(0, profile.loyalty_points - pointsToDeduct);
          }
          // 1 point for each 10 EUR Spent
          const pointsEarned = Math.floor(finalOrder.final_price / 10);
          profile.loyalty_points += pointsEarned;
          db.save();
        }
      }

      // Log successful checkout audit log
      db.audit.log({
        user_id: activeUser ? activeUser.userId : undefined,
        action_type: 'ORDER_CREATE_SUCCESS',
        table_name: 'Order',
        record_id: finalOrder.id,
        new_values: JSON.stringify({ total: finalOrder.final_price, orderNumber: finalOrder.order_number }),
        ip_address: req.ip || '127.0.0.1'
      });

      res.json(finalOrder);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API - Tracking order lookup by token (No protection - GDPR compliant masks done in client/server)
  app.get('/api/orders/track/:token', (req, res) => {
    try {
      const order = db.orders.findByTracking(req.params.token);
      if (!order) {
        res.status(404).json({ error: 'Objednávka s týmto sledovacím tokenom nebola nájdená.' });
        return;
      }

      const items = db.orders.getItems(order.id);
      const history = db.orders.getHistory(order.id);
      
      // Select the active courier if assigned
      let assignedCourier: any = null;
      let activeEarning: any = null;

      const activeAssignment = db.get().courierAssignments.find(ca => ca.order_id === order.id && (ca.status === 'ACCEPTED' || ca.status === 'COMPLETED'));
      if (activeAssignment) {
        const cr = db.couriers.find(activeAssignment.courier_id);
        if (cr) {
          assignedCourier = {
            id: cr.id,
            vehicle_type: cr.vehicle_type,
            status: cr.status,
            latitude: cr.current_latitude,
            longitude: cr.current_longitude,
            last_updated: cr.last_location_updated_at,
            name: `${cr.user?.first_name} ${cr.user?.last_name ? cr.user.last_name[0] : ''}.` // GDPR masked last_name!
          };
        }
        
        activeEarning = db.get().courierEarnings.find(e => e.order_id === order.id);
      }

      res.json({
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        final_price: order.final_price,
        delivery_type: order.delivery_type,
        scheduled_date: order.scheduled_date,
        scheduled_time_slot: order.scheduled_time_slot,
        customer_name: order.customer_name,
        contact_phone: order.contact_phone, // masked on UI side for GDPR
        created_at: order.created_at,
        items,
        history,
        courier: assignedCourier,
        earnings: activeEarning
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API - Update Order Status (Admins / Couriers / Production)
  app.post('/api/orders/:id/status', (req, res) => {
    try {
      const { status, notes } = req.body;
      if (!status) {
        res.status(400).json({ error: 'Musí byť zadaný nový stav.' });
        return;
      }

      const activeUser = (req as any).user;
      const userId = activeUser ? activeUser.userId : 'system';
      const updatedOrder = db.orders.updateStatus(req.params.id, status, userId, notes);
      
      if (!updatedOrder) {
        res.status(404).json({ error: 'Objednávka sa nenašla' });
        return;
      }

      // If status is DELIVERED, record CashLedger for cash payments (Test Case 3)
      if (status === 'DELIVERED') {
        const order = db.get().orders.find((o: any) => o.id === req.params.id);
        if (order) {
          const assignment = db.get().courierAssignments.find((a: any) => a.order_id === order.id);
          const courier_id = assignment ? assignment.courier_id : 'usr_courier1';
          
          // Check if we already logged cash for this order to prevent duplicate ledger items
          const existingLedger = db.get().cashLedgers.find((cl: any) => cl.reference_order_id === order.id);
          if (!existingLedger) {
            db.cash.addLedger({
              courier_id,
              shift_id: 'shf_current',
              amount: order.final_price,
              type: 'COLLECT',
              reference_order_id: order.id,
              notes: `Inkaso hotovosti od zákazníka ${order.customer_name} pre objednávku ${order.order_number}`
            });
          }
        }
      }

      // If status is CANCELLED, restore the stock! (Test Case 1)
      if (status === 'CANCELLED') {
        const items = db.orders.getItems(req.params.id);
        items.forEach(itm => {
          if (itm.product_id) {
            db.inventory.updateStock(
              itm.product_id, 
              'br_hlohovec', 
              itm.quantity, 
              userId, 
              'ADJUSTMENT', 
              'Storno objednávky - vrátenie naspäť na sklad'
            );
          }
        });
      }

      // Log dispatch / update action
      db.audit.log({
        user_id: activeUser ? activeUser.userId : undefined,
        action_type: 'ORDER_STATUS_UPDATE',
        table_name: 'Order',
        record_id: req.params.id,
        new_values: JSON.stringify({ status, notes }),
        ip_address: req.ip || '127.0.0.1'
      });

      res.json(updatedOrder);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API - Get all orders (for Admin/Dispatcher/Production panes)
  app.get('/api/admin/orders', (req, res) => {
    try {
      const activeUser = (req as any).user;
      if (!activeUser) {
        res.status(455).json({ error: 'Prístup zamietnutý' });
        return;
      }

      const all = db.orders.all();
      const enriched = all.map(o => {
        return {
          ...o,
          items: db.orders.getItems(o.id),
          history: db.orders.getHistory(o.id),
          assignment: db.get().courierAssignments.find(ca => ca.order_id === o.id)
        };
      });
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API - Couriers Status Update & Map tracing endpoints
  app.get('/api/admin/couriers', (req, res) => {
    res.json(db.couriers.all());
  });

  app.post('/api/couriers/status', (req, res) => {
    try {
      const { courier_id, status } = req.body;
      if (!courier_id || !status) {
        res.status(400).json({ error: 'Chýba courier_id alebo status' });
        return;
      }
      const updated = db.couriers.updateStatus(courier_id, status);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/couriers/location', (req, res) => {
    try {
      const { courier_id, latitude, longitude, speed } = req.body;
      if (!courier_id || latitude === undefined || longitude === undefined) {
        res.status(400).json({ error: 'Chýba poloha' });
        return;
      }
      const updated = db.couriers.updateLocation(courier_id, latitude, longitude, speed || 0);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API - Manual Assignment of Courier
  app.post('/api/admin/assignments', (req, res) => {
    try {
      const { courier_id, order_id } = req.body;
      if (!courier_id || !order_id) {
        res.status(400).json({ error: 'Chýba kuriér alebo objednávka' });
        return;
      }

      // Check if courier is online and available (Test Case 2)
      const cr = db.couriers.find(courier_id);
      if (!cr || cr.status === 'OFFLINE') {
        res.status(400).json({ error: 'Nepodarilo sa priradiť objednávku: Kuriér je OFFLINE.' });
        return;
      }

      // Create CourierAssignment
      const assign_id = db.generateId('ca');
      const assignment = {
        id: assign_id,
        courier_id,
        order_id,
        status: 'ACCEPTED' as const, // automatically accepted for direct assigns
        assigned_at: new Date().toISOString()
      };
      
      db.get().courierAssignments.push(assignment);

      // Create earnings calculations (Test Case 3)
      const earn_id = db.generateId('earn');
      const baseFee = 3.50;
      const distanceFee = 1.20; // 1.20 EUR / KM typical
      const earngEntry = {
        id: earn_id,
        courier_id,
        order_id,
        base_fee: baseFee,
        distance_fee: distanceFee,
        waiting_time_fee: 0,
        bonus_fee: 0,
        penalty_deduction: 0,
        currency: 'EUR',
        created_at: new Date().toISOString()
      };
      db.get().courierEarnings.push(earngEntry);

      const activeUser = (req as any).user;

      // Settle order updates to DISPATCHED
      db.orders.updateStatus(order_id, 'COURIER_ASSIGNED', activeUser?.userId || 'dispatcher', 'Kuriér bol priradený dispešerom');

      db.save();
      res.json({ assignment, earnings: earngEntry });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API - Get Courier Earnings / Ledger balance
  app.get('/api/couriers/:id/finance', (req, res) => {
    try {
      const courier_id = req.params.id;
      const earnings = db.get().courierEarnings.filter(e => e.courier_id === courier_id);
      const balance = db.cash.getCourierBalance(courier_id);
      const ledger = db.get().cashLedgers.filter(cl => cl.courier_id === courier_id);
      const settlements = db.cash.getSettlements(courier_id);

      res.json({
        earnings,
        cash_balance: balance,
        ledger,
        settlements
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API - Courier Settle Cash on hand
  app.post('/api/admin/finance/settle', (req, res) => {
    try {
      const { courier_id, expected_amount, received_amount, shift_id } = req.body;
      if (!courier_id || expected_amount === undefined || received_amount === undefined) {
        res.status(400).json({ error: 'Nekompletné finančné dáta pre vysporiadanie' });
        return;
      }

      const discrepancy = parseFloat(expected_amount) - parseFloat(received_amount);
      const status = discrepancy === 0 ? 'MATCHED' : 'DISCREPANCY_PENDING';

      const activeUser = (req as any).user;

      const settlement = db.cash.createSettlement({
        courier_id,
        shift_id: shift_id || 'shf_current',
        expected_amount: parseFloat(expected_amount),
        received_amount: parseFloat(received_amount),
        discrepancy,
        status,
        verified_by: activeUser ? activeUser.userId : 'usr_admin',
      });

      res.json(settlement);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API - Product CRUD, edits (Admins)
  app.post('/api/admin/products', (req, res) => {
    try {
      const { name_sk, base_price, category_id, min_lead_hours, is_gluten_free, is_lactose_free, is_sugar_free, quantity_stock } = req.body;
      if (!name_sk || !base_price || !category_id) {
        res.status(400).json({ error: 'Názov, základná cena a kategória sú povinné.' });
        return;
      }
      
      const slug = name_sk.toLowerCase().trim().replace(/ /g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const newP = db.products.create({
        category_id,
        slug,
        name_sk,
        base_price: parseFloat(base_price),
        unit: req.body.unit || 'ks',
        pieces_per_pack: parseInt(req.body.pieces_per_pack || 1),
        shelf_life_days: parseInt(req.body.shelf_life_days || 2),
        delivery_allowed: req.body.delivery_allowed !== false,
        pickup_allowed: req.body.pickup_allowed !== false,
        min_lead_hours: parseInt(min_lead_hours || 24),
        is_gluten_free: is_gluten_free === true,
        is_lactose_free: is_lactose_free === true,
        is_sugar_free: is_sugar_free === true,
        is_active: true,
        weight_g: parseInt(req.body.weight_g || 100),
        storage_temp_sk: req.body.storage_temp_sk || 'Skladujte pri teplote 2-6 °C',
        short_desc_sk: req.body.short_desc_sk || '',
        long_desc_sk: req.body.long_desc_sk || ''
      });

      // Set default image placeholder or uploaded image url
      db.products.setImages(newP.id, [
        {
          image_url: req.body.image_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
          is_primary: true,
          focal_point_x: 0.5,
          focal_point_y: 0.5,
          alt_text: name_sk
        }
      ]);

      const activeUser = (req as any).user;

      // Seed current branch stock
      db.inventory.updateStock(newP.id, 'br_hlohovec', parseInt(quantity_stock || 10), activeUser?.userId || 'usr_admin', 'STOCK_IN', 'Prvotný nákupný zámer naskladnenia');

      res.json(newP);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/products/:id', (req, res) => {
    try {
      const updated = db.products.update(req.params.id, req.body);
      const activeUser = (req as any).user;

      if (req.body.quantity_stock !== undefined) {
        // Adjust stock directly
        const stockObj = db.inventory.get(req.params.id, 'br_hlohovec');
        const current = stockObj ? stockObj.quantity : 0;
        const delta = parseInt(req.body.quantity_stock) - current;
        if (delta !== 0) {
          db.inventory.updateStock(req.params.id, 'br_hlohovec', delta, activeUser?.userId || 'usr_admin', 'ADJUSTMENT', 'Manuálna úprava stavu skladu v admini');
        }
      }
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API - Audit list view
  app.get('/api/admin/audit', (req, res) => {
    res.json(db.audit.all());
  });

  // API - Custom Cake Inquiries
  app.post('/api/inquiries', (req, res) => {
    try {
      const activeUser = (req as any).user;
      const { 
        occasion, 
        serving_count, 
        cake_shape, 
        flavor_profile, 
        allergies_sk, 
        visual_description, 
        guest_name, 
        guest_phone, 
        guest_email,
        budget_range,
        delivery_type
      } = req.body;

      const newInq = db.inquiries.createCake({
        user_id: activeUser?.userId,
        guest_name: guest_name || 'Hosť',
        guest_phone: guest_phone || '',
        guest_email: guest_email || '',
        occasion: occasion || 'CELEBRATION',
        event_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0], 
        serving_count: parseInt(serving_count) || 15,
        cake_shape: cake_shape || 'ROUND',
        flavor_profile: flavor_profile || '',
        allergies_sk: allergies_sk || '',
        visual_description: visual_description || '',
        budget_range: budget_range || '50-100 EUR',
        delivery_type: delivery_type || 'PICKUP'
      });

      // Log audit
      db.audit.log({
        user_id: activeUser?.userId,
        action_type: 'CAKE_INQUIRY_CREATE',
        table_name: 'CustomCakeInquiry',
        record_id: newInq.id,
        new_values: JSON.stringify({ number: newInq.inquiry_number, email: newInq.guest_email }),
        ip_address: req.ip || '127.0.0.1'
      });

      res.status(201).json(newInq);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/inquiries', (req, res) => {
    try {
      res.json(db.inquiries.allCake());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/inquiries/:id/status', (req, res) => {
    try {
      const { status, manager_notes, price_offer, convert_to_order } = req.body;
      const activeUser = (req as any).user;
      
      const priceVal = price_offer !== undefined ? parseFloat(price_offer) : undefined;
      const inq = db.get().customCakeInquiries.find((i: any) => i.id === req.params.id);
      if (!inq) {
        res.status(404).json({ error: 'Dopyt neexistuje' });
        return;
      }

      let convertedOrderId = undefined;

      // Convert Custom Cake to Order if approved
      if (convert_to_order && inq.status !== 'CONVERTED') {
        const finalPrice = priceVal || inq.price_offer || 80;
        
        // Ensure there is stock to fulfill a custom order (we add 1 to inv_torta to allow checkout)
        const stockObj = db.inventory.get('p_torta_coko', 'br_hlohovec');
        if (stockObj && stockObj.quantity <= 0) {
          db.inventory.updateStock('p_torta_coko', 'br_hlohovec', 10, 'usr_admin', 'ADJUSTMENT', 'Navýšenie skladu pre dopyt');
        }

        const finalOrder = db.orders.create({
          order: {
            user_id: inq.user_id,
            total_price: finalPrice,
            delivery_price: inq.delivery_type === 'DELIVERY' ? 4.90 : 0.00,
            discount_amount: 0,
            final_price: finalPrice + (inq.delivery_type === 'DELIVERY' ? 4.90 : 0.00),
            delivery_type: inq.delivery_type || 'PICKUP',
            branch_id: 'br_hlohovec',
            scheduled_date: inq.event_date || new Date().toISOString().split('T')[0],
            scheduled_time_slot: '12:00 - 14:00',
            customer_notes: `🎂 TORTA NA MIERU (${inq.inquiry_number}): Príchuť: ${inq.flavor_profile}. Dizajn: ${inq.visual_description}`,
            contact_email: inq.guest_email || 'olajos-guest@gmail.com',
            contact_phone: inq.guest_phone || '+421901234567',
            customer_name: inq.guest_name || 'Hosť',
          },
          items: [
            {
              product_id: 'p_torta_coko',
              quantity: 1,
              customization_notes: `Konvertovaný dopyt č. ${inq.inquiry_number}`
            }
          ]
        });

        convertedOrderId = finalOrder.id;
      }

      const updated = db.inquiries.updateCake(
        req.params.id,
        convertedOrderId ? 'CONVERTED' : (status || inq.status),
        manager_notes,
        priceVal,
        convertedOrderId || inq.converted_order_id
      );

      db.audit.log({
        user_id: activeUser?.userId || 'usr_admin',
        action_type: convertedOrderId ? 'CAKE_INQUIRY_CONVERT_SUCCESS' : 'CAKE_INQUIRY_STATUS_UPDATE',
        table_name: 'CustomCakeInquiry',
        record_id: req.params.id,
        new_values: JSON.stringify({ status: updated?.status, price: updated?.price_offer, converted_id: convertedOrderId }),
        ip_address: req.ip || '127.0.0.1'
      });

      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  // Mounting Vite Dev Middleware
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Serving Static Frontend Build Assets in Production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Active Listening
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Olajos server running securely on http://localhost:${PORT}`);
  });
}

startServer();
