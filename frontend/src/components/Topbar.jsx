import React from 'react';
import { Bell, Search } from 'lucide-react';

export default function Topbar({ title, children }) {
  return (
    <header className="topbar">
      <div>
        <h1 className="page-title">{title}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {children}
      </div>
    </header>
  );
}
