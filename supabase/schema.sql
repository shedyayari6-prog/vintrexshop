-- ============================================================
-- VintrexShop database schema
-- Run this whole file in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- STORES ----------
create table if not exists public.stores (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  tagline       text default '',
  logo_url      text,
  banner_url    text,
  primary_color text not null default '#0F4C5C',
  accent_color  text not null default '#F2A33A',
  font          text not null default 'Bricolage Grotesque',
  columns       int  not null default 3 check (columns in (2,3,4)),
  hero_style    text not null default 'banner' check (hero_style in ('banner','minimal')),
  show_categories boolean not null default true,
  phone         text default '',
  published     boolean not null default false,
  created_at    timestamptz not null default now()
);
create unique index if not exists stores_one_per_owner on public.stores(owner_id);

-- ---------- PRODUCTS ----------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  name        text not null,
  description text default '',
  price       numeric(10,3) not null check (price >= 0),
  image_url   text,
  category    text default '',
  stock       int not null default 0 check (stock >= 0),
  available   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists products_store_idx on public.products(store_id);

-- ---------- ORDERS ----------
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  customer_name text not null,
  phone         text not null,
  address       text not null,
  city          text not null,
  note          text default '',
  total         numeric(10,3) not null,
  payment       text not null default 'cash_on_delivery',
  status        text not null default 'new'
                check (status in ('new','confirmed','shipped','delivered','cancelled')),
  created_at    timestamptz not null default now()
);
create index if not exists orders_store_idx on public.orders(store_id, created_at desc);

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name       text not null,
  price      numeric(10,3) not null,
  quantity   int not null check (quantity > 0)
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- ---------- ROW LEVEL SECURITY ----------
alter table public.stores      enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- stores: anyone sees published stores; owners manage their own
create policy "public reads published stores" on public.stores
  for select using (published = true);
create policy "owner reads own store" on public.stores
  for select using (auth.uid() = owner_id);
create policy "owner creates store" on public.stores
  for insert with check (auth.uid() = owner_id);
create policy "owner updates store" on public.stores
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owner deletes store" on public.stores
  for delete using (auth.uid() = owner_id);

-- products: public sees available products of published stores; owners manage theirs
create policy "public reads products" on public.products
  for select using (
    available = true and exists (
      select 1 from public.stores s where s.id = store_id and s.published = true)
  );
create policy "owner reads products" on public.products
  for select using (exists (
    select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy "owner inserts products" on public.products
  for insert with check (exists (
    select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy "owner updates products" on public.products
  for update using (exists (
    select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy "owner deletes products" on public.products
  for delete using (exists (
    select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

-- orders: ONLY the store owner can read/update. Customers place orders via place_order() below.
create policy "owner reads orders" on public.orders
  for select using (exists (
    select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy "owner updates orders" on public.orders
  for update using (exists (
    select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy "owner reads order items" on public.order_items
  for select using (exists (
    select 1 from public.orders o join public.stores s on s.id = o.store_id
    where o.id = order_id and s.owner_id = auth.uid()));

-- ---------- PLACE ORDER (secure checkout) ----------
-- Prices and stock are read from the database, never trusted from the browser.
create or replace function public.place_order(
  p_store_id uuid,
  p_name     text,
  p_phone    text,
  p_address  text,
  p_city     text,
  p_note     text,
  p_items    jsonb   -- [{ "product_id": "...", "quantity": 2 }, ...]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_total    numeric(10,3) := 0;
  v_item     jsonb;
  v_prod     public.products%rowtype;
  v_qty      int;
begin
  if not exists (select 1 from stores where id = p_store_id and published = true) then
    raise exception 'Store not found';
  end if;
  if coalesce(trim(p_name),'') = '' or coalesce(trim(p_phone),'') = ''
     or coalesce(trim(p_address),'') = '' or coalesce(trim(p_city),'') = '' then
    raise exception 'Missing delivery details';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  insert into orders (store_id, customer_name, phone, address, city, note, total)
  values (p_store_id, trim(p_name), trim(p_phone), trim(p_address), trim(p_city), coalesce(p_note,''), 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception 'Invalid quantity';
    end if;

    select * into v_prod from products
      where id = (v_item->>'product_id')::uuid
        and store_id = p_store_id and available = true
      for update;

    if not found then raise exception 'Product unavailable'; end if;
    if v_prod.stock < v_qty then
      raise exception 'Not enough stock for %', v_prod.name;
    end if;

    update products set stock = stock - v_qty where id = v_prod.id;
    insert into order_items (order_id, product_id, name, price, quantity)
      values (v_order_id, v_prod.id, v_prod.name, v_prod.price, v_qty);
    v_total := v_total + v_prod.price * v_qty;
  end loop;

  update orders set total = v_total where id = v_order_id;
  return v_order_id;
end;
$$;

revoke all on function public.place_order(uuid,text,text,text,text,text,jsonb) from public;
grant execute on function public.place_order(uuid,text,text,text,text,text,jsonb) to anon, authenticated;

-- ---------- STORAGE (logos, banners, product images) ----------
insert into storage.buckets (id, name, public)
values ('store-assets', 'store-assets', true)
on conflict (id) do nothing;

create policy "anyone reads store assets" on storage.objects
  for select using (bucket_id = 'store-assets');
create policy "owners upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'store-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners update own files" on storage.objects
  for update to authenticated
  using (bucket_id = 'store-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners delete own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'store-assets' and (storage.foldername(name))[1] = auth.uid()::text);
