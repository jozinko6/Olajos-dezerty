# Audit projektu & Architektonický plán (Etapa 1)
**Olajos dezerty Hlohovec**

Tento dokument predstavuje kompletný audit projektu a architektonický plán pre vývoj prémiového objednávkového a doručovacieho systému pre cukráreň **Olajos dezerty Hlohovec**. Sleduje prísne priemyselné štandardy pre návrh bezpečných full-stack aplikácií.

---

## 1. Analýza aktuálneho stavu repozitára

Aktuálna štruktúra repozitára obsahuje čistý, moderný React 19 + Vite 6 projekt so zabudovanou podporou pre Tailwind CSS.

### Súborový strom:
- `/package.json`: Definuje závislosti ako React 19, Express 4, Tailwind CSS v4, Lucide React a Motion (na animácie).
- `/index.html`: Hlavný vstupný bod bez zásahu, zatiaľ prázdny.
- `/metadata.json`: Aktualizovaný s názvom "Olajos dezerty Hlohovec" a povolením pre geolokáciu (`geolocation`).
- `/tsconfig.json`: Nakonfigurovaný pre moderný TypeScript s bundler resolution a aliasmi `@/*`.
- `/vite.config.ts`: Obsahuje podporu pre Tailwind CSS a React, s vypnutým HMR na zamedzenie blikania počas vývoja.
- `/src/App.tsx` & `/src/main.tsx` & `/src/index.css`: Východiskové súbory pre klientsku aplikáciu.
- `/.env.example`: Obsahuje `GEMINI_API_KEY` a `APP_URL`.

### Závery z prieskumu:
- Aplikácia je pripravená na prechod na **full-stack architektúru** (`Express.js` + `Vite` ako middleware). Vzhľadom na to, že potrebujeme bezpečne spravovať stav objednávok, platieb, databázu a kurierov, klientsky kód nesmie priamo pristupovať k citlivým API kľúčom alebo databáze.
- Všetka biznis logika (napr. priraďovanie kurierov, zmeny stavov platieb, audit logs) bude bežať na serveri (`server.ts`).

---

## 2. Navrhovaný technologický stack pre AI Studio

Pre zaistenie maximálnej stability a plnej funkčnosti v prostredí AI Studio (s jedným verejným portom 3000) navrhujeme nasledovný stack:

1. **Frontend**: React 19 s Tailwind CSS (v4), animácie pomocou `motion/react`, ikony z `lucide-react`.
2. **Backend**: Express.js integrovaný s Vite v dev režime (cez `vite.middlewares`). V produkcii bude Express servovať skompilovaný frontend z priečinka `dist`.
3. **Databáza**: SQLite (alebo PostgreSQL v závislosti od finálnej konfigurácie) cez odľahčený databázový adaptér, ktorý umožňuje ukladať dáta lokálne do súboru v rámci kontajnera pre spoľahlivú perzistenciu bez výpadkov počas preview. Navrhneme detailný SQL/relacionálny dátový model umožňujúci plnú migráciu.
4. **AI integrácia**: `@google/genai` (SDK verzia `^2.4.0`) spustená bezpečne na serveri s využitím `GEMINI_API_KEY` pre inteligentné funkcie (pomoc s tortami na mieru, analýza dopytov).
5. **Platby (Abstrakcia)**: Simulovaná brána s webhookom a podpisom pre plnú zhodu s reálnymi kartovými operáciami, pripravená na Stripe/GoPay.

---

## 3. Matica používateľských rolí (Role Mapping)

Aplikácia rozlišuje nasledujúce roly s presným prístupom:

