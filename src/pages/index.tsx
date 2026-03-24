import React from 'react';
import Layout from '@theme/Layout';
import { useHistory } from '@docusaurus/router';

import { countries, countryStatusLabels, type CountryDefinition } from '../data/countries';

type HoveredCountry = {
  country: CountryDefinition;
  x: number;
  y: number;
};

const mapCountries = countries.filter((country) => Boolean(country.mapSelector));

function AtlasWorldMap(): JSX.Element {
  const history = useHistory();
  const [hoveredCountry, setHoveredCountry] = React.useState<HoveredCountry | null>(null);
  const [svgMarkup, setSvgMarkup] = React.useState('');

  React.useEffect(() => {
    let isMounted = true;

    fetch('/world.svg')
      .then((response) => response.text())
      .then((markup) => {
        if (isMounted) {
          setSvgMarkup(markup);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSvgMarkup('');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getCountryFromTarget = (target: Element | null): CountryDefinition | null => {
    if (!target) {
      return null;
    }

    for (const country of mapCountries) {
      if (target.closest(country.mapSelector)) {
        return country;
      }
    }

    return null;
  };

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!(event.target instanceof Element)) {
      return;
    }

    for (const country of mapCountries) {
      const isAvailable = country.status === 'available' && Boolean(country.href);
      if (isAvailable && event.target.closest(country.mapSelector)) {
        history.push(country.href as string);
        return;
      }
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!(event.target instanceof Element)) {
      setHoveredCountry(null);
      return;
    }

    const country = getCountryFromTarget(event.target);

    if (!country) {
      setHoveredCountry(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    setHoveredCountry({
      country,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    });
  };

  return (
    <div
      className="atlasHeroMap"
      onClick={handleMapClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredCountry(null)}
    >
      <div className="atlasHeroMap__veil atlasHeroMap__veil--one" />
      <div className="atlasHeroMap__veil atlasHeroMap__veil--two" />
      <div
        className="atlasHeroMap__svg"
        role="img"
        aria-label="Mapa del atlas contable con estado actual por país."
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />

      {hoveredCountry ? (
        <div
          className="atlasHeroMap__tooltip"
          style={{ left: hoveredCountry.x, top: hoveredCountry.y }}
        >
          <strong>{hoveredCountry.country.name}</strong>
          <span>{countryStatusLabels[hoveredCountry.country.status]}</span>
        </div>
      ) : null}

      <div className="atlasHeroMap__legend">
        <span><i className="atlasHeroMap__legendDot atlasHeroMap__legendDot--available" />{countryStatusLabels.available}</span>
        <span><i className="atlasHeroMap__legendDot atlasHeroMap__legendDot--development" />{countryStatusLabels.inDevelopment}</span>
        <span><i className="atlasHeroMap__legendDot atlasHeroMap__legendDot--soon" />{countryStatusLabels.comingSoon}</span>
      </div>
    </div>
  );
}

export default function Home(): JSX.Element {
  return (
    <Layout
      title="Conta-Atlas"
      description="Atlas práctico de contabilidad internacional, organizado por país y conectado con ERPNext."
    >
      <main className="homePage homePage--mapOnly">
        <section className="homeHero homeHero--mapOnly">
          <div className="container containerMax">
            <div className="homeHero__mapWrap homeHero__mapWrap--only">
              <AtlasWorldMap />
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
