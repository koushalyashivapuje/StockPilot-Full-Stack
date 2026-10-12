import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWorkspace } from '../context/WorkspaceContext'
import { orderApi } from '../api/orders'
import { Spinner, ErrorBanner, EmptyState } from '../components/UiStates'
import { OrderStatusBadge } from '../components/StatusBadge'
import { formatMoney, formatDateTime } from '../utils/format'

const PAGE_SIZE = 10
const STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']

export default function OrdersList() {
  const { workspaceId } = useWorkspace()
  const [status, setStatus] = useState('')
  const [orderIdSearch, setOrderIdSearch] = useState('')
  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    if (!workspaceId) return
    setLoading(true)
    setError('')
    orderApi
      .list(workspaceId, { status: status || undefined, orderId: orderIdSearch || undefined, page, size: PAGE_SIZE })
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [workspaceId, status, orderIdSearch, page])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => setPage(0), [status, orderIdSearch])

  if (!workspaceId) return <EmptyState title="No workspace selected" />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Orders</h1>
        <Link to="/orders/new" className="btn-primary">+ New order</Link>
      </div>

      <div className="card flex flex-wrap items-center gap-3">
        <input className="input max-w-[160px]" placeholder="Order #"
          value={orderIdSearch} onChange={(e) => setOrderIdSearch(e.target.value)} />
        <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}
      {loading && <Spinner />}

      {!loading && result && result.content.length === 0 && (
        <EmptyState title="No orders found" action={<Link to="/orders/new" className="btn-primary mt-2">+ New order</Link>} />
      )}

      {!loading && result && result.content.length > 0 && (
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Created by</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.content.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/orders/${o.id}`} className="font-medium text-brand-700 hover:underline">
                      #{o.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(o.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{o.createdByName}</td>
                  <td className="px-4 py-3 text-slate-600">{formatMoney(o.totalAmount)}</td>
                  <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>
              Page {result.page + 1} of {Math.max(result.totalPages, 1)} · {result.totalElements} total
            </span>
            <div className="flex gap-2">
              <button className="btn-secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn-secondary" disabled={result.last} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
