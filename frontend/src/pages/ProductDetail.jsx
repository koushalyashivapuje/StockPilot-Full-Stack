import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useWorkspace } from '../context/WorkspaceContext'
import { productApi, inventoryApi } from '../api/products'
import { Spinner, ErrorBanner, EmptyState, SuccessToast } from '../components/UiStates'
import { StockBadge } from '../components/StatusBadge'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { formatMoney, formatDateTime } from '../utils/format'

const ADJUSTMENT_TYPES = ['RECEIVED_STOCK', 'MANUAL_COUNT_CORRECTION', 'DAMAGED_GOODS', 'RETURNED_TO_SUPPLIER', 'OTHER']

export default function ProductDetail() {
  const { workspaceId } = useWorkspace()
  const { productId } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [adjustForm, setAdjustForm] = useState({ direction: 'add', quantity: '', adjustmentType: 'RECEIVED_STOCK', reason: '' })
  const [adjustError, setAdjustError] = useState('')
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  const load = useCallback(() => {
    if (!workspaceId) return
    setLoading(true)
    setError('')
    Promise.all([
      productApi.get(workspaceId, productId),
      inventoryApi.history(workspaceId, { productId, page: 0, size: 10 }),
    ])
      .then(([p, h]) => {
        setProduct(p)
        setHistory(h)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [workspaceId, productId])

  useEffect(() => {
    load()
  }, [load])

  async function handleAdjust(e) {
    e.preventDefault()
    setAdjustError('')
    setSuccess('')
    const qty = Number(adjustForm.quantity)
    if (!qty || qty <= 0) {
      setAdjustError('Enter a quantity greater than zero.')
      return
    }
    const signedQuantity = adjustForm.direction === 'add' ? qty : -qty

    setSubmittingAdjustment(true)
    try {
      await inventoryApi.adjust(workspaceId, productId, {
        quantityChange: signedQuantity,
        adjustmentType: adjustForm.adjustmentType,
        reason: adjustForm.reason || null,
      })
      setSuccess('Stock adjustment recorded.')
      setAdjustForm({ direction: 'add', quantity: '', adjustmentType: 'RECEIVED_STOCK', reason: '' })
      load()
    } catch (err) {
      setAdjustError(err.message)
    } finally {
      setSubmittingAdjustment(false)
    }
  }

  async function handleDeactivate() {
    setDeactivating(true)
    try {
      await productApi.deactivate(workspaceId, productId)
      setConfirmDeactivate(false)
      load()
    } catch (err) {
      setError(err.message)
      setConfirmDeactivate(false)
    } finally {
      setDeactivating(false)
    }
  }

  if (loading) return <Spinner />
  if (error && !product) return <ErrorBanner message={error} onRetry={load} />
  if (!product) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{product.name}</h1>
          <p className="text-sm text-slate-500">SKU {product.sku}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/products/${productId}/edit`} className="btn-secondary">Edit</Link>
          {product.active && (
            <button className="btn-danger" onClick={() => setConfirmDeactivate(true)}>
              Deactivate
            </button>
          )}
        </div>
      </div>

      {success && <SuccessToast message={success} />}
      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card">
          <p className="text-sm text-slate-500">Status</p>
          <div className="mt-1"><StockBadge active={product.active} lowStock={product.lowStock} /></div>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Unit price</p>
          <p className="mt-1 text-lg font-semibold">{formatMoney(product.unitPrice)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Current stock</p>
          <p className="mt-1 text-lg font-semibold">{product.stockQuantity}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Low-stock threshold</p>
          <p className="mt-1 text-lg font-semibold">{product.lowStockThreshold}</p>
        </div>
      </div>

      {product.description && (
        <div className="card">
          <p className="text-sm font-medium text-slate-700">Description</p>
          <p className="mt-1 text-sm text-slate-600">{product.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-semibold text-slate-900">Adjust stock</h2>
          <form onSubmit={handleAdjust} className="space-y-3">
            {adjustError && <ErrorBanner message={adjustError} />}
            <div className="flex gap-2">
              <select className="input !w-auto" value={adjustForm.direction}
                onChange={(e) => setAdjustForm({ ...adjustForm, direction: e.target.value })}>
                <option value="add">Add</option>
                <option value="remove">Remove</option>
              </select>
              <input type="number" min="1" step="1" className="input" placeholder="Quantity"
                value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })} />
            </div>
            <select className="input" value={adjustForm.adjustmentType}
              onChange={(e) => setAdjustForm({ ...adjustForm, adjustmentType: e.target.value })}>
              {ADJUSTMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>
              ))}
            </select>
            <input className="input" placeholder="Reason (optional)" value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} />
            <button type="submit" className="btn-primary w-full" disabled={submittingAdjustment}>
              {submittingAdjustment ? 'Recording…' : 'Record adjustment'}
            </button>
          </form>
        </section>

        <section className="card">
          <h2 className="mb-3 font-semibold text-slate-900">Adjustment history</h2>
          {!history || history.content.length === 0 ? (
            <EmptyState title="No adjustments yet" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {history.content.map((a) => (
                <li key={a.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className={a.quantityChange >= 0 ? 'font-medium text-green-600' : 'font-medium text-red-600'}>
                      {a.quantityChange >= 0 ? '+' : ''}{a.quantityChange}
                    </span>
                    <span className="text-slate-500">→ {a.resultingQuantity} in stock</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(a.createdAt)} · {a.performedByName} · {a.adjustmentType.replaceAll('_', ' ')}
                  </p>
                  {a.reason && <p className="text-xs text-slate-500">"{a.reason}"</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmDeactivate}
        title="Deactivate this product?"
        description="It will no longer be available for new orders. Existing orders keep their historical details."
        confirmLabel="Deactivate"
        danger
        busy={deactivating}
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmDeactivate(false)}
      />
    </div>
  )
}
