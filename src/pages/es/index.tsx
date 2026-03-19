import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

const sections = [
  {
    title: 'Plan de cuentas',
    description:
      'Explora la estructura del marco contable español, con navegación por grupos, subgrupos y cuentas.',
    to: '/es/plan-completo-bizmotion',
    cta: 'Explorar plan de cuentas'
  },
  {
    title: 'Glosario contable',
    description:
      'Consulta términos habituales del marco español y su sentido dentro de la práctica contable.',
    to: '/es/glosario',
    cta: 'Ir al glosario'
  },
  {
    title: 'Obligaciones formales',
    description:
      'Ubica modelos, libros y referencias prácticas relacionadas con el entorno contable y fiscal.',
    to: '/es/obligaciones-formales',
    cta: 'Ver obligaciones'
  },
  {
    title: 'ERPNext',
    description:
      'Aterriza el marco español en una implementación práctica: cuentas, impuestos, criterios y estructura.',
    to: '/es/erpnext',
    cta: 'Ver enfoque ERPNext'
  }
];

const startingPoints = [
  {
    title: 'Si vienes a entender la estructura contable',
    text: 'Empieza por el plan de cuentas y recorre su jerarquía general.'
  },
  {
    title: 'Si vienes desde otro país',
    text: 'Comienza por el glosario y las equivalencias conceptuales para orientarte mejor.'
  },
  {
    title: 'Si buscas aplicación práctica',
    text: 'Ve primero a la parte de ERPNext para aterrizar el marco en una operativa real.'
  }
];

export default function SpainLanding(): JSX.Element {
  return (
    <Layout
      title="España | Conta-Atlas"
      description="Puerta de entrada al marco contable español dentro de Conta-Atlas."
    >
      <main className={styles.countryPage}>
        <section className={`${styles.countryHero} ${styles.countryHeroEs}`}>
          <div className="container containerMax">
            <div className={styles.countryHeroContent}>
              <p className="homeEyebrow">Conta-Atlas · España</p>
              <h1>Una puerta de entrada al marco contable español</h1>
              <p className={styles.countryHeroLead}>
                Esta sección reúne una visión práctica y navegable de la contabilidad en
                España: estructura del Plan General de Contabilidad, conceptos clave,
                obligaciones formales y criterios útiles para llevar ese marco a ERPNext.
              </p>

              <div className={styles.countryHeroActions}>
                <Link className="button button--primary button--lg" to="/es/plan-completo-bizmotion">
                  Ir al plan de cuentas
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
                <h2>Entender España antes de entrar en el detalle</h2>
                <p>
                  La contabilidad española se articula principalmente en torno al Plan
                  General de Contabilidad y sus desarrollos. Aunque comparte muchas bases
                  con otros marcos contables, también presenta su propia terminología,
                  clasificación y lógica de presentación.
                </p>
                <p>
                  El objetivo de esta sección no es solo mostrar cuentas, sino ofrecer una
                  forma clara de entender cómo se organiza el marco español, cómo se
                  relacionan sus conceptos y cómo puede traducirse a una implantación
                  práctica.
                </p>
              </div>

              <aside>
                <div className={styles.countryNote}>
                  <h3>En esta sección</h3>
                  <ul>
                    <li>Estructura general del marco contable español</li>
                    <li>Terminología y conceptos frecuentes</li>
                    <li>Referencias prácticas y obligaciones formales</li>
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
              <h2>Explora el contenido de España</h2>
              <p>
                El contenido está organizado para que puedas entrar por estructura,
                conceptos, cumplimiento o implementación, según lo que necesites.
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
                <h2>No sustituye la norma: la hace más navegable</h2>
                <p>
                  Esta landing no pretende reemplazar la regulación oficial ni la
                  interpretación profesional. Su función es ordenar el marco español de
                  una forma útil para consultar, comparar y aterrizar en contextos reales
                  de empresa e implantación.
                </p>
              </div>

              <div className={styles.countryQuote}>
                <p>
                  Del marco contable español a una visión práctica, comparada y aplicable.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.countrySection}>
          <div className="container containerMax">
            <div className={styles.countryCta}>
              <p className="homeEyebrow">Siguiente paso</p>
              <h2>Empieza por la estructura general</h2>
              <p>
                Si quieres una primera visión concreta del marco español, el mejor punto de
                partida es el recorrido por el plan de cuentas.
              </p>
              <Link className="button button--primary button--lg" to="/es/plan-completo-bizmotion">
                Abrir plan de cuentas de España
              </Link>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}