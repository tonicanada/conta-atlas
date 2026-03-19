import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useHistory } from '@docusaurus/router';

const countryMeta = {
  ES: { name: 'España', status: 'Disponible', to: '/es' },
  MX: { name: 'México', status: 'Disponible', to: '/mx' },
  Argentina: { name: 'Argentina', status: 'Próximamente' },
  Chile: { name: 'Chile', status: 'Próximamente' },
  BO: { name: 'Bolivia', status: 'Próximamente' }
} as const;

type CountryKey = keyof typeof countryMeta;

type HoveredCountry = {
  key: CountryKey;
  x: number;
  y: number;
};

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

  const getCountryKey = (target: Element | null): CountryKey | null => {
    const country = target?.closest('#ES, #MX, #BO, .Argentina, .Chile');

    if (!country) {
      return null;
    }

    if (country.id === 'ES' || country.id === 'MX' || country.id === 'BO') {
      return country.id;
    }

    if (country.classList.contains('Argentina')) {
      return 'Argentina';
    }

    if (country.classList.contains('Chile')) {
      return 'Chile';
    }

    return null;
  };

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    const clickableCountry = event.target instanceof Element ? event.target.closest('#ES, #MX') : null;

    if (!clickableCountry) {
      return;
    }

    if (clickableCountry.id === 'ES') {
      history.push('/es');
      return;
    }

    if (clickableCountry.id === 'MX') {
      history.push('/mx');
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!(event.target instanceof Element)) {
      setHoveredCountry(null);
      return;
    }

    const key = getCountryKey(event.target);

    if (!key) {
      setHoveredCountry(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    setHoveredCountry({
      key,
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
        aria-label="Mapa del atlas contable con países disponibles y próximos."
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />

      {hoveredCountry ? (
        <div
          className="atlasHeroMap__tooltip"
          style={{ left: hoveredCountry.x, top: hoveredCountry.y }}
        >
          <strong>{countryMeta[hoveredCountry.key].name}</strong>
          <span>{countryMeta[hoveredCountry.key].status}</span>
        </div>
      ) : null}

      <div className="atlasHeroMap__legend">
        <span><i className="atlasHeroMap__legendDot atlasHeroMap__legendDot--active" />Disponible</span>
        <span><i className="atlasHeroMap__legendDot atlasHeroMap__legendDot--soon" />Próximamente</span>
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
      <main className="homePage">
        <section className="homeHero">
          <div className="container containerMax">
            <div className="homeHero__mapTitleWrap">
              <h2 className="homeHero__mapTitle">Explora el atlas contable</h2>
            </div>
            <div className="homeHero__mapWrap">
              <AtlasWorldMap />
            </div>

            <div className="homeHero__grid">
              <div className="homeHero__content">
                <p className="homeEyebrow">Atlas contable internacional</p>
                <h1>La contabilidad global empieza por entender cada país</h1>
                <p className="homeLead">
                  En un mundo cada vez más conectado, las relaciones comerciales cruzan
                  fronteras constantemente. Conta-Atlas ayuda a entender cómo se organiza
                  el lenguaje contable en cada país, qué bases comparten muchos marcos y
                  qué diferencias locales conviene conocer para operar mejor.
                </p>
              </div>

              <div className="homeHero__panel">
                <p className="homePanel__title">El mapa como puerta de entrada</p>
                <ul className="homePanel__list">
                  <li>España y México ya pueden explorarse desde la portada.</li>
                  <li>Argentina, Chile y Bolivia marcan la siguiente expansión visible.</li>
                  <li>La visión es crecer por país sin perder las equivalencias entre marcos contables.</li>
                  <li>Todo con foco en documentación útil, comparativa y aterrizable en ERPNext.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="homeSection">
          <div className="container containerMax">
            <div className="homeSection__header">
              <p className="homeEyebrow">Idea</p>
              <h2>No es solo documentación por país</h2>
              <p>
                Conta-Atlas quiere servir como una capa de traducción entre sistemas
                contables. No se limita a reunir información local: busca mostrar qué
                conceptos se parecen, qué cambia de una jurisdicción a otra y cómo leer
                esas diferencias con una visión comparada.
              </p>
            </div>

            <div className="homeGrid homeGrid--3">
              <article className="homeCard">
                <h3>Capa normativa</h3>
                <p>
                  Planes de cuentas, versiones simplificadas, obligaciones formales,
                  modelos y estructura contable propia de cada país.
                </p>
              </article>
              <article className="homeCard">
                <h3>Capa conceptual</h3>
                <p>
                  Glosarios, equivalencias terminológicas y paralelismos entre conceptos,
                  categorías y cuentas que a veces cambian de nombre, pero no tanto de fondo.
                </p>
              </article>
              <article className="homeCard">
                <h3>Capa operativa</h3>
                <p>
                  Criterios para mapear, configurar e implementar ese marco contable en
                  ERPNext de forma práctica y consistente.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="homeSection homeSection--alt">
          <div className="container containerMax">
            <div className="homeSection__header">
              <p className="homeEyebrow">Qué encontrarás</p>
              <h2>Una base práctica para entender, comparar e implementar</h2>
            </div>

            <div className="homeGrid homeGrid--2">
              <article className="homeFeature">
                <h3>Contenido contable</h3>
                <ul>
                  <li>Planes de cuentas oficiales o de referencia.</li>
                  <li>Versiones simplificadas cuando existan.</li>
                  <li>Glosarios y vocabulario contable por país.</li>
                  <li>Notas para distinguir conceptos próximos o fácilmente confundibles.</li>
                </ul>
              </article>
              <article className="homeFeature">
                <h3>Contenido comparativo y práctico</h3>
                <ul>
                  <li>Paralelismos entre cuentas, categorías y criterios contables.</li>
                  <li>Obligaciones y modelos frente a la administración tributaria.</li>
                  <li>Relación entre marco local, operativa real y contexto empresarial.</li>
                  <li>Puentes de implementación hacia ERPNext.</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="homeSection">
          <div className="container containerMax">
            <div className="homeSplit">
              <div>
                <p className="homeEyebrow">Enfoque</p>
                <h2>Un atlas contable comparado</h2>
                <p>
                  El valor no está solo en reunir fichas por país, sino en ordenar
                  equivalencias y diferencias de forma clara. Cuando una empresa,
                  asesoría o implementador trabaja entre varios países, necesita
                  algo más que documentos aislados: necesita contexto común y una
                  forma consistente de traducir un marco contable a otro.
                </p>
              </div>
              <div className="homeQuote">
                <p>
                  Una forma de entender lo común, reconocer lo distinto y llevarlo a la práctica.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="homeSection homeSection--alt">
          <div className="container containerMax">
            <div className="homeSection__header">
              <p className="homeEyebrow">Expansión</p>
              <h2>Un atlas en expansión, no una lista cerrada de países</h2>
              <p>
                España y México son hoy el punto de partida visible, pero el proyecto está
                pensado para crecer por Iberoamérica y reforzar progresivamente las
                equivalencias, glosarios y mapeos comunes entre distintos marcos.
              </p>
            </div>

            <div className="homeGrid homeGrid--3">
              <article className="homeCountryCard">
                <h3>España</h3>
                <p>Plan general contable, esqueletos simplificados, notas y estructura navegable.</p>
                <Link to="/es">Ir al contenido de España</Link>
              </article>
              <article className="homeCountryCard">
                <h3>México</h3>
                <p>Plan de cuentas SAT, perfiles base y exploración jerárquica del catálogo.</p>
                <Link to="/mx">Ir al contenido de México</Link>
              </article>
              <article className="homeCountryCard">
                <h3>Próximamente</h3>
                <p>Argentina, Chile y Bolivia serán los siguientes hitos visibles dentro del mapa del proyecto.</p>
                <Link to="/global/intro">Ir al espacio global</Link>
              </article>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}

