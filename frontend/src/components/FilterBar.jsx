import React from 'react';
import { Search, Filter } from 'lucide-react';

export default function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  children,
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '280px' }}>
        {onSearchChange && (
          <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: '11px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px' }}
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        {filters.map((f, idx) => (
          <select
            key={idx}
            className="form-select"
            style={{ width: 'auto', minWidth: '150px' }}
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
          >
            {f.options.map((opt, oIdx) => (
              <option key={oIdx} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ))}
      </div>

      {children && <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>{children}</div>}
    </div>
  );
}
