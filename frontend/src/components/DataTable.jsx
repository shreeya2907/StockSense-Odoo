import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

export default function DataTable({
  columns,
  data,
  loading = false,
  rowClassName,
  emptyTitle = 'No data available',
  emptyDescription = 'No matching records found.',
  onRowClick,
}) {
  if (loading) {
    return (
      <div className="table-container">
        <LoadingSpinner message="Fetching records..." />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="table-container">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="table-container" style={{ overflowX: 'auto' }}>
      <table className="custom-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={col.key || idx} style={col.style}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rIdx) => {
            const rowClass = rowClassName ? rowClassName(row) : '';
            return (
              <tr
                key={row.id || rIdx}
                className={rowClass}
                onClick={() => onRowClick && onRowClick(row)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((col, cIdx) => (
                  <td key={col.key || cIdx} style={col.style}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
