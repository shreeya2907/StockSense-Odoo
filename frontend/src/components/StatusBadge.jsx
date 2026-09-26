import React from 'react';

export default function StatusBadge({ status, type }) {
  if (type === 'movement') {
    switch (status) {
      case 'IN':
        return <span className="badge badge-in">IN (Receipt)</span>;
      case 'OUT':
        return <span className="badge badge-out">OUT (Delivery)</span>;
      case 'TRANSFER':
        return <span className="badge badge-transfer">TRANSFER</span>;
      case 'ADJUSTMENT':
        return <span className="badge badge-adj">ADJUSTMENT</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  }

  if (type === 'stock') {
    switch (status) {
      case 'IN_STOCK':
        return <span className="badge badge-done">In Stock</span>;
      case 'LOW_STOCK':
        return <span className="badge badge-waiting">Low Stock</span>;
      case 'OUT_OF_STOCK':
        return <span className="badge badge-canceled">Out of Stock</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  }

  // Document status
  switch (status) {
    case 'DRAFT':
      return <span className="badge badge-draft">Draft</span>;
    case 'WAITING':
      return <span className="badge badge-waiting">Waiting</span>;
    case 'READY':
      return <span className="badge badge-ready">Ready</span>;
    case 'DONE':
      return <span className="badge badge-done">Done</span>;
    case 'CANCELED':
      return <span className="badge badge-canceled">Canceled</span>;
    default:
      return <span className="badge">{status}</span>;
  }
}
