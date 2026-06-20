# Návrh databázy & Dátový model (Etapa 1)
**Olajos dezerty Hlohovec**

Tento dokument detailne definuje ucelený relačný dátový model pre systém **Olajos dezerty Hlohovec**. Popisuje tabuľky, atribúty, dátové typy, cudzie kľúče, integritné obmedzenia a logické vzťahy medzi entitami.

---

## 1. Používateľské kontá a profily (Users & Auth)

### `User` (Používatelia systému)
- `id`: `UUID` (Primary Key, vygenerované databázou)
- `email`: `VARCHAR(255)` (Unique, Not Null)
- `password_hash`: `VARCHAR(255)` (Not Null)
- `first_name`: `VARCHAR(100)` (Not Null)
- `last_name`: `VARCHAR(100)` (Not Null)
- `phone`: `VARCHAR(50)` (Nullable, pre rýchly kontakt)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)
- `updated_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

### `Role` (Roly v systéme)
- `id`: `INTEGER` (Primary Key)
- `name`: `VARCHAR(50)` (Unique, napr. `CUSTOMER`, `ADMIN`, `STORE_MANAGER`, `PRODUCTION`, `PACKING`, `DISPATCHER`, `COURIER`)
- `description`: `TEXT`

### `UserRole` (Vzťah používateľ-rola, n:m)
- `user_id`: `UUID` (Foreign Key -> `User.id`, Cascade Delete)
- `role_id`: `INTEGER` (Foreign Key -> `Role.id`, Cascade Delete)
- *Composite PK*: (`user_id`, `role_id`)

### `CustomerProfile` (Rozšírené údaje pre stálych zákazníkov)
- `id`: `UUID` (Primary Key, Foreign Key -> `User.id`, Cascade Delete)
- `loyalty_points`: `INTEGER` (Default: 0)
- `birth_date`: `DATE` (Nullable, pre narodeninové bonusy)
- `company_name`: `VARCHAR(150)` (Nullable, pre firmy)
- `company_dic`: `VARCHAR(20)` (Nullable)
- `company_ic_dph`: `VARCHAR(20)` (Nullable)
- `marketing_consent`: `BOOLEAN` (Default: FALSE)

### `Address` (Adresný register)
- `id`: `UUID` (Primary Key)
- `user_id`: `UUID` (Foreign Key -> `User.id`, Nullable pre neregistrovaných hostí)
- `street`: `VARCHAR(150)` (Not Null)
- `city`: `VARCHAR(100)` (Not Null, predvolené "Hlohovec")
- `postal_code`: `VARCHAR(20)` (Not Null)
- `country`: `VARCHAR(50)` (Default: "Slovensko")
- `latitude`: `DOUBLE PRECISION` (Nullable, pre overenie doručovacej zóny)
- `longitude`: `DOUBLE PRECISION` (Nullable)
- `is_default`: `BOOLEAN` (Default: FALSE)
- `type`: `VARCHAR(50)` (Napriklad: `DELIVERY`, `BILLING`)

---

## 2. Pobočky, prevádzky a otváracie hodiny

### `Branch` (Pobočky cukrárne)
- `id`: `UUID` (Primary Key)
- `name`: `VARCHAR(150)` (Not Null, napr. "Cukráreň Pribinova Hlohovec")
- `address`: `VARCHAR(255)` (Not Null)
- `phone`: `VARCHAR(50)` (Not Null)
- `email`: `VARCHAR(100)` (Not Null)
- `is_active`: `BOOLEAN` (Default: TRUE)
- `latitude`: `DOUBLE PRECISION` (Not Null)
- `longitude`: `DOUBLE PRECISION` (Not Null)

### `BusinessHours` (Otváracie hodiny prevádzok)
- `id`: `UUID` (Primary Key)
- `branch_id`: `UUID` (Foreign Key -> `Branch.id`, Cascade Delete)
- `day_of_week`: `INTEGER` (0 = Nedeľa, 1 = Pondelok, ..., 6 = Sobota)
- `open_time`: `TIME` (Nullable, ak je zatvorené, tak NULL)
- `close_time`: `TIME` (Nullable)
- `is_closed`: `BOOLEAN` (Default: FALSE)

---

## 3. Katalóg produktov, varianty, alergény

### `ProductCategory` (Kategórie dezertov)
- `id`: `UUID` (Primary Key)
- `slug`: `VARCHAR(100)` (Unique, Not Null)
- `name_sk`: `VARCHAR(100)` (Not Null)
- `description_sk`: `TEXT` (Nullable)
- `image_url`: `VARCHAR(255)` (Nullable)
- `display_order`: `INTEGER` (Default: 0)
- `is_active`: `BOOLEAN` (Default: TRUE)

### `Product` (Výrobky)
- `id`: `UUID` (Primary Key)
- `category_id`: `UUID` (Foreign Key -> `ProductCategory.id`, Set Null)
- `slug`: `VARCHAR(150)` (Unique, Not Null)
- `name_sk`: `VARCHAR(150)` (Not Null)
- `short_desc_sk`: `TEXT` (Nullable)
- `long_desc_sk`: `TEXT` (Nullable)
- `base_price`: `DECIMAL(10,2)` (Not Null)
- `unit`: `VARCHAR(20)` (Naprikald: `ks`, `g`, `pack`)
- `weight_g`: `INTEGER` (Gramáž, nullable)
- `pieces_per_pack`: `INTEGER` (Default: 1)
- `shelf_life_days`: `INTEGER` (Trvanlivosť v dňoch)
- `storage_temp_sk`: `VARCHAR(50)` (Napriklad: "Skladujte pri teplote 2-6 °C")
- `is_gluten_free`: `BOOLEAN` (Default: FALSE)
- `is_lactose_free`: `BOOLEAN` (Default: FALSE)
- `is_sugar_free`: `BOOLEAN` (Default: FALSE)
- `delivery_allowed`: `BOOLEAN` (Default: TRUE, či je možný dovoz)
- `pickup_allowed`: `BOOLEAN` (Default: TRUE, či je možný osobný odber)
- `min_lead_hours`: `INTEGER` (Default: 24, minimálny čas predobjednávky)
- `is_active`: `BOOLEAN` (Default: TRUE)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

### `ProductImage` (Viacero fotografií k produktom)
- `id`: `UUID` (Primary Key)
- `product_id`: `UUID` (Foreign Key -> `Product.id`, Cascade Delete)
- `image_url`: `VARCHAR(255)` (Not Null)
- `is_primary`: `BOOLEAN` (Default: FALSE)
- `focal_point_x`: `DOUBLE PRECISION` (Default: 0.5)
- `focal_point_y`: `DOUBLE PRECISION` (Default: 0.5)
- `alt_text`: `VARCHAR(255)` (Nullable)

### `ProductVariant` (Varianty produktu, napr. veľkosť torty)
- `id`: `UUID` (Primary Key)
- `product_id`: `UUID` (Foreign Key -> `Product.id`, Cascade Delete)
- `name_sk`: `VARCHAR(100)` (Not Null, napr. "Torta Ø 18cm (8-10 porcií)")
- `price_modifier`: `DECIMAL(10,2)` (Default: 0.00, prirážka k základnej cene)
- `sku`: `VARCHAR(50)` (Unique, Nullable)
- `is_active`: `BOOLEAN` (Default: TRUE)

### `ProductOptionGroup` (Skupiny doplnkov k produktu, napr. nápis, sviečky)
- `id`: `UUID` (Primary Key)
- `product_id`: `UUID` (Foreign Key -> `Product.id`, Cascade Delete)
- `name_sk`: `VARCHAR(100)` (Not Null, napr. "Prianie a ozdoby")
- `min_selection`: `INTEGER` (Default: 0)
- `max_selection`: `INTEGER` (Default: 1)

### `ProductOption` (Jednotlivé možnosti / doplnky)
- `id`: `UUID` (Primary Key)
- `group_id`: `UUID` (Foreign Key -> `ProductOptionGroup.id`, Cascade Delete)
- `name_sk`: `VARCHAR(100)` (Not Null, napr. "Čokoládový nápis")
- `price`: `DECIMAL(10,2)` (Default: 0.00)
- `is_active`: `BOOLEAN` (Default: TRUE)

### `Allergen` (Zoznam legislatívnych alergénov)
- `id`: `INTEGER` (Primary Key)
- `code`: `VARCHAR(10)` (Unique, napr. "1", "3", "7")
- `name_sk`: `VARCHAR(100)` (Not Null, napr. "Obilniny obsahujúce lepok")

### `ProductAllergen` (Väzobná tabuľka allergen-produkt)
- `product_id`: `UUID` (Foreign Key -> `Product.id`, Cascade Delete)
- `allergen_id`: `INTEGER` (Foreign Key -> `Allergen.id`, Cascade Delete)
- *Composite PK*: (`product_id`, `allergen_id`)

### `Collection` (Tepmatické kolekcie produktov, napr. "Pre oslavy")
- `id`: `UUID` (Primary Key)
- `slug`: `VARCHAR(100)` (Unique, Not Null)
- `name_sk`: `VARCHAR(150)` (Not Null)
- `description_sk`: `TEXT` (Nullable)
- `image_url`: `VARCHAR(255)` (Nullable)
- `is_active`: `BOOLEAN` (Default: TRUE)

### `CollectionProduct` (Vzťah kolekcia-produkt)
- `collection_id`: `UUID` (Foreign Key -> `Collection.id`, Cascade Delete)
- `product_id`: `UUID` (Foreign Key -> `Product.id`, Cascade Delete)
- *Composite PK*: (`collection_id`, `product_id`)

---

## 4. Sklad a okamžitá dostupnosť

### `Inventory` (Stav skladu v reálnom čase)
- `id`: `UUID` (Primary Key)
- `product_id`: `UUID` (Foreign Key -> `Product.id`, Cascade Delete)
- `branch_id`: `UUID` (Foreign Key -> `Branch.id`, Cascade Delete)
- `quantity`: `INTEGER` (Default: 0)
- `reserved_quantity`: `INTEGER` (Default: 0, množstvo v nezaplatených košíkoch)
- `min_stock_alert`: `INTEGER` (Default: 5, limit pre notifikáciu adminovi)
- *Composite Unique*: (`product_id`, `branch_id`)

### `InventoryMovement` (Pohyby na sklade - audit)
- `id`: `UUID` (Primary Key)
- `inventory_id`: `UUID` (Foreign Key -> `Inventory.id`, Cascade Delete)
- `user_id`: `UUID` (Foreign Key -> `User.id`, zapisovateľ pohybu, napr. manažér)
- `quantity`: `INTEGER` (Kladné/Záporné zmeny stavu)
- `type`: `VARCHAR(50)` (Napriklad: `SALE`, `STOCK_IN`, `WASTE`, `ADJUSTMENT`)
- `reason`: `TEXT` (Nullable, podrobnosti o odpise)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

---

## 5. Nákupný košík (Active Carts)

### `Cart` (Nákupné košíky)
- `id`: `UUID` (Primary Key)
- `user_id`: `UUID` (Foreign Key -> `User.id`, Nullable pre hostí)
- `session_token`: `VARCHAR(255)` (Unique, pre anonymné košíky v cookies)
- `delivery_type`: `VARCHAR(50)` (Napriklad: `DELIVERY`, `PICKUP`)
- `branch_id`: `UUID` (Foreign Key -> `Branch.id`, vybraná pobočka pre odber)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)
- `updated_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

