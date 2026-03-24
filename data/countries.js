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
    status: 'available',
    href: '/es',
    mapSelector: '#ES'
  },
  {
    code: 'MX',
    slug: 'mx',
    name: 'México',
    flag: '🇲🇽',
    status: 'available',
    href: '/mx',
    mapSelector: '#MX'
  },
  {
    code: 'CL',
    slug: 'chile',
    name: 'Chile',
    flag: '🇨🇱',
    status: 'inDevelopment',
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
    status: 'inDevelopment',
    mapSelector: '#BO'
  }
];

module.exports = {
  countries,
  countryStatusLabels
};
