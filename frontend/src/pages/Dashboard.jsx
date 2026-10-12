import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useWorkspace } from '../context/WorkspaceContext'
import { dashboardApi } from '../api/orders'
import { Spinner, ErrorBanner, EmptyState } from '../components/UiStates'
import { OrderStatusBadge } from '../components/StatusBadge'
import { formatMoney, formatDateTime } from '../utils/format'

const STATUS_ORDER = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']

function MetricCard({ label, value, hint }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { workspaceId } = useWorkspace()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    if (!workspaceId) return
    setLoading(true)
    setError('')
    dashboardApi
      .get(workspaceId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [workspaceId])

  useEffect(() => {
    load()
  }, [load])

  if (!workspaceId) {
    return <EmptyState title="No workspace selected" description="Create or join a workspace to get started." />
  }

  if (loading) return <Spinner label="Loading dashboard…" />
  if (error) return <ErrorBanner message={error} onRetry={load} />
  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Order value shown for {new Date(data.rangeFrom).toLocaleDateString()} –{' '}
          {new Date(data.rangeTo).toLocaleDateString()}, excluding cancelled orders.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Active products" value={data.activeProductCount} />
        <MetricCard label="Low stock" value={data.lowStockCount} hint="at or below threshold" />
        <MetricCard label="Total order value" value={formatMoney(data.totalOrderValue)} hint="non-cancelled" />
        <MetricCard
          label="Orders"
          value={STATUS_ORDER.reduce((sum, s) => sum + (data.orderCountsByStatus[s] || 0), 0)}
          hint="all time"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {STATUS_ORDER.map((status) => (
          <div key={status} className="card flex items-center justify-between">
            <OrderStatusBadge status={status} />
            <span className="text-lg font-semibold text-slate-900">{data.orderCountsByStatus[status] || 0}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent orders</h2>
            <Link to="/orders" className="text-sm font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" description="Orders you create will show up here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <Link to={`/orders/${o.id}`} className="font-medium text-slate-900 hover:underline">
                      Order #{o.id}
                    </Link>
                    <p className="text-xs text-slate-500">{formatDateTime(o.createdAt)} · {o.createdByName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-700">{formatMoney(o.totalAmount)}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="mb-3 font-semibold text-slate-900">Recent inventory adjustments</h2>
          {data.recentAdjustments.length === 0 ? (
            <EmptyState title="No adjustments yet" description="Stock changes you record will show up here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentAdjustments.map((a) => (
                <li key={a.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{a.productName}</span>
                    <span className={a.quantityChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {a.quantityChange >= 0 ? '+' : ''}
                      {a.quantityChange}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(a.createdAt)} · {a.performedByName} · {a.adjustmentType.replaceAll('_', ' ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
