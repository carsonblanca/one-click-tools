create table if not exists public.filament_brands (
  brand_id text primary key,
  slug text not null unique,
  name text not null,
  name_zh text not null,
  name_en text not null,
  name_zh_tw text,
  aliases text[] not null default '{}',
  logo_url text,
  website_url text,
  description text,
  seo_title text,
  seo_description text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists filament_brands_status_sort_idx
  on public.filament_brands (status, sort_order);
