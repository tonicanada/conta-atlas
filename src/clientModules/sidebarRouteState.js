import esAccounts from '@site/data/es/pgc_accounts.json';

const esBmNodes = (esAccounts || [])
  .filter((item) => String(item?.id || '').startsWith('bm:'))
  .map((item) => ({
    id: String(item.id),
    parentId: item.parent_id ? String(item.parent_id) : null,
    key: String(item.bizmotion_sort_key || item.code_display || item.id || '').replace(/^bm:/, ''),
    name: String(item.name || ''),
    code: item.code_pgc ? String(item.code_pgc) : null,
  }));

function cmpEs(a, b) {
  return String(a).localeCompare(String(b), 'es', { numeric: true });
}

const esBmNodeById = new Map(esBmNodes.map((node) => [node.id, node]));
const esBmChildrenByParentId = new Map();

for (const node of esBmNodes) {
  if (!node.parentId || !esBmNodeById.has(node.parentId)) continue;
  const list = esBmChildrenByParentId.get(node.parentId) || [];
  list.push(node);
  esBmChildrenByParentId.set(node.parentId, list);
}

for (const list of esBmChildrenByParentId.values()) {
  list.sort((a, b) => {
    const keyCmp = cmpEs(a.key, b.key);
    if (keyCmp !== 0) return keyCmp;
    return cmpEs(a.name, b.name);
  });
}

const esBmRootNodes = esBmNodes
  .filter((node) => !node.parentId || !esBmNodeById.has(node.parentId))
  .sort((a, b) => {
    const keyCmp = cmpEs(a.key, b.key);
    if (keyCmp !== 0) return keyCmp;
    return cmpEs(a.name, b.name);
  });

function isPgcRootCode(code) {
  return /^[1-7]$/.test(String(code || '').trim());
}