### `CartItem` (Položky košíka)
- `id`: `UUID` (Primary Key)
- `cart_id`: `UUID` (Foreign Key -> `Cart.id`, Cascade Delete)
- `product_id`: `UUID` (Foreign Key -> `Product.id`, Cascade Delete)
- `variant_id`: `UUID` (Foreign Key -> `ProductVariant.id`, Nullable)
- `quantity`: `INTEGER` (Default: 1, systém kontroluje celkový limit)
- `customization_notes`: `TEXT` (Nullable, napr. "Meno JANKO")

### `CartItemOption` (Doplnky v košíku)
- `cart_item_id`: `UUID` (Foreign Key -> `CartItem.id`, Cascade Delete)
- `option_id`: `UUID` (Foreign Key -> `ProductOption.id`, Cascade Delete)
- *Composite PK*: (`cart_item_id`, `option_id`)

---

## 6. Objednávky, Platby a Fakturácia

### `Order` (Zákaznícke objednávky)
- `id`: `UUID` (Primary Key)
- `tracking_token`: `VARCHAR(100)` (Unique, bezpečný hash pre verejné sledovanie bez prihlásenia)
- `order_number`: `VARCHAR(50)` (Unique, Not Null, naprikald "OL-2026-00001")
- `user_id`: `UUID` (Foreign Key -> `User.id`, Nullable pre hostí)
- `status`: `VARCHAR(50)` (Not Null, hodnota zo stavového automatu)
- `total_price`: `DECIMAL(10,2)` (Not Null)
- `delivery_price`: `DECIMAL(10,2)` (Default: 0.00)
- `discount_amount`: `DECIMAL(10,2)` (Default: 0.00)
- `final_price`: `DECIMAL(10,2)` (Not Null, `total_price + delivery_price - discount_amount`)
- `delivery_type`: `VARCHAR(50)` (Naprikald: `DELIVERY`, `PICKUP`)
- `branch_id`: `UUID` (Foreign Key -> `Branch.id`, pre vyzdvihnutie / expedíciu)
- `scheduled_date`: `DATE` (Zvolený deň doručenia)
- `scheduled_time_slot`: `VARCHAR(50)` (Zvolené časové okno)
- `customer_notes`: `TEXT` (Nullable)
- `contact_email`: `VARCHAR(255)` (Not Null, pre notifikácie)
- `contact_phone`: `VARCHAR(50)` (Not Null)
- `customer_name`: `VARCHAR(150)` (Not Null, pre hostí / doručenie)
- `delivery_address_id`: `UUID` (Foreign Key -> `Address.id`, Nullable pre osobný odber)
- `invoice_address_id`: `UUID` (Foreign Key -> `Address.id`, Nullable ak je zhodná s doručovacou)
- `promo_code_id`: `UUID` (Foreign Key -> `PromoCode.id`, Nullable)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)
- `updated_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

### `OrderItem` (Položky objednávky)
- `id`: `UUID` (Primary Key)
- `order_id`: `UUID` (Foreign Key -> `Order.id`, Cascade Delete)
- `product_id`: `UUID` (Foreign Key -> `Product.id`, Set Null)
- `product_name_snapshot`: `VARCHAR(255)` (Snapshot názvu)
- `variant_id`: `UUID` (Foreign Key -> `ProductVariant.id`, Nullable)
- `variant_name_snapshot`: `VARCHAR(255)` (Snapshot názvu variantu)
- `unit_price`: `DECIMAL(10,2)` (Not Null, zachytená cena v čase nákupu)
- `quantity`: `INTEGER` (Not Null)
- `customization_notes`: `TEXT` (Nullable)

### `OrderItemOption` (Doplnky v objednávke)
- `id`: `UUID` (Primary Key)
- `order_item_id`: `UUID` (Foreign Key -> `OrderItem.id`, Cascade Delete)
- `option_id`: `UUID` (Foreign Key -> `ProductOption.id`, Set Null)
- `option_name_snapshot`: `VARCHAR(150)` (Snapshot doplnku)
- `option_price_snapshot`: `DECIMAL(10,2)` (Not Null)

### `OrderStatusHistory` (História zmien stavov - audit trasy objednávky)
- `id`: `UUID` (Primary Key)
- `order_id`: `UUID` (Foreign Key -> `Order.id`, Cascade Delete)
- `status`: `VARCHAR(50)` (Názov nového stavu)
- `changed_by`: `UUID` (Foreign Key -> `User.id`, Nullable ak to vyvolal systém/hosť)
- `notes`: `TEXT` (Nullable, podrobnosti o zmene)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

### `Payment` (Rozvrh a stav platieb)
- `id`: `UUID` (Primary Key)
- `order_id`: `UUID` (Foreign Key -> `Order.id`, Cascade Delete)
- `payment_method`: `VARCHAR(50)` (Naprikald: `CARD_ONLINE`, `CASH_ON_DELIVERY`, `CARD_ON_DELIVERY`, `CASH_IN_STORE`)
- `status`: `VARCHAR(50)` (Naprikald: `PENDING`, `AUTHORIZED`, `COMPLETED`, `FAILED`, `REFUNDED`)
- `amount`: `DECIMAL(10,2)` (Not Null)
- `transaction_id`: `VARCHAR(255)` (Nullable, ID z platobnej brány)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)
- `updated_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

