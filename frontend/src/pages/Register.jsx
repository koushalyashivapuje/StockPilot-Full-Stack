import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ErrorBanner } from '../components/UiStates'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', workspaceName: '' })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function fieldErrorFor(field) {
    return fieldErrors[field]
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setSubmitting(true)
    try {
      await register(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
      if (err.fieldErrors?.length) {
        setFieldErrors(Object.fromEntries(err.fieldErrors.map((f) => [f.field, f.message])))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-bold text-brand-700">StockPilot</h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          Create your workspace. You'll be the Owner.
        </p>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && <ErrorBanner message={error} />}

          <div>
            <label className="label" htmlFor="fullName">Your name</label>
            <input
              id="fullName"
              required
              className="input"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
            {fieldErrorFor('fullName') && <p className="field-error">{fieldErrorFor('fullName')}</p>}
          </div>

          <div>
            <label className="label" htmlFor="workspaceName">Workspace / business name</label>
            <input
              id="workspaceName"
              required
              className="input"
              value={form.workspaceName}
              onChange={(e) => setForm({ ...form, workspaceName: e.target.value })}
            />
            {fieldErrorFor('workspaceName') && <p className="field-error">{fieldErrorFor('workspaceName')}</p>}
          </div>

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {fieldErrorFor('email') && <p className="field-error">{fieldErrorFor('email')}</p>}
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            {fieldErrorFor('password') && <p className="field-error">{fieldErrorFor('password')}</p>}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account & workspace'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