function slugifySegment(value) {
  const s = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return s
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

function bmNodeHref(node) {
  if (node.code && !isPgcRootCode(node.code)) return `/es/cuentas/${node.code}`;
  if (node.key) {
    const slug = slugifySegment(node.key);
    if (slug) return `/es/balance/${slug}`;
  }
  return null;
}

function bmNodeLabel(node) {
  return node.key ? `${node.key} ${node.name}`.trim() : node.name;
}

function navigateSpa(href) {
  if (typeof window === 'undefined') return;
  const url = new URL(href, window.location.origin);
  const samePath = `${url.pathname}${url.search}${url.hash}` === `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (samePath) return;
  window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function bindSpaNavigation(linkEl, href) {
  linkEl.addEventListener('click', (event) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (linkEl.getAttribute('target') === '_blank') return;
    if (typeof window === 'undefined') return;

    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return;

    event.preventDefault();
    navigateSpa(href);
  });
}

function setSidebarRouteFlags(pathname) {
  if (typeof document === 'undefined') return;
  const body = document.body;
  const isEsCuentas = /^\/es\/cuentas(?:\/|$)/.test(pathname || '');
  body.classList.toggle('route-es-cuentas', isEsCuentas);
}

function expandEsSidebarForCuentas(pathname) {
  if (typeof document === 'undefined') return;
  if (!/^\/es\/cuentas(?:\/|$)/.test(pathname || '')) return;

  const targetLink =
    document.querySelector(
      '.theme-doc-sidebar-menu .menu__link[href="/es/plan-de-cuentas/vision-general"], .theme-doc-sidebar-menu .menu__link[href="/es/plan-de-cuentas/vision-general/"]'
    ) || document.querySelector('.theme-doc-sidebar-menu .menu__link[href="/es/plan-completo-bizmotion"]');

  if (!targetLink) return;

  let current = targetLink.parentElement;
  while (current) {
    if (current.classList && current.classList.contains('menu__list-item')) {
      current.classList.remove('menu__list-item--collapsed');

      const toggle = current.querySelector(':scope > .menu__link--sublist');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');

      const sublist = current.querySelector(':scope > .menu__list');
      if (sublist) sublist.removeAttribute('hidden');
    }
    current = current.parentElement;
  }
}

function getEsAccountCodeFromPath(pathname) {
  const match = /^\/es\/cuentas\/([^/?#]+)/.exec(pathname || '');
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

function pickCurrentBmNodeByCode(code) {
  if (!code) return null;
  const matches = esBmNodes.filter((node) => node.code === code);
  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    const aEnds = a.key.endsWith(`.${code}`) ? 0 : 1;
    const bEnds = b.key.endsWith(`.${code}`) ? 0 : 1;
    if (aEnds !== bEnds) return aEnds - bEnds;

    const keyCmp = cmpEs(a.key, b.key);
    if (keyCmp !== 0) return keyCmp;
    return cmpEs(a.id, b.id);
  });

  return matches[0];
}

function buildAncestorSet(node) {
  const out = new Set();
  let current = node;
  while (current) {
    out.add(current.id);
    current = current.parentId ? esBmNodeById.get(current.parentId) || null : null;
  }
  return out;
}

function buildBmTreeNodeElement(node, openIds, currentId) {
  const children = esBmChildrenByParentId.get(node.id) || [];
  const hasChildren = children.length > 0;

  const li = document.createElement('li');
  li.className = 'account-tree-poc__node';

  const href = bmNodeHref(node);
  const linkOrLabel = href ? document.createElement('a') : document.createElement('span');
  linkOrLabel.className = 'account-tree-poc__label';
  linkOrLabel.textContent = bmNodeLabel(node);
  if (href) {
    linkOrLabel.setAttribute('href', href);
    bindSpaNavigation(linkOrLabel, href);
  }

  if (node.id === currentId) {
    li.classList.add('is-current');
    linkOrLabel.classList.add('is-current');
  } else if (openIds.has(node.id)) {
    li.classList.add('is-ancestor');
  }

  if (!hasChildren) {
    li.appendChild(linkOrLabel);
    return li;
  }

  const details = document.createElement('details');
  details.className = 'account-tree-poc__details';
  if (openIds.has(node.id)) details.setAttribute('open', '');

  const summary = document.createElement('summary');
  summary.className = 'account-tree-poc__summary';
  summary.appendChild(linkOrLabel);

  const ul = document.createElement('ul');
  ul.className = 'account-tree-poc__list';

  for (const child of children) {
    ul.appendChild(buildBmTreeNodeElement(child, openIds, currentId));
  }

  details.appendChild(summary);
  details.appendChild(ul);
  li.appendChild(details);

  return li;
}

function renderEsAccountTreePOC(pathname) {
  if (typeof document === 'undefined') return;

  const existing = document.getElementById('es-account-tree-poc');
  if (existing) existing.remove();

  if (!/^\/es\/cuentas(?:\/|$)/.test(pathname || '')) return;

  const code = getEsAccountCodeFromPath(pathname);
  if (!code) return;

  const currentNode = pickCurrentBmNodeByCode(code);
  if (!currentNode) return;

  const tocDesktop = document.querySelector('.theme-doc-toc-desktop');
  if (!tocDesktop) return;

  const openIds = buildAncestorSet(currentNode);

  const block = document.createElement('section');
  block.id = 'es-account-tree-poc';
  block.className = 'account-tree-poc';

  const title = document.createElement('h3');
  title.className = 'account-tree-poc__title';
  title.textContent = 'Esqueleto base (POC)';

  const listRoot = document.createElement('ul');
  listRoot.className = 'account-tree-poc__list account-tree-poc__list--root';

  for (const root of esBmRootNodes) {
    listRoot.appendChild(buildBmTreeNodeElement(root, openIds, currentNode.id));
  }

  block.appendChild(title);
  block.appendChild(listRoot);
  tocDesktop.prepend(block);
}

export function onRouteDidUpdate({ location }) {
  const pathname = location?.pathname || '';
  setSidebarRouteFlags(pathname);
  expandEsSidebarForCuentas(pathname);
  renderEsAccountTreePOC(pathname);
}

if (typeof window !== 'undefined') {
  const pathname = window.location?.pathname || '';
  setSidebarRouteFlags(pathname);
  expandEsSidebarForCuentas(pathname);
  renderEsAccountTreePOC(pathname);
}
