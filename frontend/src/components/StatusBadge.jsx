const ORDER_STYLES = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-slate-200 text-slate-600',
}

export function OrderStatusBadge({ status }) {
  return <span className={`badge ${ORDER_STYLES[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>
}

export function StockBadge({ active, lowStock }) {
  if (!active) {
    return <span className="badge bg-slate-200 text-slate-600">Inactive</span>
  }
  if (lowStock) {
    return <span className="badge bg-red-100 text-red-700">Low stock</span>
  }
  return <span className="badge bg-green-100 text-green-700">In stock</span>
}
