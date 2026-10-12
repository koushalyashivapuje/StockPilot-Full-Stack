import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWorkspace } from '../context/WorkspaceContext'
import { productApi } from '../api/products'
import { Spinner, ErrorBanner, EmptyState } from '../components/UiStates'
import { StockBadge } from '../components/StatusBadge'
import { formatMoney } from '../utils/format'

const PAGE_SIZE = 10

export default function ProductsList() {
  const { workspaceId } = useWorkspace()
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    if (!workspaceId) return
    setLoading(true)
    setError('')
    productApi
      .list(workspaceId, {
        q: query || undefined,
        active: activeFilter === 'all' ? undefined : activeFilter === 'active',
        lowStock: lowStockOnly || undefined,
        page,
        size: PAGE_SIZE,
      })
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [workspaceId, query, activeFilter, lowStockOnly, page])

  useEffect(() => {
    const t = setTimeout(load, 250) // light debounce for the search box
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => setPage(0), [query, activeFilter, lowStockOnly])

  if (!workspaceId) return <EmptyState title="No workspace selected" />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Products</h1>
        <Link to="/products/new" className="btn-primary">+ New product</Link>
      </div>

      <div className="card flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search name or SKU…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="input !w-auto" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}
      {loading && <Spinner />}

      {!loading && result && result.content.length === 0 && (
        <EmptyState
          title="No products found"
          description="Try a different search or filter, or create your first product."
          action={
            <Link to="/products/new" className="btn-primary mt-2">
              + New product
            </Link>
          }
        />
      )}

      {!loading && result && result.content.length > 0 && (
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.content.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/products/${p.id}`} className="font-medium text-brand-700 hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.sku}</td>
                  <td className="px-4 py-3 text-slate-600">{formatMoney(p.unitPrice)}</td>
                  <td className="px-4 py-3 text-slate-600">{p.stockQuantity}</td>
                  <td className="px-4 py-3"><StockBadge active={p.active} lowStock={p.lowStock} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>
              Page {result.page + 1} of {Math.max(result.totalPages, 1)} · {result.totalElements} total
            </span>
            <div className="flex gap-2">
              <button className="btn-secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <button className="btn-secondary" disabled={result.last} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
