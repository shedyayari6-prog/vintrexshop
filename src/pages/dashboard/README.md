# VintrexShop

Multi-store e-commerce platform (React + Vite + Supabase). Every seller gets a public store at `/store/<slug>`.

## 1. Install and run

```bash
cd ~/vintrexshop
npm install
cp .env.example .env     # then fill in your Supabase values
npm run dev
```

## 2. Set up Supabase

1. Create a project at https://supabase.com.
2. **SQL Editor > New query**: paste all of `supabase/schema.sql` and click **Run**.
   This creates the tables, security rules (RLS), the secure `place_order` checkout function, and the `store-assets` image bucket.
3. **Project Settings > API**: copy the Project URL and the publishable (anon) key into `.env`.
4. For quick testing, turn off **Authentication > Providers > Email > Confirm email**. Turn it back on before launch.

## 3. Try it

1. Open http://localhost:5173/signup and create an account.
2. Name your store (for example `Urban Wear`).
3. **Products**: add a few items with photos.
4. **Customize**: set colors, logo, banner, then tick **Store is public** and save.
5. Visit `/store/urban-wear`, add to cart, and place a cash-on-delivery order.
6. The order appears under **Orders** in the dashboard.

## ABM Delivery (courier partner)

Store owners can hand an order to ABM Delivery from **Dashboard > Orders**. All parcels go through one Vintrex ABM account; the sender on each parcel is the store's own pickup details (**Settings > Delivery pickup**).

Setup (once):

1. SQL Editor: run `supabase/migration-003-abm.sql`.
2. Set the secrets and deploy the function:
   ```bash
   npx supabase secrets set ABM_USERNAME=... ABM_PASSWORD=... ABM_ENV=test
   npx supabase functions deploy abm-delivery
   ```
   `ABM_ENV=test` uses ABM's test server; switch to `prod` when you go live. Optional: `ABM_MR_CODE` (cash-on-delivery payment code from ABM's `mr_list`).
3. Test one order end to end on the test server before switching to `prod`.

The ABM credentials live only in Supabase secrets, never in the browser.

## Deploy on Vercel

Push to GitHub, import the repo in Vercel, and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables. `vercel.json` already handles the store URLs.

## Project structure

```
supabase/schema.sql          database, RLS policies, place_order(), storage rules
src/lib/                     supabase client, auth context, helpers
src/components/StoreView.jsx shared by the public store and the customizer preview
src/pages/dashboard/         products, orders, customize
src/pages/store/             public storefront, product page, cart + checkout
```

## Security notes

- Only the publishable key goes in the frontend. Never use the service-role key here.
- Customers cannot read orders. They create them through `place_order()`, which takes prices and stock from the database, not from the browser.
- Sellers can only touch rows belonging to their own store (RLS).

## Next steps

Online payments (Flouci / Konnect / Stripe), custom domains, a customer order-tracking page, and email or WhatsApp notifications for new orders.
