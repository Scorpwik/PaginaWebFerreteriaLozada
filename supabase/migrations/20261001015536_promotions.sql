-- Combos y promociones temporales. Independiente del catalogo: sin stock,
-- sin variantes y sin carrito. La vigencia se filtra en la consulta (Quito).

create table if not exists public.promotions (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  price_label   text,
  image_url     text not null,
  start_date    date not null default (timezone('America/Guayaquil', now()))::date,
  end_date      date not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint promotions_dates_ok check (end_date >= start_date),
  constraint promotions_image_url_len check (char_length(image_url) between 8 and 600),
  constraint promotions_title_not_blank check (char_length(btrim(title)) >= 2)
);

create index if not exists idx_promotions_dates on public.promotions (start_date, end_date);

drop trigger if exists promotions_touch_updated_at on public.promotions;
create trigger promotions_touch_updated_at
  before update on public.promotions
  for each row execute function public.touch_updated_at();

alter table public.promotions enable row level security;

drop policy if exists promotions_public_read on public.promotions;
create policy promotions_public_read on public.promotions
  for select to anon, authenticated using (true);

drop policy if exists promotions_admin_write on public.promotions;
create policy promotions_admin_write on public.promotions
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select on table public.promotions to anon, authenticated;
grant insert, update, delete on table public.promotions to authenticated;
grant all on table public.promotions to service_role;
