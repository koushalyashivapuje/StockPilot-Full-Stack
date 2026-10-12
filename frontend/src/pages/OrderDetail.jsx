import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from '../context/WorkspaceContext'
import { orderApi } from '../api/orders'
import { Spinner, ErrorBanner, SuccessToast } from '../components/UiStates'
import { OrderStatusBadge } from '../components/StatusBadge'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { formatMoney, formatDateTime } from '../utils/format'

const TRANSITIONS = {
  PENDING: [
    { action: 'confirm', label: 'Confirm order', style: 'btn-primary' },
    { action: 'cancel', label: 'Cancel order', style: 'btn-danger', confirm: true },
  ],
  CONFIRMED: [
    { action: 'complete', label: 'Mark completed', style: 'btn-primary' },
    { action: 'cancel', label: 'Cancel order', style: 'btn-danger', confirm: true },
  ],
  COMPLETED: [],
  CANCELLED: [],
}

export default function OrderDetail() {
  const { workspaceId } = useWorkspace()
  const { orderId } = useParams()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busyAction, setBusyAction] = useState(null)
  const [pendingConfirm, setPendingConfirm] = useState(null)

  const load = useCallback(() => {
    if (!workspaceId) return
    setLoading(true)
    setError('')
    orderApi
      .get(workspaceId, orderId)
      .then(setOrder)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [workspaceId, orderId])

  useEffect(() => {
    load()
  }, [load])

  async function runAction(action) {
    setBusyAction(action)
    setError('')
    setSuccess('')
    try {
      const fn = { confirm: orderApi.confirm, complete: orderApi.complete, cancel: orderApi.cancel }[action]
      const updated = await fn(workspaceId, orderId)
      setOrder(updated)
      setSuccess(`Order ${action === 'cancel' ? 'cancelled' : action + 'ed'}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyAction(null)
      setPendingConfirm(null)
    }
  }

  function handleActionClick(transition) {
    if (transition.confirm) {
      setPendingConfirm(transition)
    } else {
      runAction(transition.action)
    }
  }

  if (loading) return <Spinner />
  if (error && !order) return <ErrorBanner message={error} onRetry={load} />
  if (!order) return null

  const transitions = TRANSITIONS[order.status] || []

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Order #{order.id}</h1>
          <p className="text-sm text-slate-500">
            Created {formatDateTime(order.createdAt)} by {order.createdByName}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {success && <SuccessToast message={success} />}
      {error && <ErrorBanner message={error} />}

      <div className="card overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Unit price</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Line total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{item.productName}</td>
                <td className="px-4 py-3 text-slate-600">{item.sku}</td>
                <td className="px-4 py-3 text-slate-600">{formatMoney(item.unitPrice)}</td>
                <td className="px-4 py-3 text-slate-600">{item.quantity}</td>
                <td className="px-4 py-3 text-slate-600">{formatMoney(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="px-4 py-3 text-right font-medium text-slate-700" colSpan={4}>Total</td>
              <td className="px-4 py-3 font-semibold text-slate-900">{formatMoney(order.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {transitions.length > 0 && (
        <div className="flex gap-2">
          {transitions.map((t) => (
            <button
              key={t.action}
              className={t.style}
              disabled={busyAction !== null}
              onClick={() => handleActionClick(t)}
            >
              {busyAction === t.action ? 'Working…' : t.label}
            </button>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        title="Cancel this order?"
        description="Reserved stock for every line item will be restored."
        confirmLabel="Cancel order"
        danger
        busy={busyAction === 'cancel'}
        onConfirm={() => runAction('cancel')}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  )
}
