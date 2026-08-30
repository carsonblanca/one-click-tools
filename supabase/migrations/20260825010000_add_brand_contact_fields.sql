alter table public.filament_brands
  add column if not exists origin text,
  add column if not exists contact_info text,
  add column if not exists official_store_url text,
  add column if not exists official_store_name text;
