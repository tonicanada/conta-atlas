// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const { themes: prismThemes } = require('prism-react-renderer');

const { countries, countryStatusLabels } = require('./data/countries');

const lightCodeTheme = prismThemes.github;
const darkCodeTheme = prismThemes.dracula;

const countryDropdownItems = countries.map((country) => {
  const statusLabel = countryStatusLabels[country.status];
  const hasPublicContent =
    (country.status === 'available' || country.status === 'inDevelopment') &&
    Boolean(country.href);

  return {
    label: country.flag + ' ' + country.name + ' — ' + statusLabel,
    to: hasPublicContent ? country.href : '/',
    className: hasPublicContent ? 'navbar__country-item' : 'navbar__country-item navbar__country-item--pending'
  };
});

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Conta-Atlas',
  tagline: 'Atlas práctico de contabilidad internacional',
  favicon: 'img/favicon.svg',

  url: 'https://conta-atlas.bizmotion.io',
  baseUrl: '/',

  onBrokenLinks: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  i18n: {
    defaultLocale: 'es',
    locales: ['es']
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: false,
        blog: false,
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          filename: 'sitemap.xml'
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      })
    ]
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'mx',
        path: 'docs/mx',
        routeBasePath: 'mx',
        sidebarPath: require.resolve('./sidebarsMx.js')
      }
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'es',
        path: 'docs/es',
        routeBasePath: 'es',
        sidebarPath: require.resolve('./sidebarsEs.js')
      }
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'global',
        path: 'docs/global',
        routeBasePath: 'global',
        sidebarPath: require.resolve('./sidebarsGlobal.js')
      }
    ]
  ],

  clientModules: [require.resolve('./src/clientModules/sidebarRouteState.js')],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'light',
        disableSwitch: true,
        respectPrefersColorScheme: false
      },
      navbar: {
        title: 'Conta-Atlas',
        items: [
          {
            label: 'Explorar países',
            position: 'left',
            items: countryDropdownItems
          },
          { to: '/equivalencias', label: 'Equivalencias', position: 'left' },
          { to: '/acerca-de', label: 'Acerca de', position: 'right' }
        ]
      },
      footer: {
        style: 'dark',
        links: [],
        copyright: [
          '<a href="https://bizmotion.io" target="_blank" rel="noopener noreferrer" class="footer__bizmotion-link" aria-label="Powered by Bizmotion" title="Powered by Bizmotion">',
          '  <img src="/img/bizmotion_logo.png" alt="Bizmotion" class="footer__bizmotion-logo" />',
          '  <span>Powered by Bizmotion</span>',
          '</a>',
          '<span class="footer__separator" aria-hidden="true">—</span>',
          '<span>Copyright © ' + new Date().getFullYear() + ' Conta-Atlas</span>'
        ].join('')
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme
      }
    })
};

module.exports = config;
