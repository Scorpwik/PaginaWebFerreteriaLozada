-- Rompe la recursion infinita: is_admin() corre como definer (dueno de la tabla),
-- por lo que la lectura de admins no vuelve a evaluar las politicas de admins.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Politicas viejas (duplicadas y recursivas)
drop policy if exists admins_read_admins on public.admins;

drop policy if exists admins_all_categories on public.categories;
drop policy if exists admins_full_categories on public.categories;
drop policy if exists public_read_categories on public.categories;

drop policy if exists admins_all_products on public.products;
drop policy if exists admins_full_products on public.products;
drop policy if exists public_read_products on public.products;

drop policy if exists admins_all_variants on public.product_variants;
drop policy if exists admins_full_variants on public.product_variants;
drop policy if exists public_read_variants on public.product_variants;

drop policy if exists admins_all_images on public.product_images;
drop policy if exists admins_full_images on public.product_images;
drop policy if exists public_read_images on public.product_images;

drop policy if exists admins_all_settings on public.site_settings;
drop policy if exists admins_full_settings on public.site_settings;

drop policy if exists admins_read_orders on public.orders;
drop policy if exists admins_delete_orders on public.orders;
drop policy if exists admins_read_order_items on public.order_items;

-- Lectura publica del catalogo
create policy catalog_public_read_categories on public.categories
  for select to anon, authenticated using (true);
create policy catalog_public_read_products on public.products
  for select to anon, authenticated using (true);
create policy catalog_public_read_variants on public.product_variants
  for select to anon, authenticated using (true);
create policy catalog_public_read_images on public.product_images
  for select to anon, authenticated using (true);
create policy settings_public_read on public.site_settings
  for select to anon, authenticated using (true);

-- Escritura solo admins, una sola politica por tabla
create policy categories_admin_write on public.categories
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy products_admin_write on public.products
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy variants_admin_write on public.product_variants
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy images_admin_write on public.product_images
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy settings_admin_write on public.site_settings
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- admins: cada admin puede ver la lista, nadie la modifica por API
create policy admins_self_read on public.admins
  for select to authenticated using ((select public.is_admin()));

-- Cotizaciones: admins leen y borran; el insert publico se mantiene
-- temporalmente y se revoca en la fase de la Edge Function.
create policy orders_admin_read on public.orders
  for select to authenticated using ((select public.is_admin()));
create policy orders_admin_delete on public.orders
  for delete to authenticated using ((select public.is_admin()));
create policy order_items_admin_read on public.order_items
  for select to authenticated using ((select public.is_admin()));
