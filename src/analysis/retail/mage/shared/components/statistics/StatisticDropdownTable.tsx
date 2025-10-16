import { ReactNode } from 'react';

interface ColumnConfig<T = unknown> {
  header: ReactNode;
  getValue: (data: T) => ReactNode;
}

interface StatisticDropdownTableProps<T = unknown> {
  columns: ColumnConfig<T>[];
  data: T[];
}

/**
 * Dropdown table component for statistics.
 * Displays tabular data in a consistent format.
 */
export default function StatisticDropdownTable<T = unknown>({
  columns,
  data,
}: StatisticDropdownTableProps<T>): JSX.Element {
  return (
    <table className="table table-condensed">
      {columns.length > 0 && (
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx}>{col.header}</th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {data.map((row, rowIdx) => (
          <tr key={rowIdx}>
            {columns.map((col, colIdx) => {
              const value = col.getValue(row);
              // First column is always a row header
              if (colIdx === 0) {
                return <th key={colIdx}>{value}</th>;
              }
              return <td key={colIdx}>{value}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
