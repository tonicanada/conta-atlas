/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

let ExcelJS = null;
let XLSX = null;
try {
  // Prefer ExcelJS to avoid known xlsx audit advisories (no fix available as of npm audit output).
  // If ExcelJS is not installed yet, fall back to xlsx for compatibility.
  // eslint-disable-next-line global-require
  ExcelJS = require('exceljs');
} catch {
  // ignore
}
try {
  // eslint-disable-next-line global-require
  XLSX = require('xlsx');
} catch {
  // ignore
}

function stripAccents(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function formatCode(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.includes('.')) {
      const [intPart, fracPartRaw] = trimmed.split('.');
      const fracPart = (fracPartRaw || '').padEnd(2, '0').slice(0, 2);
      return `${String(parseInt(intPart, 10))}.${fracPart}`;
    }
    return String(parseInt(trimmed, 10));
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const scaled = Math.round(value * 100);
    const intPart = Math.trunc(scaled / 100);
    const frac = Math.abs(scaled % 100);
    if (frac === 0) return String(intPart);
    return `${intPart}.${String(frac).padStart(2, '0')}`;
  }

  return String(value);
}

function isTopLevel(code) {
  if (code === '0') return true;
  return !code.includes('.') && code.endsWith('00');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
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

function parseWithXlsx(excelPath) {
  const workbook = XLSX.readFile(excelPath, { cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: null });

  if (!rows.length) {
    console.error('El Excel no contiene filas.');
    process.exit(1);
  }

  const header = rows[0].map((h) => (h == null ? '' : String(h)));
  const headerNorm = header.map(stripAccents);

  const codeIdx = headerNorm.findIndex((h) => h.includes('codigo'));
  const nameIdx = headerNorm.findIndex((h) => h.includes('nombre'));
  if (codeIdx === -1 || nameIdx === -1) {
    console.error('No se detectaron columnas de código/nombre en el Excel.');
    console.error('Header:', header);
    process.exit(1);
  }

  const accounts = [];
  let currentTopCode = null;
  let currentSectionCode = null;

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;

    const rawCode = row[codeIdx];
    const rawName = row[nameIdx];

    const code = formatCode(rawCode);
    const name = rawName == null ? null : String(rawName).trim();

    if (!code || !name) continue;

    let parent_code = null;
    if (isTopLevel(code)) {
      parent_code = null;
      currentTopCode = code;
      currentSectionCode = null;
    } else if (code.includes('.') && currentTopCode && code.split('.')[0] === currentTopCode) {
      parent_code = currentTopCode;
      currentSectionCode = code;
    } else if (code.includes('.')) {
      parent_code = code.split('.')[0];
    } else {
      parent_code = currentSectionCode || currentTopCode || null;
    }

    accounts.push({
      code,
      name,
      parent_code,
      level: 0,
      tags: [],
      type: 'leaf'
    });
  }

  return accounts;
}

async function parseWithExceljs(excelPath) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(excelPath);
  } catch (err) {
    console.error('Error leyendo Excel:', err);
    process.exit(1);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    console.error('El Excel no contiene hojas.');
    process.exit(1);
  }

  const headerRow = worksheet.getRow(1);
  const headerValues = Array.isArray(headerRow.values) ? headerRow.values : [];
  const header = headerValues.slice(1).map((h) => (h == null ? '' : String(h)));
  const headerNorm = header.map(stripAccents);

  const codeIdx = headerNorm.findIndex((h) => h.includes('codigo')) + 1;
  const nameIdx = headerNorm.findIndex((h) => h.includes('nombre')) + 1;
  if (codeIdx <= 0 || nameIdx <= 0) {
    console.error('No se detectaron columnas de código/nombre en el Excel.');
    console.error('Header:', header);
    process.exit(1);
  }

  const accounts = [];
  let currentTopCode = null;
  let currentSectionCode = null;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const rawCode = cellToPrimitive(row.getCell(codeIdx).value);
    const rawName = cellToPrimitive(row.getCell(nameIdx).value);

    const code = formatCode(rawCode);
    const name = rawName == null ? null : String(rawName).trim();

    if (!code || !name) return;

    let parent_code = null;
    if (isTopLevel(code)) {
      parent_code = null;
      currentTopCode = code;
      currentSectionCode = null;
    } else if (code.includes('.') && currentTopCode && code.split('.')[0] === currentTopCode) {
      parent_code = currentTopCode;
      currentSectionCode = code;
    } else if (code.includes('.')) {
      parent_code = code.split('.')[0];
    } else {
      parent_code = currentSectionCode || currentTopCode || null;
    }

    accounts.push({
      code,
      name,
      parent_code,
      level: 0,
      tags: [],
      type: 'leaf'
    });
  });

  return accounts;
}

async function main() {
  const repoRoot = path.join(__dirname, '..');
  const excelPath = path.join(repoRoot, 'excels', 'mx', 'plan_sat.xlsx');
  const outDir = path.join(repoRoot, 'data', 'mx');
  const outPath = path.join(outDir, 'sat_accounts.json');

  if (!fs.existsSync(excelPath)) {
    console.error(`No se encontró el Excel: ${excelPath}`);
    process.exit(1);
  }

  if (!ExcelJS && !XLSX) {
    console.error('Falta dependencia para leer Excel: instala `exceljs` (recomendado) o `xlsx`.');
    process.exit(1);
  }

  const accounts = ExcelJS ? await parseWithExceljs(excelPath) : parseWithXlsx(excelPath);
  if (!ExcelJS && XLSX) {
    console.warn('Aviso: usando `xlsx` como fallback; `npm audit` reporta advisories sin fix disponible.');
  }

  const byCode = new Map(accounts.map((a) => [a.code, a]));
  const childCount = new Map();
  for (const a of accounts) {
    if (!a.parent_code) continue;
    childCount.set(a.parent_code, (childCount.get(a.parent_code) || 0) + 1);
  }

  const levelMemo = new Map();
  function computeLevel(code, visiting = new Set()) {
    if (levelMemo.has(code)) return levelMemo.get(code);
    const a = byCode.get(code);
    if (!a || !a.parent_code || !byCode.has(a.parent_code)) {
      levelMemo.set(code, 1);
      return 1;
    }
    if (visiting.has(code)) {
      levelMemo.set(code, 1);
      return 1;
    }
    visiting.add(code);
    const result = computeLevel(a.parent_code, visiting) + 1;
    visiting.delete(code);
    levelMemo.set(code, result);
    return result;
  }

  for (const a of accounts) {
    a.level = computeLevel(a.code);
    a.type = (childCount.get(a.code) || 0) > 0 ? 'group' : 'leaf';
  }

  ensureDir(outDir);
  fs.writeFileSync(outPath, `${JSON.stringify(accounts, null, 2)}\n`, 'utf8');
  console.log(`OK: ${path.relative(repoRoot, outPath)} (${accounts.length} cuentas)`);
}

main();
