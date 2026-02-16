# Conta-Atlas

Sitio de documentación con **Docusaurus** para explorar el **plan de cuentas SAT (MX)** a partir de `plan_sat.xlsx`.

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

3. Inicia el sitio:

```bash
npm start
```

## Rutas principales

- `/mx/plan-completo`
- `/mx/esqueletos`
- `/mx/explorar`
# conta-atlas