| Rola | Popis | Hlavné oprávnenia |
|---|---|---|
| `GUEST` / `CUSTOMER` | Neregistrovaný / Registrovaný zákazník | Prezeranie ponuky, košík, zadávanie objednávok, sledovanie doručenia (tracking token), vernostné body, dopyt na torty. |
| `ADMIN` | Vlastník / Hlavný manažér | Úplný prístup ku všetkým nastaveniam, produktom, cenám, audit logom, zónam a správcom. |
| `STORE_MANAGER` | Vedúci prevádzky (pobočky) | Správa otváracích hodín, okamžitej skladovej dostupnosti, kontrola objednávok a priradenia kuriérov na danej pobočke. |
| `PRODUCTION` | Výrobňa / Cukrár | Prezeranie schválených objednávok a ich zoskupených položiek podľa typov, správa výrobného plánu, označovanie pripravenosti. |
| `PACKING` | Balič | Kontrola balenia, overovanie darčekových balení, tlač checklistov a balenie chladených/krehkých položiek. |
| `DISPATCHER`| Dispečer rozvozu | Správa kurierov, manuálne/automatické priraďovanie objednávok, monitorovanie trás a riešenie problémov pri doručení. |
| `COURIER` | Kuriér (vlastný rozvoz) | Mobile-first dashboard: online/offline stav, prijímanie objednávok, navigácia, správa inkasovanej hotovosti, uzávierky. |

---

## 4. Stavový automat objednávok (Order Lifecycle)

Každá objednávka prechádza pevným, auditovaným stavovým automatom. Zmeny stavov sa zapisujú do `OrderStatusHistory`.

```
                    [ CART ] (Nákupný košík)
                       |
                       v
             [ AWAITING_PAYMENT ] (Čaká na platbu - ak bola zvolená karta)
             /                \
     (Zlyhanie platby)    (Webhook: Úspešná platba)
           /                    \
  [ PAYMENT_FAILED ]         [ PAID ]
           |                    |
           v                    v
  [ CANCELLED ] <----------- [ NEW ] (Nová objednávka - pripravená na akceptáciu prevádzkou)
                                |
                                v
                          [ CONFIRMED ] (Potvrdená manažérom)
                                |
                                v
                         [ IN_PRODUCTION ] (Vo výrobe - cukrár)
                                |
                                v
                       [ READY_FOR_PACKING ] (Vyrobené, čaká na zabalenie)
                                |
                                v
                          [ PACKING ] (Zabalenie so štítkami a darčekovým checklistom)
                                |
                                v
                     +----------+----------+
                     |                     | (Osobný odber)
                     | (Rozvoz)            v
                     |            [ READY_FOR_PICKUP ] (Pripravené na prevádzku)
                     v                     |
          [ COURIER_ASSIGNMENT ]           | (Prevzaté zákazníkom)
                     |                     v
        +------------+------------+   [ COMPLETED ] (Dokončené)
        | (Automat)  | (Manuálne) |
        v            v            v
  [ COURIER_ASSIGNED ] <----------+ (Priradený kuriér)
        |
        v
  [ COURIER_TO_STORE ] (Kuriér na ceste do prevádzky)
        |
        v
  [ PICKED_UP ] / [ OUT_FOR_DELIVERY ] (Vyzdvihnuté kuriérom / Na ceste k zákazníkovi)
        |
        v
  [ ARRIVING ] (Kuriér je v tesnej blízkosti - do 2 minút / 500m)
        |
        v
  [ DELIVERED ] (Doručené zákazníkovi a overené podpisom/PIN/fotkou)
        |
        v
  [ COMPLETED ] (Uzatvorená objednávka, pripísané vernostné body)
```

### Ostatné mimoriadne stavy:
- `DELIVERY_PROBLEM`: Nastane, ak zákazník nedvíha alebo je nesprávna adresa. Kuriér zadá problém, dispečer rozhodne o doručení alebo vrátení.
- `REFUNDED`: Použité po stornovaní a vrátení peňazí cez platobnú bránu.

---

## 5. Algoritmus priraďovania kuriérov (Courier Dispatch Model)

Priraďovanie kuriérov môže prebiehať buď **manuálne** dispečerom, alebo pomocou **automatického bodovacieho algoritmu**.

