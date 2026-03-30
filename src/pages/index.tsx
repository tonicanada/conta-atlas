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
  const hoverRafRef = React.useRef<number | null>(null);
  const pendingHoverRef = React.useRef<HoveredCountry | null>(null);
  const renderedHoverRef = React.useRef<HoveredCountry | null>(null);

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

  React.useEffect(() => {
    return () => {
      if (hoverRafRef.current !== null) {
        window.cancelAnimationFrame(hoverRafRef.current);
      }
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
      const isNavigable =
        (country.status === 'available' || country.status === 'inDevelopment') &&
        Boolean(country.href);
      if (isNavigable && event.target.closest(country.mapSelector)) {
        history.push(country.href as string);
        return;
      }
    }
  };

  const flushHoverUpdate = React.useCallback((): void => {
    hoverRafRef.current = null;
    const next = pendingHoverRef.current;
    const prev = renderedHoverRef.current;

    if (!next && !prev) {
      return;
    }

    if (
      next &&
      prev &&
      next.country.code === prev.country.code &&
      Math.abs(next.x - prev.x) < 2 &&
      Math.abs(next.y - prev.y) < 2
    ) {
      return;
    }

    renderedHoverRef.current = next;
    setHoveredCountry(next);
  }, []);

  const scheduleHoverUpdate = React.useCallback(
    (next: HoveredCountry | null): void => {
      pendingHoverRef.current = next;
      if (hoverRafRef.current !== null) {
        return;
      }
      hoverRafRef.current = window.requestAnimationFrame(flushHoverUpdate);
    },
    [flushHoverUpdate]
  );

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!(event.target instanceof Element)) {
      scheduleHoverUpdate(null);
      return;
    }

    const country = getCountryFromTarget(event.target);

    if (!country) {
      scheduleHoverUpdate(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    scheduleHoverUpdate({
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
      onMouseLeave={() => {
        pendingHoverRef.current = null;
        renderedHoverRef.current = null;
        if (hoverRafRef.current !== null) {
          window.cancelAnimationFrame(hoverRafRef.current);
          hoverRafRef.current = null;
        }
        setHoveredCountry(null);
      }}
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
