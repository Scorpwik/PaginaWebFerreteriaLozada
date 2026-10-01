# Ferretería Lozada — Tienda web

Plataforma web comercial para **aumentar las ventas** de Ferretería Lozada
(Chillogallo, sur de Quito, desde 2002): catálogo moderno + carrito +
cotizaciones en PDF por WhatsApp, **sin pago en línea**.

El objetivo es ayudar al maestro de obra a encontrar su producto desde el
celular en la menor cantidad de clics y convertir eso en un mensaje de
WhatsApp. Diseño **mobile-first**, sin artificios: ferretería de barrio
confiable + proveedor profesional.

---

## Funcionalidades

### Tienda pública

- **Inicio**: portada con foto distinta para celular y computador, buscador
  ("¿Qué necesitas para tu obra?"), **Promociones** (combos temporales, solo
  si hay alguna vigente), secciones de **Ofertas** y **Más vendidos**,
  categorías y bloque de asesoría por WhatsApp.
- **Catálogo** (`/catalogo`): grid paginado, filtros por categoría,
  disponibilidad, ofertas y más vendidos. El estado vive en la URL, así que
  una búsqueda se puede compartir por WhatsApp tal cual.
- **Ficha de producto** (`/producto/:originId`): variantes (medida, color,
  presentación, forma de venta), precio, disponibilidad y botón de carrito.
- **Búsqueda**: por nombre, código del sistema, medida, código de barras o
  marca (full-text con `pg_trgm` en Supabase).
- **Carrito** (`/carrito`): persistencia en `sessionStorage`, edición de
  cantidades, eliminar líneas y microanimación al añadir.
- **Cotización** (`/carrito/cotizar`): se pide solo el nombre del cliente,
  el servidor recalcula el total con precios reales, genera el **PDF** y
  arma el mensaje de **WhatsApp**. El carrito del cliente nunca define el total.
- **Nosotros** (`/nosotros`): historia, cobertura, horarios, mapa y galería
  de fotos del local en carrusel horizontal con visor a pantalla completa
  (móvil y PC).
- **Animaciones**: scroll suave (Lenis), aparición al hacer scroll (GSAP),
  transición suave entre páginas; todo se apaga con
  `prefers-reduced-motion`.
- **SEO**: meta tags por página, JSON-LD `HardwareStore`, `robots.txt` y
  `sitemap.xml`.

### Panel de administración (`/admin`)

- Login con Supabase Auth (solo usuarios registrados en la tabla `admins`).
- **Resumen**: cotizaciones, monto cotizado, productos más pedidos, etc.
- **Productos**: CRUD + variantes, marcar oferta / más vendido, subir imágenes.
- **Combos y promociones**: ofertas temporales (imagen de Illustrator, título,
  precio en texto, fecha de fin). Aparecen en el inicio mientras estén vigentes;
  al vencer se archivan en la pestaña Expiradas (se pueden reactivar). El
  cliente pide el combo por WhatsApp y enseña la imagen en el local; no van al
  carrito.
- **Categorías**: CRUD con subcategorías (máx. 2 niveles).
- **Cotizaciones**: historial con PDF firmado (se purgan solas a los 15 días).
- **Ajustes del sitio**: todo el contenido editable sin tocar código
  (WhatsApp, dirección, horarios, portada, historia, redes, SEO) + galería
  de fotos + **guía de medidas** para recortar imágenes.
- **Importar catálogo**: sube el JSON del normalizador (Excel del sistema de
  facturación) y hace upsert por `origin_id`, con resumen de cambios.

---

## Herramientas usadas

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite + TypeScript |
| Estilos | Tailwind CSS (única librería de CSS) |
| Rutas | React Router v6/v7 |
| Base de datos | Supabase (PostgreSQL) + RLS |
| Auth | Supabase Auth |
| Backend | Supabase Edge Functions (Deno) |
| PDF | pdf-lib (generado en servidor) |
| Búsqueda | PostgreSQL `pg_trgm` |
| Animaciones | Lenis + GSAP + ScrollTrigger |
| Validación | Zod (frontend + Edge Function) |
| Recorte de imágenes | react-easy-crop |
| Tests | Vitest |
| Deploy frontend | Vercel (cuando se haga la Fase 7) |
| Costo actual | $0/mes (tiers gratuitos) |

---

## Cómo levantar el servidor (desarrollo local)

### Requisitos

- **Git** → https://git-scm.com/download/win
- **Node.js LTS** (v20 o v22, incluye `npm`) → https://nodejs.org
- Editor: Cursor o VS Code (opcional).

