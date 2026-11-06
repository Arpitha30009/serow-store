-- SEROW initial database schema. Review and run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create type public.product_category as enum ('Men','Women');
create type public.order_status as enum ('pending','paid','processing','shipped','delivered','cancelled','refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  category public.product_category not null,
  product_type text not null,
  price_paise integer not null check (price_paise >= 0),
  compare_at_price_paise integer check (compare_at_price_paise is null or compare_at_price_paise >= price_paise),
  images text[] not null default '{}',
  colors text[] not null default '{}',
  sizes text[] not null default '{}',
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  customer_name text not null,
  phone text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  subtotal_paise integer not null check (subtotal_paise >= 0),
  shipping_paise integer not null default 0 check (shipping_paise >= 0),
  total_paise integer not null check (total_paise >= 0),
  status public.order_status not null default 'pending',
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price_paise integer not null check (unit_price_paise >= 0),
  size text not null,
  color text,
  quantity integer not null check (quantity > 0)
);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.admin_users enable row level security;

-- Public can only read active products. Product writes should be server-side and admin-checked.
create policy "Anyone can view active products" on public.products for select to anon, authenticated using (is_active = true);
create policy "Customers can read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Customers can update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Customers can read own orders" on public.orders for select to authenticated using (auth.uid() = user_id);
create policy "Customers can read own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
-- Intentionally no browser-side INSERT/UPDATE policies for orders, order_items, or admin_users.
-- Create admin membership manually after a trusted user signs up:
-- insert into public.admin_users (user_id) values ('AUTH_USER_UUID');
