export type CountryStatus = 'available' | 'inDevelopment' | 'comingSoon';

export type CountryDefinition = {
  code: string;
  slug: string;
  name: string;
  flag: string;
  status: CountryStatus;
  href?: string;
  mapSelector: string;
};

type CountryDataModule = {
  countries: CountryDefinition[];
  countryStatusLabels: Record<CountryStatus, string>;
};

const countryData = require('../../data/countries') as CountryDataModule;

export const countries = countryData.countries;
export const countryStatusLabels = countryData.countryStatusLabels;
