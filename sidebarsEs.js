const { buildCountrySidebar } = require('./sidebarsCountryCommon');

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  esSidebar: buildCountrySidebar('España', {
    esqueletoBaseDocId: 'plan-completo-bizmotion'
  })
};

module.exports = sidebars;
