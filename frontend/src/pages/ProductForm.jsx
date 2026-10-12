import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkspace } from '../context/WorkspaceContext'
import { productApi } from '../api/products'
import { ErrorBanner, Spinner } from '../components/UiStates'

const emptyForm = { name: '', sku: '', description: '', unitPrice: '', lowStockThreshold: '0', stockQuantity: '0', active: true }

export default function ProductForm() {
  const { workspaceId } = useWorkspace()
  const { productId } = useParams()
  const isEdit = Boolean(productId)
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (!isEdit || !workspaceId) return
    productApi
      .get(workspaceId, productId)
      .then((p) =>
        setForm({
          name: p.name,
          sku: p.sku,
          description: p.description || '',
          unitPrice: String(p.unitPrice),
          lowStockThreshold: String(p.lowStockThreshold),
          stockQuantity: String(p.stockQuantity),
          active: p.active,
        }),
      )
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [isEdit, workspaceId, productId])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setSubmitting(true)

    const payload = {
      name: form.name,
      sku: form.sku,
      description: form.description || null,
      unitPrice: form.unitPrice,
      stockQuantity: Number(form.stockQuantity),
      lowStockThreshold: Number(form.lowStockThreshold),
      active: form.active,
    }

    try {
      if (isEdit) {
        await productApi.update(workspaceId, productId, payload)
        navigate(`/products/${productId}`)
      } else {
        const created = await productApi.create(workspaceId, payload)
        navigate(`/products/${created.id}`)
      }
    } catch (err) {
      setError(err.message)
      if (err.fieldErrors?.length) {
        setFieldErrors(Object.fromEntries(err.fieldErrors.map((f) => [f.field, f.message])))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">{isEdit ? 'Edit product' : 'New product'}</h1>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <ErrorBanner message={error} />}

        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" required className="input" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
        </div>

        <div>
          <label className="label" htmlFor="sku">SKU</label>
          <input id="sku" required className="input" value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          {fieldErrors.sku && <p className="field-error">{fieldErrors.sku}</p>}
        </div>

        <div>
          <label className="label" htmlFor="description">Description (optional)</label>
          <textarea id="description" className="input" rows={3} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="unitPrice">Unit price</label>
            <input id="unitPrice" type="number" min="0" step="0.01" required className="input"
              value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
            {fieldErrors.unitPrice && <p className="field-error">{fieldErrors.unitPrice}</p>}
          </div>
          <div>
            <label className="label" htmlFor="lowStockThreshold">Low-stock threshold</label>
            <input id="lowStockThreshold" type="number" min="0" step="1" required className="input"
              value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />
            {fieldErrors.lowStockThreshold && <p className="field-error">{fieldErrors.lowStockThreshold}</p>}
          </div>
        </div>

        {!isEdit && (
          <div>
            <label className="label" htmlFor="stockQuantity">Starting stock quantity</label>
            <input id="stockQuantity" type="number" min="0" step="1" required className="input"
              value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} />
            {fieldErrors.stockQuantity && <p className="field-error">{fieldErrors.stockQuantity}</p>}
            <p className="mt-1 text-xs text-slate-500">
              After creation, stock can only change through audited inventory adjustments or orders.
            </p>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Active (available for new orders)
        </label>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
