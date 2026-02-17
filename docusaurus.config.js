// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const { themes: prismThemes } = require('prism-react-renderer');
const lightCodeTheme = prismThemes.github;
const darkCodeTheme = prismThemes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Conta-Atlas',
  tagline: 'Plan de cuentas (SAT) navegable',
  favicon: 'img/favicon.svg',

  url: 'https://example.com',
  baseUrl: '/',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

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

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Conta-Atlas',
        items: [
          { to: '/mx/intro', label: '🇲🇽 MX', position: 'left' },
          { to: '/es/plan-completo-bizmotion', label: '🇪🇸 ES', position: 'left' }
        ]
      },
      footer: {
        style: 'dark',
        links: [],
        copyright: `Copyright © ${new Date().getFullYear()} Conta-Atlas`
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme
      }
    })
};

module.exports = config;
