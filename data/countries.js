const countryStatusLabels = {
  available: 'Disponible',
  inDevelopment: 'En desarrollo',
  comingSoon: 'Próximamente'
};

const countries = [
  {
    code: 'ES',
    slug: 'es',
    name: 'España',
    flag: '🇪🇸',
    status: 'inDevelopment',
    href: '/es',
    mapSelector: '#ES'
  },
  {
    code: 'MX',
    slug: 'mx',
    name: 'México',
    flag: '🇲🇽',
    status: 'inDevelopment',
    href: '/mx',
    mapSelector: '#MX'
  },
  {
    code: 'CL',
    slug: 'chile',
    name: 'Chile',
    flag: '🇨🇱',
    status: 'comingSoon',
    mapSelector: '.Chile'
  },
  {
    code: 'AR',
    slug: 'argentina',
    name: 'Argentina',
    flag: '🇦🇷',
    status: 'comingSoon',
    mapSelector: '.Argentina'
  },
  {
    code: 'BO',
    slug: 'bolivia',
    name: 'Bolivia',
    flag: '🇧🇴',
    status: 'comingSoon',
    mapSelector: '#BO'
  }
];

module.exports = {
  countries,
  countryStatusLabels
};
