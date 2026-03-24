const { buildCountrySidebar } = require('./sidebarsCountryCommon');

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  mxSidebar: buildCountrySidebar('México', {
    esqueletoBaseDocId: 'plan-completo/index'
  })
};

module.exports = sidebars;