### `PaymentEvent` (Surové platobné eventy z webhookov)
- `id`: `UUID` (Primary Key)
- `payment_id`: `UUID` (Foreign Key -> `Payment.id`, Cascade Delete)
- `event_type`: `VARCHAR(100)` (Naprikald: `gopay.payment.created`, `stripe.charge.succeeded`)
- `payload`: `JSONB` (Celý vrátený payload pre audit)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

### `Refund` (Vratky a kompenzácie)
- `id`: `UUID` (Primary Key)
- `payment_id`: `UUID` (Foreign Key -> `Payment.id`, Cascade Delete)
- `amount`: `DECIMAL(10,2)` (Not Null)
- `reason`: `TEXT` (Not Null)
- `status`: `VARCHAR(50)` (Naprikald: `PENDING`, `COMPLETED`, `FAILED`)
- `refund_transaction_id`: `VARCHAR(255)` (ID z brány)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

---

## 7. Doručovacie zóny a pravidlá logistiky

### `DeliveryZone` (Polygóny doručovacích území)
- `id`: `UUID` (Primary Key)
- `name`: `VARCHAR(100)` (Not Null, napr. "Hlohovec Mesto", "Šulekovo-Leopoldov", "Zóna Blízke obce")
- `polygon_coordinates`: `JSONB` (Koordináty ohraničujúce zónu goniometricky)
- `postal_codes`: `JSONB` (Nullable list PSČ pre fallback overenia)
- `delivery_price`: `DECIMAL(10,2)` (Cena za doručenie v zóne)
- `min_order_price`: `DECIMAL(10,2)` (Minimálny nákup na dovoz)
- `free_delivery_threshold`: `DECIMAL(10,2)` (Limit pre bezplatnú dopravu, nullable)
- `estimated_delivery_minutes`: `INTEGER` (Základný čas trvania prepravy)
- `is_active`: `BOOLEAN` (Default: TRUE)

