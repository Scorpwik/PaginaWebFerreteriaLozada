-- numeric(10,2) redondeaba los precios unitarios bajos: un tornillo de 0.013
-- se guardaba como 0.01 y uno de 0.004 como 0.00. El Excel del sistema de
-- facturacion trae estos precios, asi que la columna necesita 4 decimales.
-- Los totales siguen en 2 decimales porque es plata que se cobra de verdad.
alter table public.product_variants
  alter column price type numeric(12, 4);

alter table public.order_items
  alter column unit_price type numeric(12, 4);
