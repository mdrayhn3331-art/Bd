# FFT SHOP — real Supabase web

This version uses the connected Supabase project already configured in `app.js` and `auth.js`.

## 1. Make the database real
Open Supabase Dashboard → SQL Editor → paste and run `supabase_schema.sql` once.

It creates the user profile/wallet, products, orders, deposits, withdrawals, transactions and the secure `place_order()` RPC.

## 2. Auth
Enable Phone provider in Supabase Authentication. For production SMS OTP, configure an SMS provider in Supabase. The site accepts Bangladesh numbers such as `01XXXXXXXXX` and normalizes them to `+880...`.

## 3. Images
Partner logos are loaded remotely through Google's favicon/image service. Product images are remote URLs; the app does not depend on local product image files. Google Images search URLs are used only as fallbacks/search links where a stable direct image URL is not available. For production, put stable CDN/Supabase Storage image URLs in the `products.image_url` column.

## 4. Real order flow
A logged-in user can order an active product. The database RPC checks stock and wallet balance, deducts the price, decreases stock, creates the order and records the wallet transaction atomically.

Never put a Supabase service-role/secret key in this frontend. Only the publishable/anon key belongs in browser code.
