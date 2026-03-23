import React from 'react';
import Layout from '@theme/Layout';
import { useHistory } from '@docusaurus/router';

const countryMeta = {
  ES: { name: 'España', status: 'En desarrollo' },
  MX: { name: 'México', status: 'En desarrollo' },
  Chile: { name: 'Chile', status: 'En desarrollo' },
  BO: { name: 'Bolivia', status: 'En desarrollo' }
} as const;

type CountryKey = keyof typeof countryMeta;

type HoveredCountry = {
  key: CountryKey;
  x: number;
  y: number;
};

const agencyLogoByCountry = {
  es: '/img/logos_hacienda/aeat.svg',
  bo: '/img/logos_hacienda/sin.png',
  cl: '/img/logos_hacienda/sii.svg',
  mx: '/img/logos_hacienda/sat.svg'
} as const;

const glossaryRows = [
  {
    concept: 'Agencia tributaria',
    bo: 'SIN',
    cl: 'SII',
    es: 'AEAT',
    mx: 'SAT'
  },
  {
    concept: 'Identificación fiscal',
    bo: 'NIT',
    cl: 'RUT',
    es: 'NIF',
    mx: 'RFC'
  },
  {
    concept: 'Factura electrónica',
    bo: 'Factura electrónica',
    cl: 'DTE',
    es: 'Factura electrónica / Veri*Factu',
    mx: 'CFDI'
  },
  {
    concept: 'Declaración mensual',
    bo: 'Formularios periódicos',
    cl: 'F29',
    es: 'Modelo 303 y otros',
    mx: 'Declaraciones SAT'
  },
  {
    concept: 'Retenciones',
    bo: 'RC-IVA / retenciones',
    cl: 'Retenciones',
    es: 'IRPF / retenciones',
    mx: 'ISR / retenciones'
  },
  {
    concept: 'Nómina',
    bo: 'Planilla',
    cl: 'Liquidación de sueldo',
    es: 'Nómina',
    mx: 'Nómina'
  },
  {
    concept: 'Seguridad social',
    bo: 'Caja / AFP',
    cl: 'AFP / Salud / AFC',
    es: 'Seguridad Social',
    mx: 'IMSS / INFONAVIT'
  },
  {
    concept: 'Certificado digital',
    bo: 'Firma digital',
    cl: 'Certificado digital',
    es: 'Certificado electrónico',
    mx: 'e.firma / CSD'
  },
  {
    concept: 'Portal tributario',
    bo: 'Oficina Virtual SIN',
    cl: 'Portal SII',
    es: 'Sede AEAT',
    mx: 'Portal SAT'
  },
  {
    concept: 'Plan de cuentas',
    bo: 'Plan de cuentas',
    cl: 'Plan de cuentas',
    es: 'PGC',
    mx: 'Catálogo de cuentas'
  }
] as const;

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
    const country = target?.closest('#ES, #MX, #BO, .Chile');

    if (!country) {
      return null;
    }

    if (country.id === 'ES' || country.id === 'MX' || country.id === 'BO') {
      return country.id;
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
        aria-label="Mapa del atlas contable con países en desarrollo."
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
        <span><i className="atlasHeroMap__legendDot atlasHeroMap__legendDot--soon" />En desarrollo</span>
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
                  <li>España, México, Chile y Bolivia están en desarrollo.</li>
                  <li>El mapa muestra el estado actual de avance por país.</li>
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

        <section className="homeSection">
          <div className="container containerMax">
            <div className="homeSection__header">
              <p className="homeEyebrow">Glosario</p>
              <h2>Equivalencias rápidas entre países</h2>
              <p>
                Este resumen permite ubicar de un vistazo cómo cambia el nombre de conceptos
                tributarios y contables entre Bolivia, Chile, España y México.
              </p>
            </div>
            <div className="homeGlossaryTableWrap">
              <table className="homeGlossaryTable">
                <thead>
                  <tr>
                    <th scope="col">Concepto</th>
                    <th scope="col">ES</th>
                    <th scope="col">BO</th>
                    <th scope="col">CL</th>
                    <th scope="col">MX</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="homeGlossaryTable__logoRow">
                    <th scope="row">Logo agencia</th>
                    <td>
                      <img src={agencyLogoByCountry.es} alt="Logo AEAT (España)" className="homeGlossaryLogo" loading="lazy" />
                    </td>
                    <td>
                      <img src={agencyLogoByCountry.bo} alt="Logo SIN (Bolivia)" className="homeGlossaryLogo" loading="lazy" />
                    </td>
                    <td>
                      <img src={agencyLogoByCountry.cl} alt="Logo SII (Chile)" className="homeGlossaryLogo" loading="lazy" />
                    </td>
                    <td>
                      <img src={agencyLogoByCountry.mx} alt="Logo SAT (México)" className="homeGlossaryLogo" loading="lazy" />
                    </td>
                  </tr>

                  {glossaryRows.map((row) => (
                    <tr key={row.concept}>
                      <th scope="row">{row.concept}</th>
                      <td>{row.es}</td>
                      <td>{row.bo}</td>
                      <td>{row.cl}</td>
                      <td>{row.mx}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="homeSection homeSection--alt">
          <div className="container containerMax">
            <div className="homeSection__header">
              <p className="homeEyebrow">Expansión</p>
              <h2>Estado actual del atlas por país</h2>
              <p>
                Los cuatro países visibles del mapa están actualmente en desarrollo.
                La prioridad es madurar contenido, equivalencias y mapeos comunes antes
                de marcar disponibilidad pública por país.
              </p>
            </div>

            <div className="homeGrid homeGrid--4">
              <article className="homeCountryCard">
                <h3>España</h3>
                <p>En desarrollo.</p>
              </article>
              <article className="homeCountryCard">
                <h3>México</h3>
                <p>En desarrollo.</p>
              </article>
              <article className="homeCountryCard">
                <h3>Chile</h3>
                <p>En desarrollo.</p>
              </article>
              <article className="homeCountryCard">
                <h3>Bolivia</h3>
                <p>En desarrollo.</p>
              </article>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}

