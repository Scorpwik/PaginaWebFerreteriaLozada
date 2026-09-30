-- product-images: lectura publica, escritura solo admins, limite 5MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- quotes: privado, lo escribe solo la Edge Function con service role
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quotes', 'quotes', false, 2097152, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists product_images_admin_write on storage.objects;
create policy product_images_admin_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

-- Los admins necesitan poder firmar URLs de los PDF en el historial
drop policy if exists quotes_admin_read on storage.objects;
create policy quotes_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'quotes' and (select public.is_admin()));
