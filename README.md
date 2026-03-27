# Conta-Atlas

Sitio de documentación con **Docusaurus** para explorar:

- **MX**: plan de cuentas SAT desde `excels/mx/plan_sat.xlsx`
- **ES**: plan de cuentas desde `plan_es.xlsx` (o `excels/es/plan_es.xlsx` como fallback)

## Flujo

1. Instala dependencias:

```bash
npm install
```

> Nota: el script `build:data` prefiere `exceljs` (recomendado) y cae a `xlsx` si aún lo tienes instalado.

2. Genera datos y docs MX:

```bash
npm run build:all
```

### ES (España)

Genera/actualiza el dataset único de ES:

```bash
npm run build:es:data
```

Esto también genera los perfiles simplificados (esqueletos) en `data/es/esqueletos/*.json`.

3. Inicia el sitio:

```bash
npm start
```

## Rutas principales

- `/mx/plan-completo`
- `/mx/esqueletos`
- `/mx/explorar`

## ES: navegación de cuentas (sidebar + panel derecho)

Se añadió una mejora de navegación para páginas de cuentas de España (`/es/cuentas/*`) con dos objetivos:

1. Mantener visible y abierta la sidebar de documentación aunque la cuenta no exista como nodo explícito del menú.
2. Mostrar en la columna derecha un panel contextual con el **esqueleto base** (árbol Bizmotion), centrado en la cuenta actual.

### Comportamiento

- La ruta `/es/cuentas/*` fuerza la sidebar `esSidebar` para que no desaparezca.
- En la sidebar izquierda se mantiene abierto el bloque de `Plan de cuentas`.
- En la derecha aparece un panel `Esqueleto base (POC)`:
  - usa estructura del árbol Bizmotion (no bloques PGC),
  - abre solo la rama hasta el nodo actual,
  - deja el resto colapsado,
  - permite expandir/colapsar nodos,
  - permite navegar a cuentas y nodos relacionados sin recarga completa (SPA).
- El panel se renderiza por encima del TOC/resumen de la página.

### Archivos clave

- `scripts/buildDocsEs.js`:
  - añade `displayed_sidebar: "esSidebar"` a páginas de `docs/es/cuentas/*`.
- `docusaurus.config.js`:
  - registra el módulo cliente `src/clientModules/sidebarRouteState.js`.
- `src/clientModules/sidebarRouteState.js`:
  - detecta rutas de cuentas ES,
  - controla estado visual de sidebar,
  - renderiza el panel derecho del árbol,
  - gestiona navegación SPA desde el árbol.
- `src/css/custom.css`:
  - estilos de sidebar activa en cuentas,
  - estilos del panel derecho con look terminal ligero.
