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
# conta-atlas
