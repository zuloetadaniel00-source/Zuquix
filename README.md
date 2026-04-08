# Zuquix

PMS (Property Management System) web para hostels en Latinoamérica. Vanilla JS + Supabase, sin frameworks, sin build step. Abre directamente en el navegador.

---

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | HTML5 + CSS3 + Vanilla JS (ES Modules) |
| Backend / DB | [Supabase](https://supabase.com) (PostgreSQL + Auth + RLS) |
| Autenticación | Supabase Auth (email/password) |
| Multi-tenant | Row Level Security por `hostel_id` |
| Despliegue | Cualquier hosting estático (Netlify, Vercel, GitHub Pages) |

---

## Estructura del proyecto

```
hostel-os-bocas-main/
├── index.html          # Landing page pública
├── register.html       # Registro de nuevo hostel (onboarding 3 pasos)
├── app.html            # Aplicación principal (requiere login)
├── css/
│   └── styles.css      # Sistema de diseño completo (tokens, componentes)
├── js/
│   ├── supabase-config.js   # Cliente Supabase + helpers timezone + helpers de caja
│   ├── auth.js              # Login / logout / guard de autenticación
│   ├── dashboard.js         # Métricas del día, check-ins/outs pendientes
│   ├── reservations.js      # CRUD reservas, camas, huéspedes
│   ├── finances.js          # Caja registradora, transacciones, reportes Excel
│   ├── operations.js        # Tareas, incidencias, asignaciones de equipo
│   ├── channels.js          # Integraciones OTA (Booking, Expedia, Hostelworld, Airbnb)
│   └── app.js               # Router SPA, inicialización, nav tabs
└── supabase/
    ├── 01_tenants.sql           # Tabla hostels + ALTER TABLE hostel_id en todas las tablas
    ├── 02_rls_policies.sql      # Políticas RLS multi-tenant
    └── 03_channel_integrations.sql  # Tablas channel_integrations y channel_reservations
```

---

## Configuración inicial

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → New project.
2. Anota la **Project URL** y la **anon public key**.

### 2. Ejecutar las migraciones SQL

En el SQL Editor de Supabase, ejecuta los archivos **en orden**:

```sql
-- 1. Tablas base + hostel_id en todas las tablas
\i supabase/01_tenants.sql

-- 2. Row Level Security (requiere que existan las tablas del paso anterior)
\i supabase/02_rls_policies.sql

-- 3. Integraciones de canales OTA
\i supabase/03_channel_integrations.sql
```

> Las migraciones usan `IF NOT EXISTS` y `DROP POLICY IF EXISTS`, por lo que son idempotentes.

### 3. Conectar el frontend

Edita `js/supabase-config.js` y reemplaza las credenciales:

```js
const SUPABASE_URL  = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...TU_ANON_KEY...';
```

### 4. Abrir en el navegador

No hay build step. Abre `index.html` directamente o sirve la carpeta con cualquier servidor estático:

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

---

## Funcionalidades

### Dashboard
- Ocupación del día en porcentaje
- Ingresos del día (efectivo + digital)
- Check-ins y check-outs pendientes
- Balance actual de caja
- Alertas de tareas sin completar

### Reservas
- Habitaciones privadas y dormitorios con camas individuales
- Check-in / check-out con un clic
- Historial de huéspedes y pagos
- Filtros por fecha, estado y tipo de habitación

### Caja registradora
- Registro de ingresos en efectivo, Yappy y tarjeta
- Egresos y ajustes manuales
- Historial completo con saldo anterior / nuevo
- Funciones centralizadas: `addCashIncome`, `subtractCashExpense`, `adjustCashBalance`

### Finanzas y reportes
- Vista de todas las transacciones con filtros de fecha
- Exportación a Excel (XLSX) con un clic
- Categorías: ingresos de reserva, egresos operativos, ajustes de caja

### Tareas y operaciones
- Creación y asignación de tareas (limpieza, mantenimiento, etc.)
- Estados: pendiente → en progreso → completada
- Reporte de incidencias

### Canales de reserva (OTA)
| Canal | API |
|-------|-----|
| Booking.com | Connectivity API |
| Expedia | EPS Rapid API |
| Hostelworld | XML Feed |
| Airbnb | Official API |

Todas las integraciones tienen **modo demo** para probar sin credenciales reales.

---

## Multi-tenancy

Cada hostel tiene un `hostel_id` (UUID). Las políticas RLS de Supabase garantizan que cada usuario solo vea los datos de su hostel:

```sql
-- Función helper (SECURITY DEFINER para evitar recursión)
CREATE FUNCTION get_user_hostel_id()
RETURNS UUID AS $$
  SELECT hostel_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Ejemplo de política
CREATE POLICY "hostel_isolation_rooms" ON rooms
  FOR ALL USING (hostel_id = get_user_hostel_id());
```

---

## Timezone

Toda la lógica de fechas usa **America/Panama (UTC-5)**. Los helpers en `supabase-config.js`:

| Función | Descripción |
|---------|-------------|
| `getTodayInPanama()` | Devuelve `YYYY-MM-DD` en hora Panamá |
| `dateToUTC(localDateString)` | Convierte fecha local → ISO UTC para guardar en DB |
| `dateFromUTC(utcDateString)` | Convierte ISO UTC → Date en hora Panamá |
| `formatDateToPanama(date)` | Formatea Date a string legible en `es-PA` |

---

## Planes de precios

| Plan | Precio | Hosteles | Habitaciones | Canales OTA |
|------|--------|----------|--------------|-------------|
| Free | $0/mes | 1 | Hasta 10 | — |
| Starter | $29/mes | 1 | Ilimitadas | 2 canales |
| Pro | $79/mes | Ilimitados | Ilimitadas | Todos |

---

## Despliegue en Netlify / Vercel

```bash
# Netlify (drag & drop la carpeta o conecta el repo)
# No requiere configuración adicional — es HTML estático puro

# Vercel
npx vercel --prod
```

Las credenciales de Supabase son públicas por diseño (la seguridad se delega a RLS). No uses variables de entorno de servidor para la anon key.

---

## Licencia

MIT
