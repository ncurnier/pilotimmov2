import React, { useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const charges = [
  { id: 1, label: 'Electricité', amount: 100 },
  { id: 2, label: 'Eau', amount: 50 },
];

const Charges: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const exportCSV = useCallback(() => {
    const rows = [
      ['id', 'label', 'amount'],
      ...charges.map((c) => [c.id, c.label, c.amount])
    ];
    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'charges.csv');
    link.click();
  }, []);

  useEffect(() => {
    if (searchParams.get('export') === 'csv') {
      exportCSV();
      searchParams.delete('export');
      setSearchParams(searchParams, { replace: true });
    }
  }, [exportCSV, searchParams, setSearchParams]);

  return (
    <div>
      <h1>Charges</h1>
      <button onClick={exportCSV}>⬇️ Exporter CSV</button>
      <ul>
        {charges.map((c) => (
          <li key={c.id}>{c.label}: {c.amount}€</li>
        ))}
      </ul>
    </div>
  );
};

export default Charges;