### `DeliveryRule` (Logistické a produktové obmedzenia pre prepravu)
- `id`: `UUID` (Primary Key)
- `name`: `VARCHAR(100)` (Not Null, napr. "Vyžaduje aktívne chladenie", "Krehká torta")
- `requires_refrigeration`: `BOOLEAN` (Default: FALSE)
- `is_fragile`: `BOOLEAN` (Default: FALSE)
- `max_transit_minutes`: `INTEGER` (Maximálny limit prepravy, napr. 45 min pri zmrzline)

---

## 8. Kuriéri, Smeny a Sledovanie polohy

### `Courier` (Kuriérsky register)
- `id`: `UUID` (Primary Key, Foreign Key -> `User.id`, Cascade Delete)
- `vehicle_type`: `VARCHAR(50)` (Naprikald: `CAR`, `MOPED`, `E_BIKE`, `FOOT`)
- `is_active`: `BOOLEAN` (Default: TRUE)
- `status`: `VARCHAR(50)` (Naprikald: `OFFLINE`, `AVAILABLE`, `ON_TRIP`, `BREAK`)
- `current_latitude`: `DOUBLE PRECISION` (Súradnica posledného hlásenia)
- `current_longitude`: `DOUBLE PRECISION`
- `last_location_updated_at`: `TIMESTAMP`

