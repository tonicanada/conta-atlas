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

function yamlString(value) {
  return JSON.stringify(value);
}

function buildAccountPath(code, accountsByCode) {
  const parts = [];
  let current = accountsByCode.get(code);
  while (current) {
    parts.push(current.code);
    current = current.parent_code ? accountsByCode.get(current.parent_code) : null;
  }
  return parts.reverse();
}

function main() {
  const repoRoot = path.join(__dirname, '..');
  const dataPath = path.join(repoRoot, 'data', 'mx', 'sat_accounts.json');
  const docsRoot = path.join(repoRoot, 'docs', 'mx');

  if (!fs.existsSync(dataPath)) {
    console.error('Falta data/mx/sat_accounts.json. Ejecuta primero: npm run build:data');
    process.exit(1);
  }

  const accounts = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const accountsByCode = new Map(accounts.map((a) => [a.code, a]));

  const planDir = path.join(docsRoot, 'plan-completo');
  ensureDir(planDir);

  writeFileIfChanged(
    path.join(planDir, '_category_.json'),
    `${JSON.stringify({ label: 'Plan completo' }, null, 2)}\n`
  );

  writeFileIfChanged(
    path.join(planDir, 'index.mdx'),
    `---\n` +
      `title: ${yamlString('Plan completo')}\n` +
      `---\n\n` +
      `import AccountTree from '@site/src/components/mx/AccountTree';\n\n` +
      `Árbol del plan completo generado desde \`data/mx/sat_accounts.json\`.\n\n` +
      `<AccountTree />\n`
  );

  for (const a of accounts) {
    const parts = buildAccountPath(a.code, accountsByCode);
    const filePath = path.join(planDir, ...parts, 'index.mdx');
    const mdx =
      `---\n` +
      `title: ${yamlString(`${a.code} — ${a.name}`)}\n` +
      `code: ${yamlString(a.code)}\n` +
      `parent: ${a.parent_code ? yamlString(a.parent_code) : 'null'}\n` +
      `---\n\n` +
      `<!-- Placeholder: aquí irá contenido, ejemplos y explicaciones (IA) -->\n`;
    writeFileIfChanged(filePath, mdx);
  }

  writeFileIfChanged(
    path.join(planDir, '.generated.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), accounts: accounts.length }, null, 2)}\n`
  );

  const esqueletosDir = path.join(docsRoot, 'esqueletos');
  ensureDir(esqueletosDir);

  writeFileIfChanged(
    path.join(esqueletosDir, '_category_.json'),
    `${JSON.stringify({ label: 'Esqueletos' }, null, 2)}\n`
  );

  writeFileIfChanged(
    path.join(esqueletosDir, 'index.mdx'),
    `---\n` +
      `title: ${yamlString('Esqueletos')}\n` +
      `---\n\n` +
      `Perfiles simplificados (placeholder) generados desde \`data/mx/profiles/*.json\`.\n`
  );

  const profilesDir = path.join(repoRoot, 'data', 'mx', 'profiles');
  const profileFiles = fs.existsSync(profilesDir)
    ? fs.readdirSync(profilesDir).filter((f) => f.endsWith('.json') && f !== 'index.json')
    : [];

  for (const file of profileFiles) {
    const profile = JSON.parse(fs.readFileSync(path.join(profilesDir, file), 'utf8'));
    const profileId = profile.id;
    if (!profileId) continue;

    const profileDocsDir = path.join(esqueletosDir, profileId);
    ensureDir(profileDocsDir);
    writeFileIfChanged(
      path.join(profileDocsDir, '_category_.json'),
      `${JSON.stringify({ label: profile.title || profileId }, null, 2)}\n`
    );

    const includeRoots = Array.isArray(profile.includeRoots) ? profile.includeRoots : [];
    const includeList = includeRoots
      .map((code) => {
        const a = accountsByCode.get(code);
        const label = a ? `${a.code} — ${a.name}` : code;
        const parts = a ? buildAccountPath(a.code, accountsByCode) : [code];
        const url = `/mx/plan-completo/${parts.join('/')}`;
        return `- [${label}](${url})`;
      })
      .join('\n');

    const mdx =
      `---\n` +
      `title: ${yamlString(profile.title || profileId)}\n` +
      `---\n\n` +
      `${profile.description ? `${profile.description}\n\n` : ''}` +
      `<!-- Placeholder: este esqueleto se definirá por reglas/perfil; por ahora solo lista raíces -->\n\n` +
      `## Raíces incluidas\n\n` +
      `${includeList || '- (sin raíces configuradas)'}\n`;
    writeFileIfChanged(path.join(profileDocsDir, 'index.mdx'), mdx);
  }

  writeFileIfChanged(
    path.join(esqueletosDir, '.generated.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), profiles: profileFiles.length }, null, 2)}\n`
  );

  console.log(`OK: docs/mx/plan-completo (cuentas: ${accounts.length})`);
  console.log(`OK: docs/mx/esqueletos (perfiles: ${profileFiles.length})`);
}

main();
