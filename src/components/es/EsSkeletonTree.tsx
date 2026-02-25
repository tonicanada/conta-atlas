import React, { useMemo, useState } from 'react';
import Link from '@docusaurus/Link';

import accounts from '@site/data/es/pgc_accounts.json';
import pymeBasico from '@site/data/es/esqueletos/pyme_basico.json';
import styles from './EsPlanTree.module.css';

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

type EsSkeletonProfile = {
  id: string;
  title?: string;
  includedBizmotionIds?: string[];
};

function cmpEs(a: string, b: string) {
  return a.localeCompare(b, 'es', { numeric: true });
}

function sortKeyForBizmotion(a: EsAccount) {
  return a.bizmotion_sort_key || '';
}

function labelFor(a: EsAccount) {
  if (a.code_display) return `${a.code_display} — ${a.name}`;
  return a.name;
}

function isPgcRootCode(code: string) {
  return /^[1-7]$/.test(String(code || '').trim());
}

function slugifyBizmotionKey(value: string) {
  const s = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return s
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

function accountHrefBizmotion(a: EsAccount) {
  if (a.code_pgc && !isPgcRootCode(a.code_pgc)) return `/es/cuentas/${a.code_pgc}`;
  if (a.bizmotion_sort_key || a.code_display) {
    const key = String(a.bizmotion_sort_key || a.code_display || '');
    const slug = slugifyBizmotionKey(key);
    if (slug) return `/es/balance/${slug}`;
  }
  return null;
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
  const href = accountHrefBizmotion(account);
  const nodeLabel = href ? <Link to={href}>{labelFor(account)}</Link> : labelFor(account);
  if (children.length === 0) {
    return <li className={styles.leaf}>{nodeLabel}</li>;
  }

  const openByDefault = depth < defaultOpenLevels;
  return (
    <li>
      <details open={openByDefault}>
        <summary>{nodeLabel}</summary>
        <ul className={styles.tree}>
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

const profiles: Record<string, EsSkeletonProfile> = {
  pyme_basico: pymeBasico as EsSkeletonProfile
};

export default function EsSkeletonTree({ profileId }: { profileId: string }): JSX.Element {
  const profile = profiles[profileId];
  const included = new Set((profile?.includedBizmotionIds || []).map(String));

  const rawAccounts = (accounts as EsAccount[]) || [];
  const selectedAccounts = useMemo(() => {
    return rawAccounts.filter((a) => String(a.id || '').startsWith('bm:') && included.has(String(a.id)));
  }, [rawAccounts, profileId]);

  const { byId, childrenByParent, roots, orderById } = useMemo(() => {
    const by = new Map<string, EsAccount>();
    for (const a of selectedAccounts) by.set(a.id, a);

    const ids = selectedAccounts.map((a) => a.id);
    const children = buildChildrenByParent(ids, by);
    const rootIds = buildRoots(ids, by);

    const orderByIdLocal = (aId: string, bId: string) => {
      const a = by.get(aId);
      const b = by.get(bId);
      if (!a || !b) return cmpEs(String(aId), String(bId));

      const keyCmp = cmpEs(String(sortKeyForBizmotion(a)), String(sortKeyForBizmotion(b)));
      if (keyCmp !== 0) return keyCmp;

      const nameCmp = cmpEs(a.name || '', b.name || '');
      if (nameCmp !== 0) return nameCmp;

      return cmpEs(String(a.id), String(b.id));
    };

    rootIds.sort(orderByIdLocal);
    for (const [parent, list] of children.entries()) {
      list.sort(orderByIdLocal);
      children.set(parent, list);
    }

    return { byId: by, childrenByParent: children, roots: rootIds, orderById: orderByIdLocal };
  }, [selectedAccounts]);

  const [defaultOpenLevels, setDefaultOpenLevels] = useState<number>(1);

  if (!profile) {
    return <div className="alert alert--warning">Esqueleto desconocido: {profileId}</div>;
  }

  if (selectedAccounts.length === 0) {
    return (
      <div className="alert alert--warning">
        No hay nodos cargados para este esqueleto. Genera <code>data/es/esqueletos/{profileId}.json</code>{' '}
        ejecutando <code>npm run build:es:data</code>.
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

      <ul className={styles.treeRoot}>
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
    </div>
  );
}

