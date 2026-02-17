/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFileIfChanged(filePath, content) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (existing === content) return;
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function writeFileIfMissing(filePath, content) {
  if (fs.existsSync(filePath)) return;
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function yamlString(value) {
  return JSON.stringify(value);
}

function cmpEs(a, b) {
  return String(a).localeCompare(String(b), 'es', { numeric: true });
}

function main() {
  const repoRoot = path.join(__dirname, '..');
  const dataPath = path.join(repoRoot, 'data', 'es', 'pgc_accounts.json');
  const docsRoot = path.join(repoRoot, 'docs', 'es');

  if (!fs.existsSync(dataPath)) {
    console.error('Falta data/es/pgc_accounts.json. Ejecuta primero: npm run build:es:data');
    process.exit(1);
  }

  const all = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const byCode = new Map();
  for (const a of all) {
    if (!a.code_pgc) continue;
    const key = String(a.code_pgc);
    const existing = byCode.get(key);
    if (!existing) {
      byCode.set(key, a);
      continue;
    }
    const existingIsPgc = String(existing.id || '').startsWith('pgc:');
    const currentIsPgc = String(a.id || '').startsWith('pgc:');
    if (!existingIsPgc && currentIsPgc) byCode.set(key, a);
  }

  const codes = Array.from(byCode.keys()).sort(cmpEs);

  const cuentasDir = path.join(docsRoot, 'cuentas');
  ensureDir(cuentasDir);

  writeFileIfChanged(
    path.join(cuentasDir, '_category_.json'),
    `${JSON.stringify({ label: 'Cuentas' }, null, 2)}\n`
  );

  writeFileIfChanged(
    path.join(cuentasDir, 'index.mdx'),
    `---\n` +
      `title: ${yamlString('Cuentas (ES)')}\n` +
      `---\n\n` +
      `Páginas individuales del plan de cuentas (ES). Generadas desde \`data/es/pgc_accounts.json\`.\n\n` +
      `Total: **${codes.length}**\n`
  );

  for (const code of codes) {
    const a = byCode.get(code);
    const titleName = a && a.name ? String(a.name) : '';
    const title = titleName ? `${code} — ${titleName}` : String(code);
    const filePath = path.join(cuentasDir, `${code}.mdx`);
    const mdx =
      `---\n` +
      `title: ${yamlString(title)}\n` +
      `slug: ${yamlString(`/cuentas/${code}`)}\n` +
      `code_pgc: ${yamlString(String(code))}\n` +
      `---\n\n` +
      `<!-- Placeholder: contenido específico de la cuenta -->\n\n` +
      `## Vistas\n\n` +
      `- [Ver en Balance/PyG](/es/plan-completo-bizmotion)\n` +
      `- [Ver en PGC oficial](/es/plan-completo-pgc)\n`;
    writeFileIfMissing(filePath, mdx);
  }

  writeFileIfChanged(
    path.join(cuentasDir, '.generated.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), cuentas: codes.length }, null, 2)}\n`
  );

  console.log(`OK: docs/es/cuentas (cuentas: ${codes.length})`);
}

main();

