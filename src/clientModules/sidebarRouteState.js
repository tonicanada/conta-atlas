function setSidebarRouteFlags(pathname) {
  if (typeof document === 'undefined') return;
  const body = document.body;
  const isEsCuentas = /^\/es\/cuentas(?:\/|$)/.test(pathname || '');
  body.classList.toggle('route-es-cuentas', isEsCuentas);
}

function expandEsSidebarForCuentas(pathname) {
  if (typeof document === 'undefined') return;
  if (!/^\/es\/cuentas(?:\/|$)/.test(pathname || '')) return;

  const targetLink = document.querySelector('.theme-doc-sidebar-menu .menu__link[href="/es/plan-completo-bizmotion"]');
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

export function onRouteDidUpdate({ location }) {
  const pathname = location?.pathname || '';
  setSidebarRouteFlags(pathname);
  expandEsSidebarForCuentas(pathname);
}

if (typeof window !== 'undefined') {
  const pathname = window.location?.pathname || '';
  setSidebarRouteFlags(pathname);
  expandEsSidebarForCuentas(pathname);
}
