import React, { useMemo, useState } from 'react';

import accounts from '@site/data/es/pgc_accounts.json';

type BizmotionClass = 'A' | 'P' | 'E' | 'I' | 'G';

type EsAccount = {
  id: string;
  name: string;
  is_group: boolean;
  parent_id: string | null;
  bizmotion_class: BizmotionClass | null;
  bizmotion_sort_key: string | null;
  pgc_group: number | null;
  pgc_sort_key: string | null;
  code_pgc: string | null;
  code_display: string | null;
};

function cmpEs(a: string, b: string) {
  return a.localeCompare(b, 'es', { numeric: true });
}

function sortKeyForBizmotion(a: EsAccount) {
  return a.bizmotion_sort_key || '';
}

function sortKeyForPgc(a: EsAccount) {
  return a.pgc_sort_key || a.code_pgc || '';
}

function labelFor(a: EsAccount) {
  if (a.code_display) return `${a.code_display} — ${a.name}`;
  return a.name;
}

function TreeNode({
  id,
  byId,
  childrenByParent,
  orderById,
  defaultOpenLevels,
  depth
}: {
  id: string;
  byId: Map<string, EsAccount>;
  childrenByParent: Map<string, string[]>;
  orderById: (a: string, b: string) => number;
  defaultOpenLevels: number;
  depth: number;
}) {
  const account = byId.get(id);
  if (!account) return null;

  const children = (childrenByParent.get(id) || []).slice().sort(orderById);
  if (children.length === 0) {
    return <li>{labelFor(account)}</li>;
  }

  const openByDefault = depth < defaultOpenLevels;
  return (
    <li>
      <details open={openByDefault}>
        <summary>{labelFor(account)}</summary>
        <ul>
          {children.map((child) => (
            <TreeNode
              key={child}
              id={child}
              byId={byId}
              childrenByParent={childrenByParent}
              orderById={orderById}
              defaultOpenLevels={defaultOpenLevels}
              depth={depth + 1}
            />
          ))}
        </ul>
      </details>
    </li>
  );
}

function buildChildrenByParent(ids: string[], byId: Map<string, EsAccount>) {
  const out = new Map<string, string[]>();
  const idSet = new Set(ids);
  for (const id of ids) {
    const a = byId.get(id);
    if (!a || !a.parent_id) continue;
    if (!idSet.has(a.parent_id)) continue;
    const list = out.get(a.parent_id) || [];
    list.push(a.id);
    out.set(a.parent_id, list);
  }
  return out;
}

function buildRoots(ids: string[], byId: Map<string, EsAccount>) {
  const idSet = new Set(ids);
  const roots: string[] = [];
  for (const id of ids) {
    const a = byId.get(id);
    if (!a) continue;
    if (!a.parent_id || !idSet.has(a.parent_id)) roots.push(id);
  }
  return roots;
}

export default function EsPlanTree({ view }: { view: 'bizmotion' | 'pgc' }): JSX.Element {
  const rawAccounts = (accounts as EsAccount[]) || [];
  const allAccounts = useMemo(() => {
    if (view === 'bizmotion') {
      return rawAccounts.filter((a) => a.bizmotion_sort_key != null);
    }
    return rawAccounts.filter((a) => a.code_pgc != null);
  }, [rawAccounts, view]);

  const { byId } = useMemo(() => {
    const by = new Map<string, EsAccount>();
    for (const a of allAccounts) by.set(a.id, a);
    return { byId: by };
  }, [allAccounts]);

  const [defaultOpenLevels, setDefaultOpenLevels] = useState<number>(1);

  const groups = useMemo(() => {
    if (view === 'bizmotion') {
      const order: { key: BizmotionClass | 'unclassified'; label: string }[] = [
        { key: 'A', label: 'Activos' },
        { key: 'P', label: 'Pasivos' },
        { key: 'E', label: 'Equity (Patrimonio)' },
        { key: 'I', label: 'Ingresos' },
        { key: 'G', label: 'Gastos' },
        { key: 'unclassified', label: 'Sin clasificar' }
      ];

      const byGroup = new Map<string, string[]>();
      for (const a of allAccounts) {
        const k = a.bizmotion_class || 'unclassified';
        const list = byGroup.get(k) || [];
        list.push(a.id);
        byGroup.set(k, list);
      }

      return order.map(({ key, label }) => ({
        key,
        label,
        ids: (byGroup.get(key) || []).slice()
      }));
    }

    const order: { key: number | 'unclassified'; label: string }[] = [
      { key: 1, label: 'Grupo 1' },
      { key: 2, label: 'Grupo 2' },
      { key: 3, label: 'Grupo 3' },
      { key: 4, label: 'Grupo 4' },
      { key: 5, label: 'Grupo 5' },
      { key: 6, label: 'Grupo 6' },
      { key: 7, label: 'Grupo 7' },
      { key: 'unclassified', label: 'Sin clasificar' }
    ];

    const byGroup = new Map<string | number, string[]>();
    for (const a of allAccounts) {
      const k = a.pgc_group ?? 'unclassified';
      const list = byGroup.get(k) || [];
      list.push(a.id);
      byGroup.set(k, list);
    }

    return order.map(({ key, label }) => ({
      key,
      label,
      ids: (byGroup.get(key) || []).slice()
    }));
  }, [allAccounts, view]);

  if (allAccounts.length === 0) {
    return (
      <div className="alert alert--warning">
        No hay cuentas cargadas para ES. Genera <code>data/es/pgc_accounts.json</code> ejecutando{' '}
        <code>npm run build:es:data</code>.
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
      </div>

      {groups.map((g) => {
        const ids = g.ids;
        const childrenByParent = buildChildrenByParent(ids, byId);
        const roots = buildRoots(ids, byId);

        const orderById = (aId: string, bId: string) => {
          const a = byId.get(aId);
          const b = byId.get(bId);
          if (!a || !b) return cmpEs(String(aId), String(bId));

          const aKey = view === 'bizmotion' ? sortKeyForBizmotion(a) : sortKeyForPgc(a);
          const bKey = view === 'bizmotion' ? sortKeyForBizmotion(b) : sortKeyForPgc(b);

          const keyCmp = cmpEs(String(aKey), String(bKey));
          if (keyCmp !== 0) return keyCmp;

          const nameCmp = cmpEs(a.name || '', b.name || '');
          if (nameCmp !== 0) return nameCmp;

          return cmpEs(String(a.id), String(b.id));
        };

        roots.sort(orderById);

        return (
          <section key={String(g.key)} className="margin-bottom--lg">
            <h2>{g.label}</h2>
            {ids.length === 0 ? (
              <div className="alert alert--secondary">Sin cuentas en este grupo.</div>
            ) : (
              <ul>
                {roots.map((rootId) => (
                  <TreeNode
                    key={rootId}
                    id={rootId}
                    byId={byId}
                    childrenByParent={childrenByParent}
                    orderById={orderById}
                    defaultOpenLevels={defaultOpenLevels}
                    depth={0}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
