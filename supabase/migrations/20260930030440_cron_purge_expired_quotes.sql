create extension if not exists pg_cron;

-- Borrado real de cotizaciones vencidas. order_items cae por ON DELETE CASCADE
-- y los PDF del bucket privado se limpian en el mismo job.
create or replace function public.purge_expired_quotes()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from storage.objects
  where bucket_id = 'quotes'
    and created_at < now() - interval '15 days';

  delete from public.orders
  where valid_until < current_date;
end;
$$;

revoke all on function public.purge_expired_quotes() from public, anon, authenticated;

select cron.unschedule('purge-expired-quotes')
where exists (select 1 from cron.job where jobname = 'purge-expired-quotes');

select cron.schedule(
  'purge-expired-quotes',
  '15 7 * * *',
  $$select public.purge_expired_quotes();$$
);
