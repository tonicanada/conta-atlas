// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const { themes: prismThemes } = require('prism-react-renderer');
const lightCodeTheme = prismThemes.github;
const darkCodeTheme = prismThemes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Conta-Atlas',
  tagline: 'Atlas práctico de contabilidad internacional',
  favicon: 'img/favicon.svg',

  url: 'https://conta-atlas.bizmotion.io',
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
          { to: '/es', label: '🇪🇸 ES', position: 'left' },
          {
            type: 'html',
            position: 'right',
            value: `
              <a
                href="https://bizmotion.io"
                target="_blank"
                rel="noopener noreferrer"
                class="navbar__bizmotion-link"
                aria-label="Powered by Bizmotion"
                title="Powered by Bizmotion"
              >
                <img
                  src="/img/bizmotion_logo.png"
                  alt="Bizmotion"
                  class="navbar__bizmotion-logo"
                />
                <span class="navbar__bizmotion-text">Powered by Bizmotion</span>
              </a>
            `
          }
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