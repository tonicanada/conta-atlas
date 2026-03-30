import React from 'react';
import Layout from '@theme/Layout';

export default function AcercaDePage(): JSX.Element {
  return (
    <Layout
      title="Acerca de"
      description="Qué es Conta-Atlas, para quién está pensado y cómo usarlo."
    >
      <main className="homePage homePage--about">
        <section className="homeSection">
          <div className="container containerMax">
            <div className="homeSection__header">
              <p className="homeEyebrow">Conta-Atlas</p>
              <h1>Acerca de</h1>
              <p>
                Conta-Atlas es una guía práctica de contabilidad por país. Su objetivo es
                ayudarte a entender diferencias reales entre marcos contables y fiscales, y
                navegar más rápido cuando trabajas en más de una jurisdicción.
              </p>
            </div>

            <div className="homeGrid homeGrid--2">
              <article className="homeCard">
                <h3>Base tecnológica</h3>
                <p>
                  Conta-Atlas usa <strong>ERPNext</strong> como base para estructurar procesos y
                  criterios operativos contables en distintos países.
                </p>
              </article>

              <article className="homeCard">
                <h3>Ecosistema</h3>
                <p>
                  Este proyecto forma parte del ecosistema de{' '}
                  <a href="https://bizmotion.io" target="_blank" rel="noopener noreferrer">
                    Bizmotion
                  </a>
                  , con apoyo de{' '}
                  <a
                    href="https://academia.bizmotion.io"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Academia Bizmotion
                  </a>{' '}
                  y de{' '}
                  <a href="https://antoniocanada.com" target="_blank" rel="noopener noreferrer">
                    Antonio Cañada
                  </a>
                  .
                </p>
              </article>

              <article className="homeCard">
                <h3>Para quién es</h3>
                <p>
                  Para equipos de finanzas y operaciones, contadores y asesores, y equipos de
                  producto que necesitan contexto claro para adaptar procesos contables entre
                  países.
                </p>
              </article>

              <article className="homeCard">
                <h3>Qué encontrarás</h3>
                <p>
                  Contenido organizado por país: plan de cuentas, impuestos, facturación,
                  operativa contable, equivalencias y notas prácticas para resolver dudas
                  frecuentes.
                </p>
              </article>

              <article className="homeCard">
                <h3>Cómo usarlo</h3>
                <p>
                  Empieza por <strong>Explorar países</strong> para ver la estructura local de
                  cada mercado y usa <strong>Equivalencias</strong> para comparar conceptos entre
                  jurisdicciones.
                </p>
              </article>

              <article className="homeCard">
                <h3>Alcance</h3>
                <p>
                  Este proyecto es una referencia educativa y operativa. No reemplaza asesoría
                  contable o fiscal profesional para casos concretos.
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
