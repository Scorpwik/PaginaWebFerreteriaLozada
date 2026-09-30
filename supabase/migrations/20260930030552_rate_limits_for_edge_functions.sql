create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;
-- Sin politicas a proposito: solo la service role (que salta RLS) la toca.

revoke all on table public.rate_limits from anon, authenticated;

-- Ventana fija: devuelve false cuando se pasa del limite.
create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer default 5,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_key is null or length(p_key) = 0 then
    return false;
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start)
    do update set count = rl.count + 1
  returning rl.count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;

-- La limpieza vive en el job diario, no en cada llamada.
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

  delete from public.rate_limits
  where window_start < now() - interval '1 day';
end;
$$;

revoke all on function public.purge_expired_quotes() from public, anon, authenticated;
