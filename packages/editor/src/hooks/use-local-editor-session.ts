'use client'

import { nanoid } from 'nanoid'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SettingsPanelProps } from '../components/ui/sidebar/panels/settings-panel'
import {
  ensureLocalProjectsBootstrap,
  type LocalProjectEntry,
  readActiveLocalProjectId,
  readLocalProjectsList,
  writeActiveLocalProjectId,
  writeLocalProjectsList,
} from '../lib/local-projects'

export type LocalEditorSession = {
  ready: boolean
  projectId: string | null
  settingsPanelProps: Pick<
    SettingsPanelProps,
    'localProjects' | 'activeLocalProjectId' | 'onCreateLocalProject' | 'onSwitchLocalProject'
  >
}

/**
 * Multi-project session for local / desktop builds: list + active id in localStorage,
 * wired to {@link SettingsPanelProps}. Pair with `<Editor projectId={projectId} settingsPanelProps={...} />`.
 */
export function useLocalEditorSession(): LocalEditorSession {
  const [ready, setReady] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [projects, setProjects] = useState<LocalProjectEntry[]>([])

  useEffect(() => {
    ensureLocalProjectsBootstrap()
    const list = readLocalProjectsList()
    let active = readActiveLocalProjectId()
    if (!active || !list.some((p) => p.id === active)) {
      active = list[0]?.id ?? null
      if (active) {
        writeActiveLocalProjectId(active)
      }
    }
    setProjects(list.length > 0 ? list : [{ id: 'local-editor', name: 'Project 1' }])
    setProjectId(active)
    setReady(true)
  }, [])

  const onCreateLocalProject = useCallback(() => {
    const id = nanoid(12)
    setProjects((prev) => {
      const next: LocalProjectEntry[] = [...prev, { id, name: `Project ${prev.length + 1}` }]
      writeLocalProjectsList(next)
      return next
    })
    writeActiveLocalProjectId(id)
    setProjectId(id)
  }, [])

  const onSwitchLocalProject = useCallback((nextId: string) => {
    const list = readLocalProjectsList()
    if (!list.some((p) => p.id === nextId)) {
      return
    }
    writeActiveLocalProjectId(nextId)
    setProjectId(nextId)
  }, [])

  const settingsPanelProps = useMemo(
    () => ({
      localProjects: projects,
      activeLocalProjectId: projectId ?? undefined,
      onCreateLocalProject,
      onSwitchLocalProject,
    }),
    [projects, projectId, onCreateLocalProject, onSwitchLocalProject],
  )

  return { ready, projectId, settingsPanelProps }
}
