import React, { useMemo, useState } from 'react';
import Link from '@docusaurus/Link';

import accounts from '@site/data/mx/sat_accounts.json';

type AccountType = 'leaf' | 'group';

type SatAccount = {
  code: string;
  name: string;
  level: number;
  parent_code: string | null;
  tags?: string[];
  type: AccountType;
};

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

function TreeNode({
  code,
  byCode,
  childrenByCode,
  defaultOpenLevels,
  depth
}: {
  code: string;
  byCode: Map<string, SatAccount>;
  childrenByCode: Map<string, string[]>;
  defaultOpenLevels: number;
  depth: number;
}) {
  const account = byCode.get(code);
  if (!account) return null;

  const children = childrenByCode.get(code) || [];
  const url = `/mx/plan-completo/${buildAccountPath(account.code, byCode).join('/')}`;
  const label = `${account.code} — ${account.name}`;

  if (children.length === 0) {
    return (
      <li>
        <Link to={url}>{label}</Link>
      </li>
    );
  }

  const openByDefault = depth < defaultOpenLevels;
  return (
    <li>
      <details open={openByDefault}>
        <summary>
          <Link to={url}>{label}</Link>
        </summary>
        <ul>
          {children.map((child) => (
            <TreeNode
              key={child}
              code={child}
              byCode={byCode}
              childrenByCode={childrenByCode}
              defaultOpenLevels={defaultOpenLevels}
              depth={depth + 1}
            />
          ))}
        </ul>
      </details>
    </li>
  );
}

export default function AccountTree(): JSX.Element {
  const allAccounts = (accounts as SatAccount[]) || [];

  const { byCode, childrenByCode, roots } = useMemo(() => {
    const by = new Map<string, SatAccount>();
    const children = new Map<string, string[]>();
    for (const a of allAccounts) {
      by.set(a.code, a);
      if (a.parent_code) {
        const list = children.get(a.parent_code) || [];
        list.push(a.code);
        children.set(a.parent_code, list);
      }
    }

    for (const [parent, list] of children.entries()) {
      list.sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
      children.set(parent, list);
    }

    const rootCodes = allAccounts
      .filter((a) => !a.parent_code)
      .map((a) => a.code)
      .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));

    return { byCode: by, childrenByCode: children, roots: rootCodes };
  }, [allAccounts]);

  const [defaultOpenLevels, setDefaultOpenLevels] = useState<number>(1);

  if (allAccounts.length === 0) {
    return (
      <div className="alert alert--warning">
        No hay cuentas cargadas. Ejecuta <code>npm run build:all</code>.
      </div>
    );
  }

  return (
    <div>
      <div className="row margin-bottom--md">
        <div className="col col--4">
          <label>
            Expandir niveles (por defecto)
            <select
              className="margin-top--xs"
              style={{ width: '100%' }}
              value={String(defaultOpenLevels)}
              onChange={(e) => setDefaultOpenLevels(Number(e.target.value))}
            >
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </label>
        </div>
        <div className="col col--8 margin-top--lg">
          <small>
            Tip: puedes comprimir/expandir cada nodo con el triángulo del <code>summary</code>.
          </small>
        </div>
      </div>

      <ul>
        {roots.map((root) => (
          <TreeNode
            key={root}
            code={root}
            byCode={byCode}
            childrenByCode={childrenByCode}
            defaultOpenLevels={defaultOpenLevels}
            depth={0}
          />
        ))}
      </ul>
    </div>
  );
}

