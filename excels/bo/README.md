# Plan de cuentas Bolivia → ERPNext

Genera, a partir del PUCT (Plan Único de Cuentas Tributario) oficial de Bolivia, un Excel de importación de plan de cuentas para ERPNext, filtrado por sector económico.

## Uso

```
python3 generar_puct_erpnext.py <Sector> [ruta_salida.xlsx]
```

Ejemplo:

```
python3 generar_puct_erpnext.py Comercial
```

Genera `plan_bo_comercial.xlsx` (si no se indica `ruta_salida.xlsx`) con una hoja `plan` y las columnas `Account Name | Parent Account | Account Number | Parent Account Number | Is Group | Account Type | Root Type | Account Currency`, en el mismo formato que usa ERPNext para importar planes de cuentas (ver `es/plan_es.xlsx`).

El argumento de sector es insensible a mayúsculas/tildes. Sectores válidos: `Comercial, Servicios, Transporte, Industrial, Petrolera, Construcción, Agropecuaria, Minera`. Si se escribe un sector inválido, el script lista las opciones válidas.

## Origen de los datos

`plan_bo_puct.xlsx` (hoja `PUCT`) trae la jerarquía completa Clase/Grupo/Subgrupo/Cuenta Principal/Cuenta Analítica (columnas A-E) y 8 columnas de sector marcadas con `"X"` (columnas G-N). El script:

1. Arma el árbol completo de cuentas, con `Account Number` = códigos de nivel unidos por `.` (ej. Caja = `1.1.1.001`).
2. Descarta las filas de detalle (Cuenta Analítica) que son placeholders genéricos con nombre literal `"XXX"`.
3. Cuando una Cuenta Principal tiene un único hijo real (no placeholder) — porque el origen repite el mismo nombre, o porque el nombre real solo vive en el hijo — los fusiona en una sola cuenta hoja. Solo se mantienen como grupo con hijos reales los casos con 2+ hijos distintos (ej. "Valores fiscales negociables" → CEDEIM / CENOCREF).
4. Incluye una cuenta si su propia columna de sector tiene `"X"`; un grupo (Clase/Grupo/Subgrupo) se incluye si tiene `"X"` propia o al menos un descendiente incluido, para no dejar ramas huérfanas.
5. Formatea los nombres en "sentence case" (primera letra mayúscula, resto minúsculas), preservando en mayúsculas una lista de siglas editable (`IVA, IT, NIT, RC-IVA`, etc.) y manteniendo las 5 cuentas raíz (Activo, Pasivo, Patrimonio, Ingresos, Egresos) en mayúsculas completas.
6. Detecta `Account Type` con heurísticas simples por palabras clave (Caja→Cash, Bancos→Bank, IVA→Tax, Existencias→Stock, etc.), editable en `ACCOUNT_TYPE_RULES`.
7. Todas las cuentas quedan con `Account Currency = BOB`.

## Bancos agregados

La cuenta `Bancos` (`1.1.1.002`) solo trae hijos placeholder en el PUCT, así que se agregó como grupo con los principales bancos de Bolivia como subcuentas reales (`1.1.1.002.001` en adelante), editable en `BOLIVIAN_BANKS`:

Banco Nacional de Bolivia (BNB), Banco Mercantil Santa Cruz, Banco de Crédito de Bolivia (BCP), Banco Bisa, Banco Unión, Banco Económico, Banco Ganadero, Banco FIE, Banco Solidario (BancoSol), Banco Fortaleza, Banco Prodem.

(No incluye Banco Fassil por estar intervenido/cerrado por ASFI desde 2023.)

## Cuentas de configuración ERPNext

ERPNext necesita varias "cuentas por defecto" a nivel de Company / Stock Settings / HR Settings. Estas 8 se agregaron o mapearon en el PUCT, y aparecen **en todos los sectores** (se fuerza su inclusión sin importar las marcas de sector del PUCT, ya que son necesarias para el funcionamiento base de ERPNext), editable en `ERP_CONFIG_ACCOUNTS`:

| Configuración ERPNext | Dónde se configura | Cuenta | Account Type | Origen |
|---|---|---|---|---|
| Write Off Account | Company | `5.5.1.010` Castigos y ajustes contables | `Expense Account` | Nueva |
| Round Off Account | Company | `5.6.1.004` Diferencia por redondeo | `Round Off` | Ya existía en el PUCT |
| Asset Received But Not Billed | Company | `2.1.2.024` Activos fijos recibidos no facturados | `Asset Received But Not Billed` | Nueva |
| Default Employee Advance Account | Company | `1.1.2.020` Anticipos a empleados | *(vacío)* | Nueva |
| Default Payroll Payable Account | HR Settings | `2.1.3.001` Sueldos y salarios por pagar | `Payable` | Ya existía en el PUCT |
| Stock Adjustment Account | Stock Settings | `5.1.4.001` Mermas y fallas en existencias | `Stock Adjustment` | Ya existía en el PUCT |
| Stock Received But Not Billed | Stock Settings | `2.1.2.025` Existencias recibidas no facturadas | `Stock Received But Not Billed` | Nueva |
| Expenses Included In Valuation | Stock Settings | `5.1.1.009` Gastos incluidos en la valoración de existencias | `Expenses Included In Valuation` | Nueva |

Para 5 de estas cuentas (Round Off, Asset Received But Not Billed, Stock Adjustment, Stock Received But Not Billed, Expenses Included In Valuation), ERPNext filtra el selector por un `Account Type` específico y el script fuerza ese valor exacto (ver `ACCOUNT_TYPE_OVERRIDES`), en vez de dejar que la heurística genérica decida. La cuenta Write Off no tiene un `Account Type` dedicado en ERPNext (no existe el valor "Write Off" en ese campo), así que queda como `Expense Account` vía la heurística normal.

`Account Type` es un campo `Select` de ERPNext con una lista fija de valores válidos; cualquier valor fuera de esa lista falla al guardar la cuenta. Los válidos actuales: *(vacío)*, Accumulated Depreciation, Asset Received But Not Billed, Bank, Cash, Chargeable, Capital Work in Progress, Cost of Goods Sold, Current Asset, Current Liability, Depreciation, Direct Expense, Direct Income, Equity, Expense Account, Expenses Included In Asset Valuation, Expenses Included In Valuation, Fixed Asset, Income Account, Indirect Expense, Indirect Income, Liability, Payable, Receivable, Round Off, Round Off for Opening, Stock, Stock Adjustment, Stock Received But Not Billed, Service Received But Not Billed, Tax, Temporary.

## Planes de cuentas personalizados por empresa

La carpeta `empresas/` guarda planes de cuentas ya personalizados para una empresa boliviana en particular: parten de un Excel generado por `generar_puct_erpnext.py` para un sector, y luego se editan a mano para agregar/quitar cuentas propias de esa empresa. Al ser ediciones manuales, **no** se regeneran con el script (quedan fuera de su flujo automático) — cualquier cambio futuro al PUCT o a `generar_puct_erpnext.py` no se refleja solo en estos archivos.

Al crear un plan personalizado nuevo en esta carpeta, conviene documentar aquí sus particularidades (base usada, qué se agregó/quitó) y verificar manualmente que las 8 cuentas de configuración ERPNext de la sección anterior sigan presentes y con el `Account Type` correcto tras la edición.

### `empresas/plan_bo_comercial_importacion_nuevaera.xlsx` — Nueva Era

Basado en `plan_bo_comercial.xlsx` (sector Comercial). Personalizaciones agregadas a mano:

- Grupo **"Gastos de importación"** (`5.1.5`, bajo `Costos operativos`), con 9 subcuentas: Flete internacional, Seguro internacional, Gastos en origen, Gravamen arancelario, Honorarios despachante, Almacenaje importación, Transporte local importación, Otros gastos de importación, Multas e intereses de importación (`5.1.5.001` a `5.1.5.009`).
- **"Apertura temporal"** (`3.1.5`, bajo `Patrimonio`, `Account Type = Temporary`).
- **"Ingresos no facturados"** (`4.1.1.011`, bajo `Ingresos por ventas`, `Account Type = Income Account`).

La edición manual original había eliminado 5 de las 8 cuentas de configuración ERPNext y cambiado el `Account Type` de otras 2 (Round Off y Stock Adjustment); ya se restauraron/corrigieron para que coincidan con la tabla de la sección anterior. También se corrigió `5.5.1.010` (Write Off), que había quedado con el valor inválido `"Write Off"` — no existe ese `Account Type` en ERPNext — y ahora usa `Expense Account`.

## Editar / ampliar

Todas las listas anteriores (siglas, reglas de `Account Type`, bancos, cuentas de configuración ERPNext) son constantes al inicio de `generar_puct_erpnext.py`, pensadas para ajustarse fácilmente sin tocar el resto de la lógica.