### Automatický bodovací model (Courier Score Formula):
Pre každého aktívneho kuriéra, ktorý je v stave `AVAILABLE` (online a pripravený), vypočítame **skóre vhodnosti** ($S$) pre danú objednávku:

$$S = w_d \cdot (1 - \frac{d}{d_{max}}) + w_v \cdot C_v + w_a \cdot (1 - \frac{A}{A_{max}}) + B_{box}$$

Kde:
- $d$: Vzdialenosť kuriéra od prevádzky (vyzdvihnutia). Chceme minimalizovať vzdialenosť.
- $C_v$: Kompatibilita vozidla. Ak objednávka vyžaduje nadrozmerné balenie (napr. poschodová torta) a kuriér má auto, $C_v = 1$, ak má bicykel/motorku, $C_v = 0$.
- $A$: Počet aktuálne pridelených alebo rozvážaných objednávok kuriérom. Preferujeme menej vyťažených kuriérov na zlúčenie trás.
- $B_{box}$: Chladiaci box bonus. Ak objednávka obsahuje krémy/zmrzlinu a kuriér disponuje aktívnym chladením, priradí sa bonus $+50$ bodov.

Dispečer vidí dôvody výberu kuriéra a má právo rozhodnutie prepísať.

---

## 6. Súlad s GDPR, ochrana osobných údajov a bezpečnosť

- **Minimalizácia údajov**: Meno, adresa doručenia a telefónne číslo sú viditeľné kuriérovi iba počas doručovania objednávky. Po dokončení objednávky sú tieto údaje v kuriérskom rozhraní maskované (napr. *Ján M.*, *0901 *** *** *).
- **Zdieľanie polohy**: Súradnice kuriéra (`CourierLocation`) sa prenášajú zákazníkovi len ak je objednávka v stave `OUT_FOR_DELIVERY` alebo `ARRIVING`. Hneď po prechode do stavu `DELIVERED` sa vysielanie polohy pre danú objednávku okamžite zablokuje.
- **Bezpečnosť platieb**: Čísla kreditných kariet sa neukladajú ani nespracúvajú na našom serveri. Systém využíva výhradne tokenizáciu cez API platobnej brány a zabezpečené webhooky chránené podpisom (Signature verification).
- **Signed URLs**: Všetky používateľské súbory (napr. inšpiračné obrázky k tortám na mieru) nahrané kuriérom alebo zákazníkom sú uložené v zabezpečenom úložisku dostupnom len cez časovo obmedzené autorizované odkazy.

---

## 7. Plán overovania (Verification & Test Cases)

Pre splnenie kritérií úspešnosti etáp sme pripravili robustný zoznam overovacích scenárov:

1. **Test nákupného procesu s nulovým skladom**: Overenie, že vypredaný produkt s nulovým stavom v databáze zablokuje pridanie do košíka a znemožní prechod checkoutom.
2. **Test prepočtu poplatkov za dopravné zóny**: Zákazník s adresou v Šulekove dostane vypočítanú presnú prirážku pre danú zónu a systém skontroluje, či objednávka spĺňa minimálnu výšku.
3. **Test odmeňovania a Cash Ledgeru** pre hotovosť: Kuriér po prevzatí hotovosti uzatvorí objednávku, systém mu pripíše základnú sadzbu a zapíše sumu do denného Cash Ledgeru. Počas dennej uzávierky musí suma v cash ledgeri presne súhlasiť s očakávanou hotovosťou.
4. **Test ochrany súkromia (Tracking maskovanie)**: Overenie správania API, kedy anonymný prístup bez tracking tokenu vráti chybu 403 a ukončené sledovanie už nevydáva GPS súradnice.

---

V Etape 1 sme úspešne vykonali audit repozitára a vytvorili pevný architektonický základ. V ďalšom dokumente `DATABASE_DESIGN.md` špecifikujeme kompletný relačný model zodpovedajúci všetkým požiadavkám.
