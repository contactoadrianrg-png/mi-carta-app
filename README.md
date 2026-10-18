# Messa — Cartas digitales para restaurantes

Aplicación web (React + Vite + Tailwind + Supabase) para que un restaurante cree su carta
digital, la comparta por QR y la actualice en tiempo real.

- **Inicio:** `/` (landing); acceso en `/login` y registro en `/register`.
- **Panel del restaurante:** `/dashboard`
- **Carta pública:** `/carta/:slug` (portada), `/carta/:slug/menu`, `/carta/:slug/:catId`
- **Super admin:** `/admin` (restringido por email, ver más abajo)

---

## Requisitos

- Node.js 20.x (probado con v20.19.1) y npm 10.x
- Un proyecto de [Supabase](https://supabase.com) (base de datos + auth + storage)
- Cuenta de Vercel para el despliegue

---

## Setup local

```bash
git clone https://github.com/contactoadrianrg-png/mi-carta-app.git
cd mi-carta-app
npm ci
cp .env.example .env        # y rellena los valores (ver abajo)
npm run dev                 # http://localhost:5173
```

Scripts disponibles:

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo de Vite con HMR |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build de `dist/` en local para comprobarlo |
| `npm test` | Pruebas de autenticación, carta y permisos SQL, sin usar producción |

---

## Variables de entorno

Son solo dos, ambas con prefijo `VITE_` (se inyectan en el bundle del cliente, así que
**únicamente** valores públicos — nunca la `service_role` key):

| Variable | Dónde se usa | Dónde obtenerla |
|---|---|---|
| `VITE_SUPABASE_URL` | `src/lib/supabase.js` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.js` | Supabase → Project Settings → API → `anon` / `public` key |

En local van en `.env` (ignorado por git). En Vercel se configuran en
*Project → Settings → Environment Variables* para los entornos **Production**, **Preview**
y **Development**. Después de añadirlas o cambiarlas hay que **volver a desplegar**: Vite
las resuelve en tiempo de build, no en tiempo de ejecución.

### Email del super admin

El acceso a `/admin` está fijado en el código, no en una variable de entorno. Si cambia el
correo del administrador hay que actualizarlo en **dos sitios**:

1. `src/App.jsx` → la constante `ADMIN_EMAIL`
2. `supabase/schema.sql` → las funciones `admin_get_all_restaurants`,
   `admin_set_restaurant_active`, `admin_set_restaurant_plan` y
   `admin_set_restaurant_theme` (comprueban el email dentro del `SECURITY DEFINER`).
   Sobre una base existente, preparar una migración revisada que respete sus firmas.

---

## Configuración de Supabase

### Orden de ejecución del SQL

Para una instalación nueva, los archivos se ejecutan desde
**Supabase Dashboard → SQL Editor**, en este orden. Para una base existente,
comparar antes el esquema y preparar una migración: no ejecutar el esquema completo.

| # | Archivo | Qué crea |
|---|---|---|
| 1 | `supabase/schema.sql` | Tablas `restaurants`, `categories`, `dishes`; índices; trigger `updated_at`; RLS y políticas; bucket de storage `dish-images` y sus políticas; columnas añadidas por migraciones posteriores (subcategorías, redes sociales, destacados/ofertas, banner, `active`, reservas, imagen de bienvenida, `plan`); Realtime; funciones de super admin |
| 2 | `supabase/migration_color_theme.sql` | Columna `restaurants.color_theme` (default `'orange'`) |
| 3 | `supabase-migrations/tracking-tables.sql` | Tablas `carta_views` y `plate_views` con su RLS e índices (alimentan el panel de estadísticas) |

El orden importa: los pasos 2 y 3 dependen de que `restaurants` ya exista (el 3 además la
referencia con `FOREIGN KEY`).

`schema.sql` es una referencia para instalaciones nuevas. Las políticas,
publicaciones y firmas de funciones pueden existir ya con otra definición.
Consultar el informe de revisión de la entrega privada antes de migrar una base en uso.

En el proyecto actual ya están registradas las migraciones
`20261018091900_repair_menu_and_admin_permissions` y
`20261018092206_repair_restaurant_contact_fields`.
La carpeta `supabase/migrations` conserva el SQL exacto aplicado.
La comprobación de integridad se conserva en informes privados, excluidos
del repositorio público. No volver a
ejecutar esos archivos manualmente sobre ese proyecto.

### Auth

- **Authentication → Providers → Email**: habilitado. Si dejas activa la confirmación por
  email, el registro muestra el aviso "Revisa tu email para confirmar tu cuenta".
- **Authentication → URL Configuration**: añade a *Redirect URLs* la ruta de recuperación
  de contraseña para cada entorno, porque el enlace del email apunta ahí
  (`src/pages/AuthPage.jsx` usa `${window.location.origin}/reset-password`):
  - `http://localhost:5173/reset-password`
  - `https://<tu-dominio>/reset-password`
- **Site URL**: el dominio de producción.

### Storage

El bucket público `dish-images` lo crea `schema.sql`. Las imágenes se guardan bajo un
prefijo con el `uid` del usuario (`<user_id>/...`), que es lo que comprueban las políticas
de update y delete — respétalo si cambias la ruta de subida.

---

## Despliegue en Vercel

La copia original tenía un enlace local a Vercel, que no se incluye en esta
entrega. Confirmar el proyecto de destino antes de desplegar. Para un despliegue desde cero:

1. **Importa el repo** en Vercel. Detecta Vite automáticamente; si no:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
2. **Añade las variables de entorno** `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en los
   tres entornos.
3. **Despliega.** `vercel.json` ya incluye el rewrite de SPA
   (`/(.*)` → `/index.html`), necesario para que rutas como `/carta/mi-restaurante/menu`
   funcionen al recargar o al entrar directamente por URL.
4. **Actualiza Supabase** con el dominio final: *Site URL* y la *Redirect URL*
   `https://<tu-dominio>/reset-password`.

Con la integración Git configurada, los pushes a la rama de producción pueden
generar despliegues automáticos. La conexión actual debe comprobarse en Vercel.
Esta entrega queda en una rama de revisión, sin publicar en producción.

---

## Estructura del proyecto

```
src/
├─ App.jsx                  Router + guardas de ruta (ProtectedRoute, GuestRoute, AdminRoute)
├─ main.jsx                 Punto de entrada
├─ index.css                Tailwind + estilos globales
├─ context/AuthContext.jsx  Sesión de Supabase (signIn, signUp, signOut)
├─ lib/
│  ├─ supabase.js           Cliente de Supabase
│  ├─ themes.js             Temas de color de la carta
│  └─ socials.js            Helpers de redes sociales
├─ pages/
│  ├─ LandingPage.jsx       Página de inicio pública
│  ├─ AuthPage.jsx          Formulario de acceso, registro y recuperación
│  ├─ DashboardPage.jsx     Panel del restaurante
│  ├─ AdminPage.jsx         Super admin (restaurantes, planes, altas/bajas)
│  ├─ WelcomePage.jsx       Portada pública de la carta  /carta/:slug
│  ├─ PublicMenuPage.jsx    Carta pública completa       /carta/:slug/menu
│  ├─ CategoryPage.jsx      Reutiliza la carta para enlaces de categoría antiguos
│  └─ ResetPasswordPage.jsx Restablecer contraseña
└─ components/
   ├─ dashboard/            Editor de restaurante, platos, categorías, socials, stats, import
   └─ menu/                 Tarjetas de plato, filtro de categorías, ficha de plato, iconos
```
