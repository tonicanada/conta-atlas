/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  esSidebar: [
    {
      type: 'category',
      label: 'ES',
      items: [
        { type: 'doc', id: 'plan-completo-bizmotion', label: 'Plan completo (Balance/PyG)' },
        { type: 'doc', id: 'plan-completo-pgc', label: 'Plan completo (PGC oficial)' },
        {
          type: 'category',
          label: 'Esqueletos',
          link: { type: 'doc', id: 'esqueletos/index' },
          items: [{ type: 'doc', id: 'esqueletos/pyme_basico', label: 'PYME básico' }]
        },
        { type: 'doc', id: 'glosario/index', label: 'Glosario' },
        {
          type: 'category',
          label: 'Notas',
          link: { type: 'doc', id: 'notas/index' },
          items: [
            { type: 'doc', id: 'notas/intangible-vs-material', label: 'Intangible vs material' },
            { type: 'doc', id: 'notas/amortizacion-vs-deterioro', label: 'Amortización vs deterioro' },
            {
              type: 'doc',
              id: 'notas/terrenos-sin-amortizacion-2810',
              label: 'Terrenos (sin 2810)'
            },
            {
              type: 'doc',
              id: 'notas/inversiones-inmobiliarias-vs-material',
              label: 'Inversiones inmobiliarias'
            },
            {
              type: 'doc',
              id: 'notas/inversiones-financieras-vs-intangibles',
              label: 'Inversiones financieras'
            },
            {
              type: 'doc',
              id: 'notas/empresas-del-grupo-vs-asociadas',
              label: 'Grupo vs asociadas'
            },
            {
              type: 'doc',
              id: 'notas/largo-plazo-vs-corto-plazo',
              label: 'Largo vs corto plazo'
            },
            {
              type: 'doc',
              id: 'notas/participaciones-vs-deuda-vs-creditos-cp',
              label: 'Participaciones vs deuda'
            },
            {
              type: 'doc',
              id: 'notas/entidades-credito-vinculadas-vs-leasing',
              label: 'Bancos vs leasing'
            },
            {
              type: 'doc',
              id: 'notas/deudas-entidades-credito-vs-acreedores-leasing',
              label: '2.P.1.2.1 vs 2.P.1.2.2'
            },
            {
              type: 'doc',
              id: 'notas/706-708-por-que-estan-en-grupo-7',
              label: '706/708 (grupo 7)'
            }
          ]
        }
      ]
    }
  ]
};

module.exports = sidebars;
