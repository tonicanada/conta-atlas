/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

let ExcelJS = null;
try {
  // eslint-disable-next-line global-require
  ExcelJS = require('exceljs');
} catch {
  // ignore
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function stripAccents(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function cellToPrimitive(value) {
  if (value == null) return null;
  if (typeof value === 'object') {
    if ('result' in value) return value.result;
    if ('text' in value) return value.text;
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((p) => p.text || '').join('');
    }
  }
  return value;
}

function truthy(value) {
  if (value == null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const s = String(value).trim().toLowerCase();
  if (!s) return null;
  return ['1', 'true', 'yes', 'y', 'si', 'sí'].includes(s);
}

function formatCode(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    if (Number.isInteger(value)) return String(value);
    // Avoid scientific notation / decimals artifacts.
    const asText = String(value);
    if (asText.includes('e') || asText.includes('E')) return asText;
    return asText.replace(/\.0+$/, '');
  }
  const s = String(value).trim();
  if (!s) return null;
  return s;
}

function cleanName(value) {
  let out = String(value || '').trim();
  if (!out) return out;
  // Remove short uppercase suffixes used as tags, e.g. " - GN"
  out = out.replace(/\s*[-–—]\s*[A-Z]{2,4}\s*$/, '').trim();
  return out;
}

function inferBizmotionClass(bizmotion_sort_key) {
  if (!bizmotion_sort_key) return null;
  const m = String(bizmotion_sort_key).match(/^\d+\.(A|P|E|I|G)(?:\.|$)/i);
  if (!m) return null;
  return m[1].toUpperCase();
}

function inferPgcGroup(code_pgc) {
  if (!code_pgc) return null;
  const first = String(code_pgc).trim()[0];
  if (!first) return null;
  const n = Number(first);
  if (!Number.isInteger(n) || n < 1 || n > 7) return null;
  return n;
}

function extractPgcCodeFromBizmotionKey(bizmotion_sort_key) {
  if (!bizmotion_sort_key) return null;
  const parts = String(bizmotion_sort_key).split('.');
  const last = parts[parts.length - 1];
  if (!last) return null;
  if (!/^\d+$/.test(last)) return null;
  return last;
}

function findColIndex(headerNorm, includesAny) {
  for (const inc of includesAny) {
    const idx = headerNorm.findIndex((h) => String(h || '').includes(inc));
    if (idx !== -1) return idx + 1; // exceljs is 1-based for getCell()
  }
  return 0;
}

function readHeaderRow(worksheet, rowNumber = 1) {
  const headerRow = worksheet.getRow(rowNumber);
  const headerValues = Array.isArray(headerRow.values) ? headerRow.values : [];
  const dense = [];
  for (let i = 1; i < headerValues.length; i += 1) {
    const h = headerValues[i];
    dense.push(h == null ? '' : String(h));
  }
  return dense;
}

function findWorksheetByNameOrFirst(workbook, preferredNames) {
  for (const name of preferredNames) {
    const ws = workbook.getWorksheet(name);
    if (ws) return ws;
  }
  return workbook.worksheets[0] || null;
}

function parseBizmotionSheet(worksheet, pgcCodeSet) {
  const header = readHeaderRow(worksheet, 1);
  const headerNorm = header.map(stripAccents);

  const nameIdx = findColIndex(headerNorm, ['account name', 'nombre', 'name', 'cuenta']);
  const codeIdx = findColIndex(headerNorm, ['account number', 'codigo', 'code', 'numero', 'número', 'number']);
  const parentCodeIdx = findColIndex(headerNorm, ['parent account number', 'parent code', 'codigo padre', 'parent number']);
  const isGroupIdx = findColIndex(headerNorm, ['is group', 'grupo', 'group']);

  if (!nameIdx || !codeIdx) {
    console.error('No pude detectar columnas de nombre/código en la hoja Bizmotion.');
    console.error('Header:', header);
    process.exit(1);
  }

  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const rawName = cellToPrimitive(row.getCell(nameIdx).value);
    const rawCode = cellToPrimitive(row.getCell(codeIdx).value);
    const rawParentCode = parentCodeIdx ? cellToPrimitive(row.getCell(parentCodeIdx).value) : null;
    const rawIsGroup = isGroupIdx ? cellToPrimitive(row.getCell(isGroupIdx).value) : null;

    const name = cleanName(rawName);
    const bizmotion_sort_key = formatCode(rawCode);
    const parent_sort_key = formatCode(rawParentCode);
    if (!name && !bizmotion_sort_key) return;

    rows.push({
      name,
      bizmotion_sort_key,
      parent_sort_key,
      is_group_raw: rawIsGroup
    });
  });

  const accounts = rows.map((r) => ({
    id: `bm:${r.bizmotion_sort_key}`,
    name: r.name,
    is_group: null,
    parent_id: r.parent_sort_key ? `bm:${r.parent_sort_key}` : null,
    bizmotion_class: inferBizmotionClass(r.bizmotion_sort_key),
    bizmotion_sort_key: r.bizmotion_sort_key,
    pgc_group: null,
    pgc_sort_key: null,
    code_pgc: null,
    code_display: r.bizmotion_sort_key || null,
    _is_group_raw: r.is_group_raw
  }));

  for (const a of accounts) {
    const extracted = extractPgcCodeFromBizmotionKey(a.bizmotion_sort_key);
    if (!extracted) continue;
    const code = String(extracted);
    // Exception: never map Bizmotion (Balance/PyG) nodes to PGC root groups (1..7).
    // Those are valid pages in the PGC view, but Bizmotion aggregation nodes must not redirect there.
    if (/^[1-7]$/.test(code)) continue;
    if (!pgcCodeSet || !pgcCodeSet.has(code)) continue;
    a.code_pgc = code;
    a.pgc_sort_key = code;
    a.pgc_group = inferPgcGroup(code);
  }

  const byId = new Map(accounts.map((a) => [a.id, a]));
  const childrenByParent = new Map();
  for (const a of accounts) {
    if (!a.parent_id) continue;
    if (!byId.has(a.parent_id)) continue;
    const list = childrenByParent.get(a.parent_id) || [];
    list.push(a.id);
    childrenByParent.set(a.parent_id, list);
  }

  for (const a of accounts) {
    const hinted = truthy(a._is_group_raw);
    if (hinted !== null) a.is_group = hinted;
    else a.is_group = (childrenByParent.get(a.id) || []).length > 0;
    delete a._is_group_raw;
  }

  return accounts;
}

