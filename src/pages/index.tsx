import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Home(): JSX.Element {
  return (
    <Layout title="Conta-Atlas" description="Plan de cuentas SAT (MX) navegable">
      <main className="container containerMax margin-vert--lg">
        <h1>Conta-Atlas</h1>
        <p>Documentación del plan de cuentas del SAT (MX) generada desde <code>plan_sat.xlsx</code>.</p>
        <ul>
          <li>
            <Link to="/mx/plan-completo">Plan completo</Link>
          </li>
          <li>
            <Link to="/mx/esqueletos">Esqueletos</Link>
          </li>
          <li>
            <Link to="/mx/explorar">Explorar</Link>
          </li>
        </ul>
      </main>
    </Layout>
  );
}

