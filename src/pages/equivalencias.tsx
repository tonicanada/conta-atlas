import React from 'react';
import Layout from '@theme/Layout';

import { agencyLogoByCountry, glossaryRows } from '../data/glossaryEquivalences';

export default function EquivalenciasPage(): JSX.Element {
  return (
    <Layout
      title="Equivalencias"
      description="Equivalencias rápidas de conceptos tributarios y contables entre países."
    >
      <main className="homePage">
        <section className="homeSection">
          <div className="container containerMax">
            <div className="homeSection__header">
              <p className="homeEyebrow">Glosario</p>
              <h1>Equivalencias rápidas entre países</h1>
              <p>
                Comparativa rápida de conceptos tributarios y contables entre Bolivia, Chile,
                España y México.
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
      </main>
    </Layout>
  );
}
