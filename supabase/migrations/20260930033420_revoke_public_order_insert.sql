-- Con la Edge Function create-quote en produccion, el navegador ya no necesita
-- insertar. Estas politicas permitian a cualquiera crear cotizaciones con el
-- total que quisiera.
drop policy if exists public_insert_orders on public.orders;
drop policy if exists public_insert_order_items on public.order_items;

revoke insert on table public.orders from anon, authenticated;
revoke insert on table public.order_items from anon, authenticated;
revoke usage, select on sequence public.quote_number_seq from anon, authenticated;
