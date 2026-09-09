# Ecosistema Herramienta GIS - Frontend

Frontend desarrollado con **React 19**, **Vite** y **Tailwind CSS v4**, organizado como **monolito modular por dominio** (ver `/CLAUDE.md` en la raíz del repo para las reglas completas de arquitectura). La autenticación (`auth/`) sigue viviendo aparte de `domains/`. El primer dominio de negocio real es `domains/geoextraccion/` (digitalización cartográfica: captura OCR + fusión de Shapefiles) — es la referencia a copiar para el siguiente dominio; ver `/docs/COMO_AGREGAR_UN_DOMINIO.md` para la receta paso a paso. `domains/seguridad/` (módulo "Roles" en el sidebar: Permisos y Roles/Áreas) es el segundo — hoy solo front, con datos de ejemplo en memoria (`data/seguridadStore.js`) hasta que se conecte al backend real del dominio `seguridad`.

---

## 🏛️ Estructura del Proyecto

```
Frontend/
├── jsconfig.json                   # Configuración de aliases para IDE (@/*)
├── vite.config.js                  # Configuración de Vite y resolución de alias (@ -> src)
└── src/
    ├── app/                        # Bootstrap + shell del ERP autenticado
    │   ├── App.jsx                 # Monta el AuthProvider y el router
    │   ├── routes.jsx              # Árbol de rutas de la aplicación
    │   ├── layout/                 # AppShell (sidebar + header + outlet), Sidebar
    │   ├── components/             # ModuleGrid (accesos directos del home)
    │   └── pages/                  # DashboardPage (Inicio), DomainHome (entrada a un dominio), ModulePlaceholder
    ├── auth/                       # Todo lo relativo a sesión/Keycloak (integración, guardas, login)
    │   ├── context/                # AuthContext + AuthProvider
    │   ├── hooks/                  # useAuth
    │   ├── guards/                 # ProtectedRoute, PublicRoute
    │   ├── services/               # auth.service (login/logout/sesión), user.service (perfil /api/private)
    │   ├── components/             # LoginForm y tarjetas de estado de sesión
    │   └── pages/                  # LoginPage
    ├── core/                       # Infraestructura técnica transversal (no depende de ningún dominio)
    │   ├── http/                   # httpClient con inyección automática de JWT
    │   ├── storage/                # Abstracción de localStorage
    │   ├── errors/                 # ApiError
    │   ├── config/                 # env.config, endpoints.config, storage.config
    │   └── system/                 # health.service (endpoint público /api/public)
    ├── shared/                     # Design system genérico y utilidades sin dominio
    │   ├── ui/                     # Button, Input, Card, Alert, Badge, Spinner
    │   ├── layout/                 # GisBackdrop, Header
    │   ├── nav/                    # navConfig — árbol de navegación (dominios, subsistemas, íconos)
    │   ├── hooks/                  # useAsync
    │   └── utils/                  # jwt.util, validation.util, classNames.util (cn)
    ├── domains/                    # cada dominio de negocio con pantallas reales
    │   ├── index.js                 # único lugar que conoce todos los dominios (equivalente frontend de backend/app/registry.py)
    │   ├── geoextraccion/            # captura OCR + fusión de Shapefiles (primer dominio real, ex-proyecto standalone geo-extract/)
    │   │   └── pages/ · components/ · api/ · utils/ · routes.jsx
    │   └── seguridad/                 # módulo "Roles": Permisos (asignar rol+área a usuarios) y Roles/Áreas (CRUD)
    │       ├── pages/ · components/ · data/ · routes.jsx
    │       └── data/seguridadStore.js  # mock en memoria — sin backend todavía
    ├── assets/                     # Recursos estáticos (escudo oficial GAMC, imágenes, iconos)
    ├── main.jsx                    # Punto de entrada de la aplicación
    └── index.css                   # Estilos globales y tokens Tailwind v4
```

**Regla de dependencia:** `auth/` y cada `domains/<nombre>/` pueden importar de `core/` y `shared/` libremente, pero nunca entre sí directamente (ver `CLAUDE.md` §2). `app/` es el único lugar que conoce y ensambla todo — incluye el shell (sidebar + header) porque es transversal a cualquier dominio autenticado.

**Patrón de navegación:** cada dominio del ERP (Catastro, Administración, ...) es un botón grande en el sidebar y en el `ModuleGrid` del home. Al entrar se listan sus subsistemas también como botones grandes (`DomainHome`) — no hay submenús anidados. Todo el árbol se define en un solo lugar: `shared/nav/navConfig.js`.

---

## 🎨 Diseño y marca

Paleta, tipografía y patrones de componentes (sidebar colapsable, tarjetas, botones) siguen el manual de marca GAMC documentado en [FranciscoZambranaG/Dise-oGeneralGAMC](https://github.com/FranciscoZambranaG/Dise-oGeneralGAMC):

- **Morado institucional** (`brand-900/800/600`, `#26154a`/`#341a67`/`#584291`) — botones primarios y estado activo de navegación.
- **Celeste** (`accent-500/400/300`, `#009ed0`/`#47b4d8`/`#a8daed`) — íconos, focos, resaltados (reemplaza el verde que tenía el proyecto antes).
- **Colores de estado** (`state-success/warning/orange/danger`) — reservados para badges/indicadores, nunca estructurales.
- **Tipografía:** Poppins (antes Inter).
- **Escudo oficial GAMC** — se usa en login, header y sidebar vía `BRAND.logoSrc` (`src/shared/branding/brand.js`). Para cambiarlo, reemplazá la única imagen dentro de `src/assets/branding/` por la nueva (cualquier nombre: `.png`/`.jpg`/`.svg`/`.webp`); `brand.js` la detecta sola, no se toca código.

Estos tokens viven en `src/index.css` (`@theme`). Si el manual de marca cambia, actualizar ahí primero — todos los componentes (`Button`, `Sidebar`, `Badge`, etc.) heredan de esas variables, no hay colores sueltos por archivo.

---

## 🚀 Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo en el puerto 8060 (`http://localhost:8060`).
- `npm run build`: Compila la aplicación para producción.
- `npm run lint`: Ejecuta las validaciones de ESLint.
- `npm run preview`: Previsualiza la compilación de producción localmente.
