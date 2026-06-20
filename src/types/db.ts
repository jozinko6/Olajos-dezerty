/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export type UserRoleName = 'CUSTOMER' | 'ADMIN' | 'STORE_MANAGER' | 'PRODUCTION' | 'PACKING' | 'DISPATCHER' | 'COURIER';

export interface UserRole {
  user_id: string;
  role: UserRoleName;
}

export interface CustomerProfile {
  id: string;
  loyalty_points: number;
  birth_date?: string;
  company_name?: string;
  company_dic?: string;
  company_ic_dph?: string;
  marketing_consent: boolean;
}

export interface Address {
  id: string;
  user_id?: string;
  street: string;
  city: string;
  postal_code: string;
  country: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
  type: 'DELIVERY' | 'BILLING';
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  is_active: boolean;
  latitude: number;
  longitude: number;
}

export interface BusinessHours {
  id: string;
  branch_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  open_time?: string; // e.g. "08:00"
  close_time?: string; // e.g. "18:00"
  is_closed: boolean;
}

export interface ProductCategory {
  id: string;
  slug: string;
  name_sk: string;
  description_sk?: string;
  image_url?: string;
  display_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  category_id?: string;
  slug: string;
  name_sk: string;
  short_desc_sk?: string;
  long_desc_sk?: string;
  base_price: number;
  unit: string;
  weight_g?: number;
  pieces_per_pack: number;
  shelf_life_days?: number;
  storage_temp_sk?: string;
  is_gluten_free: boolean;
  is_lactose_free: boolean;
  is_sugar_free: boolean;
  delivery_allowed: boolean;
  pickup_allowed: boolean;
  min_lead_hours: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
  focal_point_x: number;
  focal_point_y: number;
  alt_text?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name_sk: string;
  price_modifier: number;
  sku?: string;
  is_active: boolean;
}

export interface ProductOptionGroup {
  id: string;
  product_id: string;
  name_sk: string;
  min_selection: number;
  max_selection: number;
}

export interface ProductOption {
  id: string;
  group_id: string;
  name_sk: string;
  price: number;
  is_active: boolean;
}

export interface Allergen {
  id: number;
  code: string;
  name_sk: string;
}

export interface ProductAllergen {
  product_id: string;
  allergen_id: number;
}

export interface Collection {
  id: string;
  slug: string;
  name_sk: string;
  description_sk?: string;
  image_url?: string;
  is_active: boolean;
}

export interface CollectionProduct {
  collection_id: string;
  product_id: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  branch_id: string;
  quantity: number;
  reserved_quantity: number;
  min_stock_alert: number;
}

export interface InventoryMovement {
  id: string;
  inventory_id: string;
  user_id: string;
  quantity: number; // positive or negative
  type: 'SALE' | 'STOCK_IN' | 'WASTE' | 'ADJUSTMENT';
  reason?: string;
  created_at: string;
}

export interface Order {
  id: string;
  tracking_token: string;
  order_number: string;
  user_id?: string;
  status: string;
  total_price: number;
  delivery_price: number;
  discount_amount: number;
  final_price: number;
  delivery_type: 'DELIVERY' | 'PICKUP';
  branch_id: string;
  scheduled_date: string;
  scheduled_time_slot: string;
  customer_notes?: string;
  contact_email: string;
  contact_phone: string;
  customer_name: string;
  delivery_address_id?: string;
  invoice_address_id?: string;
  promo_code_id?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name_snapshot: string;
  variant_id?: string;
  variant_name_snapshot?: string;
  unit_price: number;
  quantity: number;
  customization_notes?: string;
}

export interface OrderItemOption {
  id: string;
  order_item_id: string;
  option_id?: string;
  option_name_snapshot: string;
  option_price_snapshot: number;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: string;
  changed_by?: string;
  notes?: string;
  created_at: string;
}

export interface Courier {
  id: string; // matches User.id
  vehicle_type: 'CAR' | 'MOPED' | 'E_BIKE' | 'FOOT';
  is_active: boolean;
  status: 'OFFLINE' | 'AVAILABLE' | 'ON_TRIP' | 'BREAK';
  current_latitude?: number;
  current_longitude?: number;
  last_location_updated_at?: string;
}

export interface CourierVehicle {
  id: string;
  courier_id: string;
  plate_number?: string;
  has_cooling_box: boolean;
  max_payload_volume: number;
}

export interface CourierShift {
  id: string;
  courier_id: string;
  branch_id: string;
  start_time: string;
  end_time?: string;
  is_completed: boolean;
}

export interface CourierLocation {
  id: string;
  courier_id: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  recorded_at: string;
}

export interface CourierAssignment {
  id: string;
  courier_id: string;
  order_id: string;
  status: 'OFFERED' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'FAILED';
  assigned_at: string;
  responded_at?: string;
  rejection_reason?: string;
}

export interface CourierEarning {
  id: string;
  courier_id: string;
  order_id: string;
  base_fee: number;
  distance_fee: number;
  waiting_time_fee: number;
  bonus_fee: number;
  penalty_deduction: number;
  currency: string;
  created_at: string;
}

export interface CashLedger {
  id: string;
  courier_id: string;
  shift_id: string;
  amount: number;
  type: 'COLLECT' | 'SETTLE' | 'FLOAT_START';
  reference_order_id?: string;
  notes?: string;
  created_at: string;
}

export interface CashSettlement {
  id: string;
  courier_id: string;
  shift_id: string;
  expected_amount: number;
  received_amount: number;
  discrepancy: number;
  status: 'MATCHED' | 'DISCREPANCY_PENDING' | 'RESOLVED';
  verified_by: string;
  created_at: string;
}

export interface CustomCakeInquiry {
  id: string;
  inquiry_number: string;
  user_id?: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  occasion: 'WEDDING' | 'BIRTHDAY' | 'BAPTISM' | 'CELEBRATION';
  event_date: string;
  serving_count: number;
  cake_shape: 'ROUND' | 'SQUARE' | 'HEART' | 'MULTI_TIER';
  flavor_profile: string;
  allergies_sk: string;
  visual_description: string;
  budget_range: string;
  delivery_type: 'DELIVERY' | 'PICKUP';
  status: string;
  manager_notes?: string;
  price_offer?: number;
  converted_order_id?: string;
  created_at: string;
}

export interface CustomCakeImage {
  id: string;
  inquiry_id: string;
  image_url: string;
  created_at: string;
}

export interface CateringInquiry {
  id: string;
  user_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  event_type: 'WEDDING' | 'CORPORATE' | 'FAMILY_PARTY';
  event_date: string;
  event_location: string;
  guest_count: number;
  required_assortment_sk: string;
  services_required_json: string; // serialized stringified array e.g. '["CANDY_BAR_INSTALLATION", "DECORATION"]'
  budget_limit: number;
  status: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action_type: string;
  table_name: string;
  record_id: string;
  old_values?: string; // stringified JSON
  new_values?: string; // stringified JSON
  ip_address: string;
  created_at: string;
}