### `CourierVehicle` (Vozový park a výbava kuriérov)
- `id`: `UUID` (Primary Key)
- `courier_id`: `UUID` (Foreign Key -> `Courier.id`, Cascade Delete)
- `plate_number`: `VARCHAR(20)` (ŠPZ auta, nullable)
- `has_cooling_box`: `BOOLEAN` (Default: FALSE, dôležité pre mrazené/krémové dezerty)
- `max_payload_volume`: `DOUBLE PRECISION` (Kapacitný faktor vozidla)

### `CourierCapability` (Vlastnosti a certifikáty kurierov)
- `id`: `UUID` (Primary Key)
- `courier_id`: `UUID` (Foreign Key -> `Courier.id`, Cascade Delete)
- `can_transport_fragile`: `BOOLEAN` (Default: TRUE, či smie voziť poschodové torty)
- `can_collect_cash`: `BOOLEAN` (Default: TRUE, či má povolené inkasovať hotovosť)

### `CourierShift` (Evidencia pracovných smien a dochádzky)
- `id`: `UUID` (Primary Key)
- `courier_id`: `UUID` (Foreign Key -> `Courier.id`, Cascade Delete)
- `branch_id`: `UUID` (Foreign Key -> `Branch.id`, domovská pobočka pre smenu)
- `start_time`: `TIMESTAMP` (Začiatok smeny)
- `end_time`: `TIMESTAMP` (Koniec smeny, nullable do odhlásenia)
- `is_completed`: `BOOLEAN` (Default: FALSE)

### `CourierLocation` (História GPS polohy - kľúč k optimálnemu živému sledovaniu)
- `id`: `BIGSERIAL` (Primary Key, pre veľký objem dát)
- `courier_id`: `UUID` (Foreign Key -> `Courier.id`, Cascade Delete)
- `latitude`: `DOUBLE PRECISION` (GPS Šírka)
- `longitude`: `DOUBLE PRECISION` (GPS Dĺžka)
- `speed_kmh`: `DOUBLE PRECISION` (Rýchlosť)
- `recorded_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

### `CourierAssignment` (Evidencia priradených objednávok kuriérom)
- `id`: `UUID` (Primary Key)
- `courier_id`: `UUID` (Foreign Key -> `Courier.id`, Cascade Delete)
- `order_id`: `UUID` (Foreign Key -> `Order.id`, Cascade Delete)
- `status`: `VARCHAR(50)` (Naprikald: `OFFERED`, `ACCEPTED`, `REJECTED`, `COMPLETED`, `FAILED`)
- `assigned_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)
- `responded_at`: `TIMESTAMP` (Timestamp odpovede kuriéra)
- `rejection_reason`: `TEXT` (Ospravedlnenie odmietnutia)

### `DeliveryEvent` (Logistické eventy na ceste u zákazníka)
- `id`: `UUID` (Primary Key)
- `assignment_id`: `UUID` (Foreign Key -> `CourierAssignment.id`, Cascade Delete)
- `event_type`: `VARCHAR(100)` (Naprikald: `ARRIVED_TO_STORE`, `LOADED`, `ARRIVED_TO_CUSTOMER`, `DELIVERED_SUCCESS`, `CUSTOMER_NOT_RESPONSIVE`)
- `proof_signature`: `TEXT` (Zálohový Base64 podpis alebo meno preberajúceho)
- `proof_photo_url`: `VARCHAR(255)` (Nullable, odkaz na fotku pri dverách)
- `proof_pin_verified`: `BOOLEAN` (Default: FALSE, overenie cez jednorazový PIN zákazníka)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

