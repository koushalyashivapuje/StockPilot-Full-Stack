import { useCallback, useEffect, useState } from 'react'
import { useWorkspace } from '../context/WorkspaceContext'
import { authApi, workspaceApi } from '../api/auth'
import { Spinner, ErrorBanner, SuccessToast } from '../components/UiStates'

export default function Team() {
  const { workspaceId, isOwner } = useWorkspace()
  const [members, setMembers] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ email: '', fullName: '' })
  const [submitting, setSubmitting] = useState(false)
  const [inviteResult, setInviteResult] = useState(null)

  const load = useCallback(() => {
    if (!workspaceId) return
    setLoading(true)
    workspaceApi.members(workspaceId).then(setMembers).catch((err) => setError(err.message)).finally(() => setLoading(false))
  }, [workspaceId])

  useEffect(() => {
    load()
  }, [load])

  async function handleInvite(e) {
    e.preventDefault()
    setError('')
    setInviteResult(null)
    setSubmitting(true)
    try {
      const result = await authApi.addStaff(workspaceId, form)
      setInviteResult(result)
      setForm({ email: '', fullName: '' })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOwner) {
    return <ErrorBanner message="Only the workspace Owner can manage the team." />
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Team</h1>

      <section className="card">
        <h2 className="mb-3 font-semibold text-slate-900">Add a staff member</h2>
        <p className="mb-3 text-sm text-slate-500">
          This is a demo-simplified flow: no invitation email is sent. If the email doesn't have an
          account yet, one is created here and a one-time temporary password is shown below for you
          to share with them directly.
        </p>
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
          {error && <div className="w-full"><ErrorBanner message={error} /></div>}
          <div className="flex-1 min-w-[180px]">
            <label className="label" htmlFor="fullName">Full name</label>
            <input id="fullName" required className="input" value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add as staff'}
          </button>
        </form>

        {inviteResult && (
          <div className="mt-3">
            <SuccessToast
              message={
                inviteResult.temporaryPassword
                  ? `${inviteResult.message} Temporary password: ${inviteResult.temporaryPassword}`
                  : inviteResult.message
              }
            />
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold text-slate-900">Members</h2>
        {loading ? (
          <Spinner />
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {members?.map((m) => (
              <li key={m.userId} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-slate-900">{m.fullName}</p>
                  <p className="text-xs text-slate-500">{m.email}</p>
                </div>
                <span className="badge bg-slate-100 text-slate-700">{m.role}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