function parsePgcSheet(worksheet) {
  const header = readHeaderRow(worksheet, 1);
  const headerNorm = header.map(stripAccents);

  const numIdx = findColIndex(headerNorm, ['num', 'numero', 'número', 'account number', 'codigo', 'code']);
  const nameIdx = findColIndex(headerNorm, ['cuenta', 'account name', 'nombre', 'name']);
  if (!numIdx || !nameIdx) {
    console.error('No pude detectar columnas num/cuenta en la hoja PGC.');
    console.error('Header:', header);
    process.exit(1);
  }

  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const rawNum = cellToPrimitive(row.getCell(numIdx).value);
    const rawName = cellToPrimitive(row.getCell(nameIdx).value);
    const num = formatCode(rawNum);
    const name = cleanName(rawName);
    if (!num && !name) return;
    if (!num) return;
    if (!/^\d+$/.test(String(num))) return;
    rows.push({ num, name });
  });

  const codes = new Set(rows.map((r) => r.num));

  function inferParentCode(code) {
    const s = String(code);
    for (let i = s.length - 1; i >= 1; i -= 1) {
      const candidate = s.slice(0, i);
      if (codes.has(candidate)) return candidate;
    }
    return null;
  }

  const accounts = rows.map((r) => ({
    id: `pgc:${r.num}`,
    name: r.name || r.num,
    is_group: null,
    parent_id: null,
    bizmotion_class: null,
    bizmotion_sort_key: null,
    pgc_group: inferPgcGroup(r.num),
    pgc_sort_key: String(r.num),
    code_pgc: String(r.num),
    code_display: String(r.num)
  }));

  const byCode = new Map(accounts.map((a) => [a.code_pgc, a]));
  for (const a of accounts) {
    const parentCode = inferParentCode(a.code_pgc);
    a.parent_id = parentCode && byCode.has(parentCode) ? byCode.get(parentCode).id : null;
  }

  const byId = new Map(accounts.map((a) => [a.id, a]));
  const childrenByParent = new Map();
  for (const a of accounts) {
    if (!a.parent_id) continue;
    if (!byId.has(a.parent_id)) continue;
    const list = childrenByParent.get(a.parent_id) || [];
    list.push(a.id);
    childrenByParent.set(a.parent_id, list);
  }

  for (const a of accounts) {
    a.is_group = (childrenByParent.get(a.id) || []).length > 0;
  }

  return { accounts, codes };
}

async function main() {
  const repoRoot = path.join(__dirname, '..');

  const excelPathRoot = path.join(repoRoot, 'plan_es.xlsx');
  const excelPathFallback = path.join(repoRoot, 'excels', 'es', 'plan_es.xlsx');
  const excelPath = fs.existsSync(excelPathRoot) ? excelPathRoot : excelPathFallback;

  const outPath = path.join(repoRoot, 'data', 'es', 'pgc_accounts.json');

  if (!ExcelJS) {
    console.error('Falta dependencia para leer Excel: instala `exceljs`.');
    process.exit(1);
  }

  if (!fs.existsSync(excelPath)) {
    console.error('No se encontró el Excel de ES.');
    console.error(`Busqué: ${excelPathRoot}`);
    console.error(`Fallback: ${excelPathFallback}`);
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  if (!workbook.worksheets.length) {
    console.error('El Excel no contiene hojas.');
    process.exit(1);
  }

  const bizmotionWs = findWorksheetByNameOrFirst(workbook, ['plan', 'import_erp_v2', 'import_erp', 'import']);
  const pgcWs = findWorksheetByNameOrFirst(workbook, ['pgc', 'PGC', 'cuentas_pyme', 'cuentas_balance', 'pgc_pyme']);
  if (!bizmotionWs) {
    console.error('No pude encontrar hoja Bizmotion (p.ej. plan).');
    process.exit(1);
  }
  if (!pgcWs) {
    console.error('No pude encontrar hoja PGC (p.ej. pgc).');
    process.exit(1);
  }

  const parsedPgc = parsePgcSheet(pgcWs);
  const pgcAccounts = parsedPgc.accounts;
  const bizmotionAccounts = parseBizmotionSheet(bizmotionWs, parsedPgc.codes);
  const accounts = [...bizmotionAccounts, ...pgcAccounts];

  accounts.sort((a, b) => String(a.id).localeCompare(String(b.id), 'es', { numeric: true }));

  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, `${JSON.stringify(accounts, null, 2)}\n`, 'utf8');
  console.log(`OK: ${path.relative(repoRoot, outPath)} (cuentas: ${accounts.length})`);
  console.log(`Fuente: ${path.relative(repoRoot, excelPath)}`);
  console.log(`Hoja Bizmotion: ${bizmotionWs.name} (cuentas: ${bizmotionAccounts.length})`);
  console.log(`Hoja PGC: ${pgcWs.name} (cuentas: ${pgcAccounts.length})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