---

## 9. Odmeňovanie, Účtovníctvo a Hotovosť kurierov

### `CourierEarning` (Kompletné zárobky kuriéra za jednotlivé jazdy)
- `id`: `UUID` (Primary Key)
- `courier_id`: `UUID` (Foreign Key -> `Courier.id`, Cascade Delete)
- `order_id`: `UUID` (Foreign Key -> `Order.id`, Cascade Delete)
- `base_fee`: `DECIMAL(10,2)` (Not Null, fix za doručenie zásielky)
- `distance_fee`: `DECIMAL(10,2)` (Pohyblivá zložka podľa kilometrov)
- `waiting_time_fee`: `DECIMAL(10,2)` (Kompenzácia za čakanie nad limit na pobočke/u klienta)
- `bonus_fee`: `DECIMAL(10,2)` (Špička, víkend alebo mimoriadna odmena)
- `penalty_deduction`: `DECIMAL(10,2)` (Deduction za poškodenie tovaru, s audit odkazom)
- `currency`: `VARCHAR(3)` (Default: "EUR")
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

### `CourierBonusRule` (Pravidlá dlhodobých kurierskych odmien)
- `id`: `UUID` (Primary Key)
- `name`: `VARCHAR(150)` (Zrozumiteľný názov, napr. "Víkendový šampión (20+ doručení)")
- `target_deliveries`: `INTEGER` (Cieľový počet úspešných dovozov)
- `bonus_amount`: `DECIMAL(10,2)` (Prémia)
- `start_date`: `TIMESTAMP`
- `end_date`: `TIMESTAMP`

### `CourierBonusProgress` (Postup v bonusových programoch)
- `id`: `UUID` (Primary Key)
- `courier_id`: `UUID` (Foreign Key -> `Courier.id`, Cascade Delete)
- `rule_id`: `UUID` (Foreign Key -> `CourierBonusRule.id`, Cascade Delete)
- `current_deliveries`: `INTEGER` (Default: 0)
- `is_achieved`: `BOOLEAN` (Default: FALSE)
- `achieved_at`: `TIMESTAMP` (Nullable)

### `CashLedger` (Pokladničná kniha kuriéra na hotovosť)
- `id`: `UUID` (Primary Key)
- `courier_id`: `UUID` (Foreign Key -> `Courier.id`, Cascade Delete)
- `shift_id`: `UUID` (Foreign Key -> `CourierShift.id`, Cascade Delete)
- `amount`: `DECIMAL(10,2)` (Suma pohybu hotovosti)
- `type`: `VARCHAR(50)` (Naprikald: `COLLECT`, `SETTLE`, `FLOAT_START`)
- `reference_order_id`: `UUID` (Foreign Key -> `Order.id`, Nullable)
- `notes`: `TEXT` (Podrobnosti)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

### `CashSettlement` (Uzávierka pokladne s dispečerom po smene)
- `id`: `UUID` (Primary Key)
- `courier_id`: `UUID` (Foreign Key -> `Courier.id`, Cascade Delete)
- `shift_id`: `UUID` (Foreign Key -> `CourierShift.id`, Cascade Delete)
- `expected_amount`: `DECIMAL(10,2)` (Suma, ktorú mal kuriér vyzbierať)
- `received_amount`: `DECIMAL(10,2)` (Suma, ktorú odovzdal dispečerovi)
- `discrepancy`: `DECIMAL(10,2)` (Rozdiel: expected - received, auditované)
- `status`: `VARCHAR(50)` (Naprikald: `MATCHED`, `DISCREPANCY_PENDING`, `RESOLVED`)
- `verified_by`: `UUID` (Foreign Key -> `User.id`, overujúci dispečer/admin)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

---

## 10. Vernostný systém a Marketing

### `LoyaltyAccount` (Vernostné účty zákazníkov)
- `id`: `UUID` (Primary Key)
- `user_id`: `UUID` (Foreign Key -> `User.id`, Cascade Delete, Unique)
- `total_earned_points`: `INTEGER` (Celkovo nazbierané body historicky)
- `current_balance`: `INTEGER` (Aktuálny stav, ktorý je možné použiť)
- `tier`: `VARCHAR(50)` (Naprikald: `BRONZE`, `SILVER`, `GOLD`)

