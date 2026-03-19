import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

const sections = [
  {
    title: 'Introducción',
    description:
      'Una visión general del marco contable mexicano, su lógica y los elementos clave para orientarse.',
    to: '/mx/intro',
    cta: 'Leer introducción'
  },
  {
    title: 'Catálogo SAT',
    description:
      'Explora el catálogo de cuentas y su estructura jerárquica como referencia práctica dentro del entorno mexicano.',
    to: '/mx/catalogo',
    cta: 'Explorar catálogo'
  },
  {
    title: 'Glosario y conceptos',
    description:
      'Consulta términos frecuentes, conceptos operativos y notas para entender mejor el contexto mexicano.',
    to: '/mx/glosario',
    cta: 'Ir al glosario'
  },
  {
    title: 'ERPNext',
    description:
      'Puentes para aterrizar el marco mexicano en ERPNext: cuentas, impuestos, CFDI y criterios de implementación.',
    to: '/mx/erpnext',
    cta: 'Ver enfoque ERPNext'
  }
];

const startingPoints = [
  {
    title: 'Si vienes a entender la estructura',
    text: 'Empieza por la introducción y luego recorre el catálogo SAT para ubicar la lógica general.'
  },
  {
    title: 'Si vienes desde otro país',
    text: 'Comienza por el glosario y las notas conceptuales para traducir mejor los términos y categorías.'
  },
  {
    title: 'Si buscas aplicación práctica',
    text: 'Ve al espacio de ERPNext para aterrizar el marco mexicano en procesos reales de empresa.'
  }
];

export default function MexicoLanding(): JSX.Element {
  return (
    <Layout
      title="México | Conta-Atlas"
      description="Puerta de entrada al marco contable mexicano dentro de Conta-Atlas."
    >
      <main className={styles.countryPage}>
        <section className={`${styles.countryHero} ${styles.countryHeroMx}`}>
          <div className="container containerMax">
            <div className={styles.countryHeroContent}>
              <p className="homeEyebrow">Conta-Atlas · México</p>
              <h1>Una puerta de entrada al marco contable mexicano</h1>
              <p className={styles.countryHeroLead}>
                Esta sección reúne una visión práctica y navegable de la contabilidad en
                México: catálogo SAT, conceptos frecuentes, referencias útiles y criterios
                para llevar ese marco a una implementación real en ERPNext.
              </p>

              <div className={styles.countryHeroActions}>
                <Link className="button button--primary button--lg" to="/mx/intro">
                  Empezar por la introducción
                </Link>
                <Link className="button button--secondary button--lg" to="/global/intro">
                  Ver espacio global
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.countrySection}>
          <div className="container containerMax">
            <div className={styles.countryIntro}>
              <div className={styles.countryIntroMain}>
                <p className="homeEyebrow">Contexto</p>
                <h2>Entender México antes de entrar en el detalle</h2>
                <p>
                  La contabilidad mexicana comparte muchas bases con otros marcos
                  contables, pero tiene además un contexto normativo y operativo propio,
                  muy vinculado al SAT, al catálogo de cuentas y a la lógica documental
                  que rodea la operación empresarial.
                </p>
                <p>
                  El objetivo de esta sección no es solo mostrar un catálogo, sino ofrecer
                  una forma clara de entender cómo se organiza el marco mexicano, qué
                  particularidades conviene conocer y cómo conectar ese conocimiento con
                  una implantación práctica.
                </p>
              </div>

              <aside>
                <div className={styles.countryNote}>
                  <h3>En esta sección</h3>
                  <ul>
                    <li>Visión general del marco contable mexicano</li>
                    <li>Catálogo SAT y estructura de referencia</li>
                    <li>Terminología y conceptos frecuentes</li>
                    <li>Puentes de implementación hacia ERPNext</li>
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className={`${styles.countrySection} ${styles.countrySectionAlt}`}>
          <div className="container containerMax">
            <div className={styles.countrySectionHeader}>
              <p className="homeEyebrow">Navegación</p>
              <h2>Explora el contenido de México</h2>
              <p>
                El contenido está organizado para que puedas entrar por contexto general,
                estructura de cuentas, conceptos o implementación, según lo que necesites.
              </p>
            </div>

            <div className={styles.countryGrid2}>
              {sections.map((section) => (
                <article key={section.title} className={styles.countryCard}>
                  <h3>{section.title}</h3>
                  <p>{section.description}</p>
                  <Link to={section.to}>{section.cta}</Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.countrySection}>
          <div className="container containerMax">
            <div className={styles.countrySectionHeader}>
              <p className="homeEyebrow">Por dónde empezar</p>
              <h2>Un punto de partida según tu perfil</h2>
            </div>

            <div className={styles.countryGrid3}>
              {startingPoints.map((item) => (
                <article key={item.title} className={styles.countryMiniCard}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.countrySection} ${styles.countrySectionAlt}`}>
          <div className="container containerMax">
            <div className={styles.countrySplit}>
              <div>
                <p className="homeEyebrow">Enfoque</p>
                <h2>No es solo un catálogo: es una guía de lectura</h2>
                <p>
                  Esta landing no busca reemplazar la norma ni la asesoría profesional.
                  Su función es ordenar el marco mexicano de una forma útil para consultar,
                  comparar y aterrizar en contextos reales de empresa, cumplimiento e
                  implementación.
                </p>
              </div>

              <div className={styles.countryQuote}>
                <p>
                  Del catálogo y la lógica fiscal mexicana a una visión práctica,
                  comparada y aplicable.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.countrySection}>
          <div className="container containerMax">
            <div className={styles.countryCta}>
              <p className="homeEyebrow">Siguiente paso</p>
              <h2>Empieza por una visión general</h2>
              <p>
                Si quieres orientarte primero antes de entrar al detalle técnico, el mejor
                punto de partida es la introducción de México.
              </p>
              <Link className="button button--primary button--lg" to="/mx/intro">
                Abrir introducción de México
              </Link>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}