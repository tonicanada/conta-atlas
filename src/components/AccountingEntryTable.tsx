import React, { useMemo } from 'react';

type EntryRow = {
  account: string;
  debit?: number | string | null;
  credit?: number | string | null;
};

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatAmount(value: number | string | null | undefined) {
  if (value == null || value === '') return '';
  if (isNumber(value)) return value.toLocaleString('es-MX');
  return String(value);
}

export default function AccountingEntryTable({
  rows,
  title
}: {
  rows: EntryRow[];
  title?: string;
}): JSX.Element {
  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const r of rows) {
      if (isNumber(r.debit)) debit += r.debit;
      if (isNumber(r.credit)) credit += r.credit;
    }
    return { debit, credit };
  }, [rows]);

  return (
    <div className="acctEntry">
      {title ? <div className="acctEntry__title">{title}</div> : null}
      <div className="acctEntry__wrap">
        <table className="acctEntry__table">
          <thead>
            <tr>
              <th>Cuenta</th>
              <th className="acctEntry__num">Debe</th>
              <th className="acctEntry__num">Haber</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={`${idx}-${r.account}`}>
                <td className="acctEntry__account">{r.account}</td>
                <td className="acctEntry__num">{formatAmount(r.debit)}</td>
                <td className="acctEntry__num">{formatAmount(r.credit)}</td>
              </tr>
            ))}
            <tr className="acctEntry__totals">
              <td>Totales</td>
              <td className="acctEntry__num">{formatAmount(totals.debit)}</td>
              <td className="acctEntry__num">{formatAmount(totals.credit)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

