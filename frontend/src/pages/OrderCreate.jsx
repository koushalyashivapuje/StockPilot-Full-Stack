import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../context/WorkspaceContext'
import { productApi } from '../api/products'
import { orderApi } from '../api/orders'
import { ErrorBanner } from '../components/UiStates'
import { formatMoney } from '../utils/format'

export default function OrderCreate() {
  const { workspaceId } = useWorkspace()
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [lines, setLines] = useState([{ productId: '', quantity: 1 }])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!workspaceId) return
    productApi
      .list(workspaceId, { active: true, size: 100 })
      .then((res) => setProducts(res.content))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingProducts(false))
  }, [workspaceId])

  function updateLine(index, patch) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  function addLine() {
    setLines((prev) => [...prev, { productId: '', quantity: 1 }])
  }

  function removeLine(index) {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  function productFor(id) {
    return products.find((p) => String(p.id) === String(id))
  }

  const estimatedTotal = lines.reduce((sum, line) => {
    const p = productFor(line.productId)
    if (!p || !line.quantity) return sum
    return sum + Number(p.unitPrice) * Number(line.quantity)
  }, 0)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0)
    if (validLines.length === 0) {
      setError('Add at least one product with a quantity greater than zero.')
      return
    }

    setSubmitting(true)
    try {
      const order = await orderApi.create(workspaceId, {
        items: validLines.map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity) })),
      })
      navigate(`/orders/${order.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">New order</h1>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <ErrorBanner message={error} />}

        {!loadingProducts && products.length === 0 && (
          <p className="text-sm text-slate-500">
            No active products available. Create a product before placing an order.
          </p>
        )}

        <div className="space-y-3">
          {lines.map((line, index) => {
            const selected = productFor(line.productId)
            const overStock = selected && Number(line.quantity) > selected.stockQuantity
            return (
              <div key={index} className="flex flex-wrap items-start gap-2 rounded-lg border border-slate-200 p-3">
                <select
                  className="input flex-1 min-w-[180px]"
                  value={line.productId}
                  onChange={(e) => updateLine(index, { productId: e.target.value })}
                >
                  <option value="">Select a product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — {p.stockQuantity} in stock
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="input w-24"
                  value={line.quantity}
                  onChange={(e) => updateLine(index, { quantity: e.target.value })}
                />
                <div className="w-24 pt-2 text-right text-sm text-slate-600">
                  {selected ? formatMoney(Number(selected.unitPrice) * Number(line.quantity || 0)) : '—'}
                </div>
                <button type="button" className="btn-secondary" onClick={() => removeLine(index)}
                  disabled={lines.length === 1}>
                  Remove
                </button>
                {overStock && (
                  <p className="w-full text-xs text-red-600">
                    Only {selected.stockQuantity} in stock — the server will reject this if it's still over when you submit.
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <button type="button" className="btn-secondary" onClick={addLine}>+ Add another product</button>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-sm text-slate-500">Estimated total (server calculates the final amount)</span>
          <span className="text-lg font-semibold text-slate-900">{formatMoney(estimatedTotal)}</span>
        </div>

        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={submitting || products.length === 0}>
            {submitting ? 'Placing order…' : 'Place order'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