### `LoyaltyTransaction` (História pohybov vernostných bodov)
- `id`: `UUID` (Primary Key)
- `loyalty_account_id`: `UUID` (Foreign Key -> `LoyaltyAccount.id`, Cascade Delete)
- `points`: `INTEGER` (Kladné/Záporné zmeny)
- `type`: `VARCHAR(50)` (Naprikald: `EARN_ORDER`, `REDEEM_REWARD`, `BIRTHDAY_BONUS`, `MANUAL_ADJUST`)
- `reference_order_id`: `UUID` (Foreign Key -> `Order.id`, Nullable)
- `description`: `VARCHAR(255)`
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

### `Reward` (Možné odmeny za vernostné body)
- `id`: `UUID` (Primary Key)
- `name_sk`: `VARCHAR(150)` (Not Null, napr. "Makrónka ku káve zadarmo")
- `points_cost`: `INTEGER` (Cena v bodoch)
- `is_active`: `BOOLEAN` (Default: TRUE)

### `PromoCode` (Marketingové zľavové kódy)
- `id`: `UUID` (Primary Key)
- `code`: `VARCHAR(50)` (Unique, Not Null, veľkými písmenami, napr. "HLOHOVEC10")
- `discount_type`: `VARCHAR(50)` (Naprikald: `PERCENTAGE`, `FIXED_AMOUNT`, `FREE_DELIVERY`)
- `value`: `DECIMAL(10,2)` (Výška percenta / eur)
- `min_order_value`: `DECIMAL(10,2)` (Default: 0.00, minimálna hodnota pre uplatnenie)
- `start_date`: `TIMESTAMP` (Dátum začiatku platnosti)
- `end_date`: `TIMESTAMP` (Dátum konca platnosti)
- `max_uses_total`: `INTEGER` (Súhrnný limit použití celkovo)
- `current_uses_total`: `INTEGER` (Default: 0)
- `is_active`: `BOOLEAN` (Default: TRUE)

---

## 11. Torty na mieru a Svadobný catering dopyty

### `CustomCakeInquiry` (Konfigurátor a dopytový formulár na slávnostnú tortu)
- `id`: `UUID` (Primary Key)
- `inquiry_number`: `VARCHAR(50)` (Unique, napr. "TORTA-2026-001")
- `user_id`: `UUID` (Foreign Key -> `User.id`, pre registrovaných klientov)
- `guest_name`: `VARCHAR(150)` (Meno neregistrovaného)
- `guest_phone`: `VARCHAR(50)`
- `guest_email`: `VARCHAR(255)`
- `occasion`: `VARCHAR(100)` (Naprikald: `WEDDING`, `BIRTHDAY`, `BAPTISM`, `CELEBRATION`)
- `event_date`: `DATE` (Dátum oslavy, systém overuje minimálny predstih)
- `serving_count`: `INTEGER` (Požadovaný počet porcií / ľudí)
- `cake_shape`: `VARCHAR(50)` (Tvar: `ROUND`, `SQUARE`, `HEART`, `MULTI_TIER`)
- `flavor_profile`: `TEXT` (Požadovaná príchuť a korpus)
- `allergies_sk`: `TEXT` (Alergie a obmedzenia)
- `visual_description`: `TEXT` (Detaily o dizajne, nápisy, farby)
- `budget_range`: `VARCHAR(100)` (Orientačný rozpočet)
- `delivery_type`: `VARCHAR(50)` (Rozvoz alebo osobný odber)
- `status`: `VARCHAR(50)` (Default: `NEW`, prechádza stavovým automatom dopytu)
- `manager_notes`: `TEXT` (Interné poznámky predajcu)
- `price_offer`: `DECIMAL(10,2)` (Navrhnutá finálna cena torte na mieru)
- `converted_order_id`: `UUID` (Foreign Key -> `Order.id`, ak bol dopyt schválený a premenený na ostrú objednávku)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

### `CustomCakeImage` (Inspiračné obrázky k torte nahrané klientom)
- `id`: `UUID` (Primary Key)
- `inquiry_id`: `UUID` (Foreign Key -> `CustomCakeInquiry.id`, Cascade Delete)
- `image_url`: `VARCHAR(255)` (Signed URL pre bezpečný prístup)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

