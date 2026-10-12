import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
  const { user } = useAuth()
  const workspaces = user?.workspaces || []

  const [workspaceId, setWorkspaceId] = useState(() => {
    const stored = localStorage.getItem('stockpilot_workspace_id')
    return stored ? Number(stored) : null
  })

  // Keep the selected workspace valid as the user's membership list changes (login/logout, etc).
  useEffect(() => {
    if (workspaces.length === 0) {
      setWorkspaceId(null)
      return
    }
    const stillValid = workspaces.some((w) => w.workspaceId === workspaceId)
    if (!stillValid) {
      setWorkspaceId(workspaces[0].workspaceId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const selectWorkspace = useCallback((id) => {
    localStorage.setItem('stockpilot_workspace_id', String(id))
    setWorkspaceId(id)
  }, [])

  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w.workspaceId === workspaceId) || null,
    [workspaces, workspaceId],
  )

  const value = useMemo(
    () => ({
      workspaces,
      workspaceId: currentWorkspace?.workspaceId ?? null,
      currentWorkspace,
      isOwner: currentWorkspace?.role === 'OWNER',
      selectWorkspace,
    }),
    [workspaces, currentWorkspace, selectWorkspace],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
