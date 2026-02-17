/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  esSidebar: [
    {
      type: 'category',
      label: 'ES',
      items: [
        { type: 'doc', id: 'plan-completo-bizmotion', label: 'Plan completo (Balance/PyG)' },
        { type: 'doc', id: 'plan-completo-pgc', label: 'Plan completo (PGC oficial)' },
        { type: 'doc', id: 'esqueletos/index', label: 'Esqueletos' },
        { type: 'doc', id: 'glosario/index', label: 'Glosario' },
        { type: 'doc', id: 'notas/index', label: 'Notas' }
      ]
    }
  ]
};

module.exports = sidebars;

