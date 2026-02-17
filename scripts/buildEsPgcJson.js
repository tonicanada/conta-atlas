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

function parseNameAndSortKey(accountNameRaw) {
  const raw = String(accountNameRaw || '').trim();
  if (!raw) return { name: '', bizmotion_sort_key: null };

  // Pattern: "1.A.1.11.206 - Inmovilizado intangible"
  const m = raw.match(/^\s*([0-9]+(?:\.[A-Za-z0-9]+)+)\s*[-–—]\s*(.+)\s*$/);
  if (m) return { name: cleanName(m[2]), bizmotion_sort_key: m[1] };

  return { name: cleanName(raw), bizmotion_sort_key: null };
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

function findColIndex(headerNorm, includesAny) {
  for (const inc of includesAny) {
    const idx = headerNorm.findIndex((h) => h.includes(inc));
    if (idx !== -1) return idx + 1; // exceljs is 1-based for getCell()
  }
  return 0;
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
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    console.error('El Excel no contiene hojas.');
    process.exit(1);
  }

  const headerRow = worksheet.getRow(1);
  const headerValues = Array.isArray(headerRow.values) ? headerRow.values : [];
  const header = headerValues.slice(1).map((h) => (h == null ? '' : String(h)));
  const headerNorm = header.map(stripAccents);

  const nameIdx = findColIndex(headerNorm, ['account name', 'nombre', 'name', 'cuenta']);
  const codeIdx = findColIndex(headerNorm, ['account number', 'codigo', 'code', 'numero', 'número', 'number']);
  const parentCodeIdx = findColIndex(headerNorm, ['parent account number', 'parent code', 'codigo padre', 'parent number']);
  const parentNameIdx = findColIndex(headerNorm, ['parent account', 'cuenta padre', 'parent name']);
  const isGroupIdx = findColIndex(headerNorm, ['is group', 'grupo', 'group']);

  if (!nameIdx) {
    console.error('No pude detectar la columna de nombre de cuenta en el Excel.');
    console.error('Header:', header);
    process.exit(1);
  }

  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const rawName = cellToPrimitive(row.getCell(nameIdx).value);
    const rawCode = codeIdx ? cellToPrimitive(row.getCell(codeIdx).value) : null;
    const rawParentCode = parentCodeIdx ? cellToPrimitive(row.getCell(parentCodeIdx).value) : null;
    const rawParentName = parentNameIdx ? cellToPrimitive(row.getCell(parentNameIdx).value) : null;
    const rawIsGroup = isGroupIdx ? cellToPrimitive(row.getCell(isGroupIdx).value) : null;

    const { name, bizmotion_sort_key } = parseNameAndSortKey(rawName);
    const code_pgc = formatCode(rawCode);
    const parent_code_pgc = formatCode(rawParentCode);
    const parent_name = rawParentName == null ? null : cleanName(rawParentName);

    if (!name && !code_pgc && !bizmotion_sort_key) return;

    rows.push({
      rowNumber,
      name,
      name_norm: stripAccents(name),
      code_pgc,
      parent_code_pgc,
      parent_name,
      parent_name_norm: parent_name ? stripAccents(parent_name) : null,
      is_group_raw: rawIsGroup,
      bizmotion_sort_key,
      bizmotion_class: inferBizmotionClass(bizmotion_sort_key),
      pgc_group: inferPgcGroup(code_pgc),
      pgc_sort_key: code_pgc ? String(code_pgc) : null
    });
  });

  // Build stable IDs.
  const accounts = rows.map((r) => {
    const id = r.code_pgc || r.bizmotion_sort_key || `row_${r.rowNumber}`;
    return {
      id,
      name: r.name,
      is_group: null,
      parent_id: null,
      bizmotion_class: r.bizmotion_class,
      bizmotion_sort_key: r.bizmotion_sort_key,
      pgc_group: r.pgc_group,
      pgc_sort_key: r.pgc_sort_key,
      code_pgc: r.code_pgc,
      code_display: r.code_pgc || null,
      _parent_code_pgc: r.parent_code_pgc,
      _parent_name_norm: r.parent_name_norm
    };
  });

  const byId = new Map(accounts.map((a) => [a.id, a]));
  const byCodePgc = new Map();
  const byNameNorm = new Map();
  const byBizmotionSortKey = new Map();

  for (const a of accounts) {
    if (a.code_pgc && !byCodePgc.has(a.code_pgc)) byCodePgc.set(a.code_pgc, a);
    if (a.name) {
      const n = stripAccents(a.name);
      if (n && !byNameNorm.has(n)) byNameNorm.set(n, a);
    }
    if (a.bizmotion_sort_key && !byBizmotionSortKey.has(a.bizmotion_sort_key)) byBizmotionSortKey.set(a.bizmotion_sort_key, a);
  }

  for (const a of accounts) {
    let parent = null;
    if (a._parent_code_pgc && byCodePgc.has(a._parent_code_pgc)) parent = byCodePgc.get(a._parent_code_pgc);
    else if (a._parent_name_norm && byNameNorm.has(a._parent_name_norm)) parent = byNameNorm.get(a._parent_name_norm);
    else if (a.bizmotion_sort_key) {
      const parts = String(a.bizmotion_sort_key).split('.');
      if (parts.length > 1) {
        const parentKey = parts.slice(0, -1).join('.');
        if (byBizmotionSortKey.has(parentKey)) parent = byBizmotionSortKey.get(parentKey);
      }
    }
    a.parent_id = parent ? parent.id : null;
  }

  const childrenByParent = new Map();
  for (const a of accounts) {
    if (!a.parent_id) continue;
    const list = childrenByParent.get(a.parent_id) || [];
    list.push(a.id);
    childrenByParent.set(a.parent_id, list);
  }

  for (const a of accounts) {
    const hinted = truthy(a.is_group_raw);
    if (hinted !== null) a.is_group = hinted;
    else a.is_group = (childrenByParent.get(a.id) || []).length > 0;
  }

  // Remove internal fields
  for (const a of accounts) {
    delete a._parent_code_pgc;
    delete a._parent_name_norm;
    delete a.is_group_raw;
  }

  accounts.sort((a, b) => String(a.id).localeCompare(String(b.id), 'es', { numeric: true }));

  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, `${JSON.stringify(accounts, null, 2)}\n`, 'utf8');
  console.log(`OK: ${path.relative(repoRoot, outPath)} (cuentas: ${accounts.length})`);
  console.log(`Fuente: ${path.relative(repoRoot, excelPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

