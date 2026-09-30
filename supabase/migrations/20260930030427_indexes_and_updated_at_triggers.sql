-- FKs sin indice detectadas por el advisor de rendimiento
create index if not exists idx_product_images_product on public.product_images (product_id);
create index if not exists idx_product_images_variant on public.product_images (variant_id);
create index if not exists idx_order_items_variant on public.order_items (variant_id);

-- Soporte para las secciones del Home y el orden del catalogo
create index if not exists idx_products_is_offer on public.products (is_offer) where is_offer;
create index if not exists idx_products_is_bestseller on public.products (is_bestseller) where is_bestseller;
create index if not exists idx_categories_sort on public.categories (parent_id, sort_order, name);
create index if not exists idx_variants_availability on public.product_variants (availability);
create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_valid_until on public.orders (valid_until);

-- Busqueda por medida: el catalogo permite buscar "4x1" o "1/2"
create index if not exists idx_variants_size_trgm on public.product_variants using gin (size gin_trgm_ops);

-- updated_at no se actualizaba porque no habia ningun trigger
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists variants_touch_updated_at on public.product_variants;
create trigger variants_touch_updated_at
  before update on public.product_variants
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch_updated_at on public.site_settings;
create trigger settings_touch_updated_at
  before update on public.site_settings
  for each row execute function public.touch_updated_at();
