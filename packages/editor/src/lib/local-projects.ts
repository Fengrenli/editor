const LOCAL_PROJECTS_LIST_KEY = 'pascal-editor-local-projects'
const LOCAL_ACTIVE_PROJECT_KEY = 'pascal-editor-active-project-id'

export type LocalProjectEntry = { id: string; name: string }

const DEFAULT_FIRST_ID = 'local-editor'

/**
 * Ensures a project list exists. First run: one default project so existing
 * `pascal-editor-scene` migration in loadSceneFromLocalStorage still applies.
 */
export function ensureLocalProjectsBootstrap(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    if (localStorage.getItem(LOCAL_PROJECTS_LIST_KEY)) {
      return
    }
    const initial: LocalProjectEntry[] = [{ id: DEFAULT_FIRST_ID, name: 'Project 1' }]
    localStorage.setItem(LOCAL_PROJECTS_LIST_KEY, JSON.stringify(initial))
    if (!localStorage.getItem(LOCAL_ACTIVE_PROJECT_KEY)) {
      localStorage.setItem(LOCAL_ACTIVE_PROJECT_KEY, DEFAULT_FIRST_ID)
    }
  } catch {
    // ignore quota / private mode
  }
}

export function readLocalProjectsList(): LocalProjectEntry[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = localStorage.getItem(LOCAL_PROJECTS_LIST_KEY)
    if (!raw) {
      return [{ id: DEFAULT_FIRST_ID, name: 'Project 1' }]
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return [{ id: DEFAULT_FIRST_ID, name: 'Project 1' }]
    }
    return parsed
      .map((row): LocalProjectEntry | null => {
        if (typeof row !== 'object' || row === null) {
          return null
        }
        const id = 'id' in row && typeof row.id === 'string' ? row.id : null
        const name = 'name' in row && typeof row.name === 'string' ? row.name : 'Project'
        return id ? { id, name } : null
      })
      .filter((x): x is LocalProjectEntry => x !== null)
  } catch {
    return [{ id: DEFAULT_FIRST_ID, name: 'Project 1' }]
  }
}

export function writeLocalProjectsList(entries: LocalProjectEntry[]): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(LOCAL_PROJECTS_LIST_KEY, JSON.stringify(entries))
  } catch {
    // ignore
  }
}

export function readActiveLocalProjectId(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const id = localStorage.getItem(LOCAL_ACTIVE_PROJECT_KEY)
    return id && id.length > 0 ? id : null
  } catch {
    return null
  }
}

export function writeActiveLocalProjectId(id: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(LOCAL_ACTIVE_PROJECT_KEY, id)
  } catch {
    // ignore
  }
}