### Pasos

```powershell
# 1. Clonar el repositorio
git clone https://github.com/Scorpwik/PaginaWebFerreteriaLozada.git
cd PaginaWebFerreteriaLozada

# 2. Instalar dependencias (OBLIGATORIO: aquí se instalan gsap, lenis, etc.)
npm install

# 3. Crear el archivo de entorno
copy .env.example .env.local
```

4. Abrir `.env.local` y rellenar con los datos del proyecto Supabase
   (Dashboard → **Settings → API**):

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxx
```

> La **service role key NUNCA** va en el frontend: vive solo en los secrets
> de las Edge Functions en Supabase.

```powershell
# 5. Levantar el servidor de desarrollo
npm run dev
```

Abrir en el navegador: **http://localhost:5173**

### Comandos disponibles

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Compila TypeScript + build de producción |
| `npm run preview` | Sirve el build para probarlo en local |
| `npm run lint` | Revisa tipos con TypeScript (`tsc --noEmit`) |
| `npm test` | Corre los tests unitarios (Vitest) |

### Si las animaciones u otras librerías no cargan en otro PC

`node_modules/` **no se sube a GitHub por diseño** (está en `.gitignore`).
Si algo no aparece (animaciones, estilos, etc.), en esa PC falta este paso:

```powershell
npm install
```

Y luego `npm run dev` de nuevo. Lo mismo aplica para `dist/` (se genera con
`npm run build`) y `.env.local` (cada PC crea el suyo, nunca se sube).

---

## Estructura del proyecto

```
src/
  animation/     # Lenis, transiciones de página, reveal GSAP, reduced-motion
  components/    # Primitivas UI (Button, Modal, Skeleton, Badge…)
  data/          # Acceso a datos (todo pasa por aquí, nunca .from() en UI)
    adminImport.ts  # Lógica del importador JSON
    adminPromotions.ts # CRUD de combos (admin)
    promotions.ts   # Promociones vigentes para el Home
    orders.ts       # createQuote → Edge Function
  features/
    about/       # Carrusel de fotos + visor (lightbox)
    admin/       # Controles y editor de recorte del panel
    auth/        # AuthProvider, RequireAdmin
    cart/        # CartProvider + lógica pura (cart.ts)
    catalog/     # Tarjetas, grid, filtros, buscador
    promotions/  # Sección de combos del Home
    quote/       # Flujo de cotización
    whatsapp/    # Botón + armado del mensaje
    settings/    # Proveedor de site_settings
  layout/        # Header, Footer, AdminLayout, StoreLayout
  lib/           # supabase client, validación Zod, formatos, tipos
  pages/         # Home, Catalog, Product, Cart, Quote, About…
    admin/       # Dashboard, productos, categorías, ajustes, importar…
supabase/
  migrations/    # SQL versionado (ya aplicado en el proyecto remoto)
  functions/
    create-quote/  # Valida, recalcula total, guarda orden, genera PDF
```

### Reglas de arquitectura (resumen)

1. Sin hardcoding de negocio: todo sale de `site_settings` vía `useSettings()`.
2. Colores definidos una vez en Tailwind (`primary #F23005`, etc.).
3. Cliente Supabase solo desde `lib/supabase.ts` (anon key, nunca service role).
4. Componentes nunca consultan tablas directo: todo pasa por `src/data/`.
5. RLS es el muro: la validación real ocurre en Edge Functions.
6. Validación con Zod, compartida entre frontend y servidor.

---

## Backend (Supabase)

La base y el backend ya viven en la nube; en local solo se corre el
frontend, que se conecta al proyecto remoto vía `.env.local`.

- **Migraciones**: `supabase/migrations/` (RLS, índices, buckets, cron de
  purga, `search_product_ids`, etc.). Ya aplicadas; no re-aplicar si constan
  en `supabase_migrations.schema_migrations`.
- **Edge Function `create-quote`**: validar → rate limit → releer precios →
  recalcular total → guardar orden → generar PDF → subir a Storage → URL firmada.
- **Admin**: crear el usuario en **Authentication** y añadir su `id` + nombre
  en la tabla `admins`.
- **Storage**: `product-images` (público) y `quotes` (privado, URLs firmadas).

---

## Documentación interna

- `.cursor/ARCHITECTURE.md` — decisiones, modelo de datos y fases del proyecto.
- `.cursor/cursor_rules` — reglas y estado actual por fase.