### `CateringInquiry` (Dopyty na kompletné svadby a firemné udalosti)
- `id`: `UUID` (Primary Key)
- `user_id`: `UUID` (Foreign Key -> `User.id`, Nullable)
- `customer_name`: `VARCHAR(150)` (Meno kontaktnej osoby)
- `customer_email`: `VARCHAR(255)` (Not Null)
- `customer_phone`: `VARCHAR(50)` (Not Null)
- `event_type`: `VARCHAR(100)` (Naprikald: `WEDDING`, `CORPORATE`, `FAMILY_PARTY`)
- `event_date`: `DATE` (Dátum)
- `event_location`: `VARCHAR(255)` (Adresa udalosti)
- `guest_count`: `INTEGER` (Predpokladaný počet hostí)
- `required_assortment_sk`: `TEXT` (Aké zákusky chcú: drobné, dezerty, poháre, slané...)
- `services_required_json`: `JSONB` (Doplnkové služby, napr. `[ "CANDY_BAR_INSTALLATION", "DECORATION", "TASTING" ]`)
- `budget_limit`: `DECIMAL(10,2)` (Limit budgetu)
- `status`: `VARCHAR(50)` (Naprikald: `NEW`, `REVIEW`, `OFFER_SENT`, `REJECTED`, `CONFIRMED_PRODUCTION`, `COMPLETED`)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

---

## 12. Notifikácie, Spätná väzba, Audit a Nastavenia

### `Notification` (Multikanálové notifikácie)
- `id`: `UUID` (Primary Key)
- `user_id`: `UUID` (Foreign Key -> `User.id`, null ak je pre anonymného zákazníka)
- `channel`: `VARCHAR(50)` (Naprikald: `EMAIL`, `IN_APP`, `REALTIME`)
- `title`: `VARCHAR(255)` (Not Null)
- `body`: `TEXT` (Not Null)
- `is_read`: `BOOLEAN` (Default: FALSE)
- `read_at`: `TIMESTAMP` (Nullable)
- `scheduled_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)
- `sent_at`: `TIMESTAMP` (Nullable)

### `Review` (Produktové a doručovacie hodnotenia)
- `id`: `UUID` (Primary Key)
- `order_id`: `UUID` (Foreign Key -> `Order.id`, Cascade Delete, Unique)
- `product_id`: `UUID` (Foreign Key -> `Product.id`, Cascade Delete, Nullable pre hodnotenie doručenia)
- `rating`: `INTEGER` (Not Null, hodnota 1 až 5)
- `comment`: `TEXT` (Nullable)
- `is_approved`: `BOOLEAN` (Default: FALSE, ochrana pred spamom/botmi)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

### `Consent` (Právne súhlasy a GDPR tracking)
- `id`: `UUID` (Primary Key)
- `user_id`: `UUID` (Foreign Key -> `User.id`, Nullable pre hostí)
- `session_id`: `VARCHAR(255)` (ID cookies relácie pre hostí)
- `consent_type`: `VARCHAR(100)` (Naprikald: `GG_ANALYTICS`, `MARKETING_EMAIL`, `TERMS_AND_CONDITIONS`)
- `is_granted`: `BOOLEAN` (Not Null)
- `ip_address`: `VARCHAR(50)` (Maskovaná IP na splnenie ochrany)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

### `SiteContent` (Dynamický obsah webu)
- `id`: `UUID` (Primary Key)
- `content_key`: `VARCHAR(150)` (Unique, Not Null, napr. "homepage.hero.title")
- `content_value_sk`: `TEXT` (Not Null, textový alebo JSON obsah v slovenčine)
- `updated_by`: `UUID` (Foreign Key -> `User.id`)
- `updated_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

### `UploadedFile` (Záznam fyzicky nahraných obrázkov a súborov z PC)
- `id`: `UUID` (Primary Key)
- `file_name`: `VARCHAR(255)` (Not Null)
- `mime_type`: `VARCHAR(100)` (Not Null)
- `file_size_bytes`: `INTEGER` (Not Null)
- `storage_path`: `VARCHAR(255)` (Cesta k fyzickému súboru v Storage)
- `uploaded_by`: `UUID` (Foreign Key -> `User.id`, Nullable)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)

### `AuditLog` (Zoznam kritických zmien v administrácii - bezpečnosť)
- `id`: `UUID` (Primary Key)
- `user_id`: `UUID` (Foreign Key -> `User.id`, Nullable pre anonymné pády)
- `action_type`: `VARCHAR(100)` (Not Null, napr. `PRODUCT_PRICE_UPDATED`, `COURIER_ASSIGNED_MANUAL`, `ORDER_CANCELLED`)
- `table_name`: `VARCHAR(100)` (Názov dotknutej tabuľky)
- `record_id`: `VARCHAR(100)` (Dotknutý Primary Key)
- `old_values`: `JSONB` (Nullable snapshot pred zmenou)
- `new_values`: `JSONB` (Nullable snapshot po zmene)
- `ip_address`: `VARCHAR(50)` (Maskovaná IP adresa)
- `created_at`: `TIMESTAMP` (Default: CURRENT_TIMESTAMP)
