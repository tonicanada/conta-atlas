import React from 'react';
import Link from '@docusaurus/Link';

import { countries, countryStatusLabels } from '../data/countries';

export default function CountryCardsSection(): JSX.Element {
  return (
    <section className="homeSection homeSection--alt" id="explora-por-pais">
      <div className="container containerMax">
        <div className="homeSection__header homeSection__header--compact">
          <p className="homeEyebrow">Países</p>
          <h2>Explora por país</h2>
        </div>

        <div className="homeGrid homeGrid--4 homeCountryExplorerGrid">
          {countries.map((country) => {
            const isAvailable = country.status === 'available';

            return (
              <article className="homeCountryCard" key={country.code}>
                <h3>
                  <span className="homeCountryCard__flag" aria-hidden="true">{country.flag}</span>
                  {country.name}
                </h3>
                <p className={'homeCountryStatus homeCountryStatus--' + country.status}>
                  {countryStatusLabels[country.status]}
                </p>

                {isAvailable && country.href ? (
                  <Link to={country.href} className="homeCountryCard__link">
                    Entrar al país
                  </Link>
                ) : (
                  <span className="homeCountryCard__linkMuted">Próxima publicación</span>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
