function buildCountrySidebar(countryLabel, options = {}) {
  const esqueletoBaseDocId = options.esqueletoBaseDocId || 'plan-de-cuentas/esqueleto-base';

  return [
    {
      type: 'category',
      label: countryLabel,
      collapsible: true,
      collapsed: false,
      items: [
        { type: 'doc', id: 'intro', label: 'Introducción' },
        {
          type: 'category',
          label: 'Sistema contable',
          items: [
            { type: 'doc', id: 'sistema-contable/vision-general', label: 'Visión general' },
            { type: 'doc', id: 'sistema-contable/normativa', label: 'Normativa' },
            { type: 'doc', id: 'sistema-contable/libros-y-registros', label: 'Libros y registros' },
            { type: 'doc', id: 'sistema-contable/cierre-contable', label: 'Cierre contable' }
          ]
        },
        {
          type: 'category',
          label: 'Plan de cuentas',
          collapsible: true,
          collapsed: false,
          items: [
            { type: 'doc', id: 'plan-de-cuentas/vision-general', label: 'Visión general' },
            { type: 'doc', id: esqueletoBaseDocId, label: 'Esqueleto base' },
            { type: 'doc', id: 'plan-de-cuentas/esqueleto-pyme', label: 'Esqueleto Pyme' },
            { type: 'doc', id: 'plan-de-cuentas/esqueletos-por-sector', label: 'Esqueletos por sector' },
            { type: 'doc', id: 'plan-de-cuentas/bloques-principales', label: 'Bloques principales' }
          ]
        },
        {
          type: 'category',
          label: 'Facturación',
          items: [
            { type: 'doc', id: 'facturacion/vision-general', label: 'Visión general' },
            { type: 'doc', id: 'facturacion/factura-electronica', label: 'Factura electrónica' },
            { type: 'doc', id: 'facturacion/tipos-de-documentos', label: 'Tipos de documentos' },
            { type: 'doc', id: 'facturacion/numeracion-y-series', label: 'Numeración y series' },
            { type: 'doc', id: 'facturacion/flujo-de-emision', label: 'Flujo de emisión' }
          ]
        },
        {
          type: 'category',
          label: 'Impuestos',
          items: [
            { type: 'doc', id: 'impuestos/vision-general', label: 'Visión general' },
            { type: 'doc', id: 'impuestos/impuestos-principales', label: 'Impuestos principales' },
            { type: 'doc', id: 'impuestos/retenciones', label: 'Retenciones' },
            { type: 'doc', id: 'impuestos/modelos-formularios', label: 'Modelos / formularios' },
            { type: 'doc', id: 'impuestos/calendario-fiscal', label: 'Calendario fiscal' }
          ]
        },
        {
          type: 'category',
          label: 'Regímenes fiscales',
          items: [
            {
              type: 'doc',
              id: 'regimenes-fiscales/personas-fisicas-autonomos',
              label: 'Personas físicas / autónomos'
            },
            { type: 'doc', id: 'regimenes-fiscales/empresas', label: 'Empresas' },
            { type: 'doc', id: 'regimenes-fiscales/regimenes-especiales', label: 'Regímenes especiales' }
          ]
        },
        {
          type: 'category',
          label: 'Operativa contable',
          items: [
            { type: 'doc', id: 'operativa-contable/vision-general', label: 'Visión general' },
            { type: 'doc', id: 'operativa-contable/compras', label: 'Compras' },
            { type: 'doc', id: 'operativa-contable/ventas', label: 'Ventas' },
            { type: 'doc', id: 'operativa-contable/tesoreria', label: 'Tesorería' },
            { type: 'doc', id: 'operativa-contable/nominas', label: 'Nóminas' },
            { type: 'doc', id: 'operativa-contable/cierre-y-ajustes', label: 'Cierre y ajustes' }
          ]
        },
        {
          type: 'category',
          label: 'Recursos',
          items: [
            { type: 'doc', id: 'recursos/glosario', label: 'Glosario' },
            { type: 'doc', id: 'recursos/errores-frecuentes', label: 'Errores frecuentes' },
            { type: 'doc', id: 'recursos/proximamente', label: 'Próximamente' }
          ]
        }
      ]
    }
  ];
}

module.exports = {
  buildCountrySidebar
};
