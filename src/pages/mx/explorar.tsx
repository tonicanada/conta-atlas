import React, { useMemo, useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

import accounts from '@site/data/mx/sat_accounts.json';
import profilesIndex from '@site/data/mx/profiles/index.json';

import pymesServicios from '@site/data/mx/profiles/pymes-servicios.json';
import pymesComercial from '@site/data/mx/profiles/pymes-comercial.json';
import profesional from '@site/data/mx/profiles/profesional.json';

type AccountType = 'leaf' | 'group';

type SatAccount = {
  code: string;
  name: string;
  level: number;
  parent_code: string | null;
  tags?: string[];
  type: AccountType;
};

type Profile = {
  id: string;
  title: string;
  description?: string;
  includeRoots?: string[];
  excludeRoots?: string[];
};

const profilesById: Record<string, Profile> = {
  [pymesServicios.id]: pymesServicios,
  [pymesComercial.id]: pymesComercial,
  [profesional.id]: profesional
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function buildAccountPath(code: string, byCode: Map<string, SatAccount>) {
  const parts: string[] = [];
  let current: SatAccount | undefined = byCode.get(code);
  const visiting = new Set<string>();
  while (current && !visiting.has(current.code)) {
    visiting.add(current.code);
    parts.push(current.code);
    current = current.parent_code ? byCode.get(current.parent_code) : undefined;
  }
  return parts.reverse();
}

function buildDescendantsSet(roots: string[], childrenByCode: Map<string, string[]>) {
  const allowed = new Set<string>();
  const stack = [...roots];
  while (stack.length) {
    const code = stack.pop() as string;
    if (allowed.has(code)) continue;
    allowed.add(code);
    const children = childrenByCode.get(code) || [];
    for (const child of children) stack.push(child);
  }
  return allowed;
}

export default function ExplorarMx(): JSX.Element {
  const allAccounts = (accounts as SatAccount[]) || [];

  const { byCode, childrenByCode, levels } = useMemo(() => {
    const by = new Map<string, SatAccount>();
    const children = new Map<string, string[]>();
    const levelSet = new Set<number>();

    for (const a of allAccounts) {
      by.set(a.code, a);
      levelSet.add(a.level);
      if (a.parent_code) {
        const list = children.get(a.parent_code) || [];
        list.push(a.code);
        children.set(a.parent_code, list);
      }
    }

    for (const [k, list] of children) {
      list.sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
      children.set(k, list);
    }

    const levelsSorted = Array.from(levelSet).sort((a, b) => a - b);
    return { byCode: by, childrenByCode: children, levels: levelsSorted };
  }, [allAccounts]);

  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<number | 'all'>('all');
  const [type, setType] = useState<AccountType | 'all'>('all');
  const [profileId, setProfileId] = useState<string>('all');

  const allowedByProfile = useMemo(() => {
    if (profileId === 'all') return null;
    const profile = profilesById[profileId];
    if (!profile) return null;

    const includeRoots = profile.includeRoots || [];
    const excludeRoots = profile.excludeRoots || [];

    const included = buildDescendantsSet(includeRoots, childrenByCode);
    const excluded = buildDescendantsSet(excludeRoots, childrenByCode);
    for (const code of excluded) included.delete(code);
    return included;
  }, [childrenByCode, profileId]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return allAccounts.filter((a) => {
      if (allowedByProfile && !allowedByProfile.has(a.code)) return false;
      if (level !== 'all' && a.level !== level) return false;
      if (type !== 'all' && a.type !== type) return false;
      if (!q) return true;
      return normalize(a.code).includes(q) || normalize(a.name).includes(q);
    });
  }, [allAccounts, allowedByProfile, level, query, type]);

  return (
    <Layout title="Explorar (MX)" description="Explorar plan de cuentas SAT con filtros">
      <main className="container containerMax margin-vert--lg">
        <h1>Explorar (MX)</h1>
        <p>
          Fuente de datos: <code>data/mx/sat_accounts.json</code>
        </p>

        <div className="row margin-bottom--md">
          <div className="col col--4">
            <label>
              Búsqueda
              <input
                className="margin-top--xs"
                style={{ width: '100%' }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Código o nombre…"
              />
            </label>
          </div>

          <div className="col col--2">
            <label>
              Nivel
              <select
                className="margin-top--xs"
                style={{ width: '100%' }}
                value={String(level)}
                onChange={(e) => setLevel(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">Todos</option>
                {levels.map((l) => (
                  <option key={l} value={String(l)}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="col col--2">
            <label>
              Tipo
              <select
                className="margin-top--xs"
                style={{ width: '100%' }}
                value={type}
                onChange={(e) => setType(e.target.value as AccountType | 'all')}
              >
                <option value="all">Todos</option>
                <option value="group">Grupo</option>
                <option value="leaf">Hoja</option>
              </select>
            </label>
          </div>

          <div className="col col--4">
            <label>
              Perfil
              <select
                className="margin-top--xs"
                style={{ width: '100%' }}
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
              >
                <option value="all">Todos</option>
                {(profilesIndex as { id: string; title: string }[]).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="margin-bottom--md">
          <strong>Resultados:</strong> {filtered.length} / {allAccounts.length}
        </div>

        {allAccounts.length === 0 ? (
          <div className="alert alert--warning">
            No hay cuentas cargadas. Ejecuta <code>npm run build:all</code>.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Nivel</th>
                  <th>Tipo</th>
                  <th>Padre</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 500).map((a) => {
                  const parts = buildAccountPath(a.code, byCode);
                  const url = `/mx/plan-completo/${parts.join('/')}`;
                  return (
                    <tr key={a.code}>
                      <td>
                        <Link to={url}>{a.code}</Link>
                      </td>
                      <td>{a.name}</td>
                      <td>{a.level}</td>
                      <td>{a.type}</td>
                      <td>
                        {a.parent_code ? (
                          (() => {
                            const parentParts = buildAccountPath(a.parent_code as string, byCode);
                            const parentUrl = `/mx/plan-completo/${parentParts.join('/')}`;
                            return <Link to={parentUrl}>{a.parent_code}</Link>;
                          })()
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > 500 ? (
              <div className="margin-top--sm">
                Mostrando 500 de {filtered.length}. Ajusta filtros para reducir resultados.
              </div>
            ) : null}
          </div>
        )}
      </main>
    </Layout>
  );
}

