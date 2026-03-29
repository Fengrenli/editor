'use client'

import type { AnyNodeId, LevelNode } from '@pascal-app/core'
import { useScene } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { Command } from 'cmdk'
import { ChevronRight, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/shallow'
import { Dialog, DialogContent, DialogTitle } from './../../../components/ui/primitives/dialog'
import { useCommandRegistry } from '../../../store/use-command-registry'
import { usePaletteViewRegistry } from '../../../store/use-palette-view-registry'

// ---------------------------------------------------------------------------
// Open + navigation state store
// ---------------------------------------------------------------------------
interface CommandPaletteStore {
  open: boolean
  setOpen: (open: boolean) => void
  /** Current rendering mode. 'command' = normal palette; anything else = registered mode view. */
  mode: string
  setMode: (mode: string) => void
  pages: string[]
  inputValue: string
  setInputValue: (value: string) => void
  navigateTo: (page: string) => void
  goBack: () => void
  cameraScope: { nodeId: string; label: string } | null
  setCameraScope: (scope: { nodeId: string; label: string } | null) => void
}

export const useCommandPalette = create<CommandPaletteStore>((set, get) => ({
  open: false,
  setOpen: (open) => {
    set({ open })
    if (!open) set({ pages: [], inputValue: '', cameraScope: null, mode: 'command' })
  },
  mode: 'command',
  setMode: (mode) => set({ mode }),
  pages: [],
  inputValue: '',
  setInputValue: (value) => set({ inputValue: value }),
  navigateTo: (page) => set((s) => ({ pages: [...s.pages, page], inputValue: '' })),
  goBack: () => {
    const { pages } = get()
    if (pages[pages.length - 1] === 'camera-scope') set({ cameraScope: null })
    set((s) => ({ pages: s.pages.slice(0, -1), inputValue: '' }))
  },
  cameraScope: null,
  setCameraScope: (scope) => set({ cameraScope: scope }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function resolve(value: string | (() => string)): string {
  return typeof value === 'function' ? value() : value
}

function Shortcut({ keys }: { keys: string[] }) {
  return (
    <span className="ml-auto flex shrink-0 items-center gap-0.5">
      {keys.map((k) => (
        <kbd
          className="flex min-w-4.5 items-center justify-center rounded border border-border/60 bg-muted/60 px-1 py-0.5 text-[10px] text-muted-foreground leading-none"
          key={k}
        >
          {k}
        </kbd>
      ))}
    </span>
  )
}

function Item({
  icon,
  label,
  onSelect,
  shortcut,
  disabled = false,
  keywords = [],
  badge,
  navigate = false,
}: {
  icon: React.ReactNode
  label: string | (() => string)
  onSelect: () => void
  shortcut?: string[]
  disabled?: boolean
  keywords?: string[]
  badge?: string | (() => string)
  navigate?: boolean
}) {
  const resolvedLabel = resolve(label)
  const resolvedBadge = badge ? resolve(badge) : undefined

  return (
    <Command.Item
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-foreground text-sm transition-colors data-[disabled=true]:cursor-not-allowed data-[selected=true]:bg-accent data-[disabled=true]:opacity-40"
      disabled={disabled}
      keywords={keywords}
      onSelect={onSelect}
      value={resolvedLabel}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
        {icon}
      </span>
      <span className="flex-1 truncate">{resolvedLabel}</span>
      {resolvedBadge && (
        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {resolvedBadge}
        </span>
      )}
      {shortcut && <Shortcut keys={shortcut} />}
      {(resolvedBadge || navigate) && (
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
      )}
    </Command.Item>
  )
}

function OptionItem({
  label,
  isActive = false,
  onSelect,
  icon,
  disabled = false,
}: {
  label: string
  isActive?: boolean
  onSelect: () => void
  icon?: React.ReactNode
  disabled?: boolean
}) {
  return (
    <Command.Item
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-foreground text-sm transition-colors data-[disabled=true]:cursor-not-allowed data-[selected=true]:bg-accent data-[disabled=true]:opacity-40"
      disabled={disabled}
      onSelect={onSelect}
      value={label}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
        {isActive ? <div className="h-1.5 w-1.5 rounded-full bg-primary" /> : icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
    </Command.Item>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CommandPalette() {
  const t = useTranslations('commandPalette')
  const tSite = useTranslations('sitePanel')
  const tLevelLabels = useTranslations('actionMenu.level')
  const tWallVm = useTranslations('commandPalette.viewerWallMode')

  const {
    open,
    setOpen,
    mode,
    setMode,
    pages,
    inputValue,
    setInputValue,
    navigateTo,
    goBack,
    cameraScope,
    setCameraScope,
  } = useCommandPalette()

  const [meta, setMeta] = useState('⌘')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const page = pages[pages.length - 1]

  const actions = useCommandRegistry((s) => s.actions)
  const views = usePaletteViewRegistry((s) => s.views)

  const activeLevelId = useViewer((s) => s.selection.levelId)
  const activeLevelNode = useScene((s) => (activeLevelId ? s.nodes[activeLevelId] : null))

  const wallMode = useViewer((s) => s.wallMode)
  const setWallMode = useViewer((s) => s.setWallMode)
  const levelMode = useViewer((s) => s.levelMode)
  const setLevelMode = useViewer((s) => s.setLevelMode)

  const allLevels = useScene(
    useShallow((s) =>
      (Object.values(s.nodes).filter((n) => n.type === 'level') as LevelNode[]).sort(
        (a, b) => a.level - b.level,
      ),
    ),
  )

  const cameraScopeNode = useScene((s) =>
    cameraScope ? s.nodes[cameraScope.nodeId as AnyNodeId] : null,
  )
  const hasScopeSnapshot = !!(cameraScopeNode as any)?.camera

  // Platform detection
  useEffect(() => {
    setMeta(/Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘' : 'Ctrl')
  }, [])

  // Fullscreen tracking
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Cmd/Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setOpen])

  const run = (fn: () => void) => {
    fn()
    setOpen(false)
  }

  const wallModeLabel: Record<'cutaway' | 'up' | 'down', string> = useMemo(
    () => ({
      cutaway: tWallVm('cutaway'),
      up: tWallVm('up'),
      down: tWallVm('down'),
    }),
    [tWallVm],
  )
  const levelModeLabel = useMemo(
    () =>
      ({
        manual: tLevelLabels('manual'),
        stacked: tLevelLabels('stacked'),
        exploded: tLevelLabels('exploded'),
        solo: tLevelLabels('solo'),
      }) satisfies Record<'manual' | 'stacked' | 'exploded' | 'solo', string>,
    [tLevelLabels],
  )

  const pageBreadCrumbLabel = (p: string) => {
    if (p === 'wall-mode') return t('page.wallMode')
    if (p === 'level-mode') return t('page.levelMode')
    if (p === 'rename-level') return t('page.renameLevel')
    if (p === 'goto-level') return t('page.gotoLevel')
    if (p === 'camera-view') return t('page.cameraView')
    return views.get(p)?.label ?? p
  }

  // Camera snapshot helpers (used by sub-pages registered via EditorCommands)
  const confirmRename = () => {
    if (!(activeLevelId && inputValue.trim())) return
    run(() => {
      useScene.getState().updateNode(activeLevelId as AnyNodeId, { name: inputValue.trim() } as any)
    })
  }

  const takeSnapshot = () => {
    if (!cameraScope) return
    import('@pascal-app/core').then(({ emitter }) => {
      run(() =>
        emitter.emit('camera-controls:capture', { nodeId: cameraScope.nodeId as AnyNodeId }),
      )
    })
  }

  const viewSnapshot = () => {
    if (!(cameraScope && hasScopeSnapshot)) return
    import('@pascal-app/core').then(({ emitter }) => {
      run(() => emitter.emit('camera-controls:view', { nodeId: cameraScope.nodeId as AnyNodeId }))
    })
  }

  const clearSnapshot = () => {
    if (!(cameraScope && hasScopeSnapshot)) return
    run(() => {
      useScene.getState().updateNode(cameraScope.nodeId as AnyNodeId, { camera: undefined } as any)
    })
  }

  // ---------------------------------------------------------------------------
  // Group registered actions by group (preserving insertion order)
  // ---------------------------------------------------------------------------
  const grouped = actions.reduce<Map<string, typeof actions>>((acc, action) => {
    const list = acc.get(action.group) ?? []
    list.push(action)
    acc.set(action.group, list)
    return acc
  }, new Map())

  const onClose = () => setOpen(false)
  const onBack = () => {
    if (mode !== 'command') {
      setMode('command')
    } else {
      goBack()
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Mode view: replaces the entire cmdk shell
  const modeView = mode !== 'command' ? views.get(mode) : undefined

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0" showCloseButton={false}>
        <DialogTitle className="sr-only">{t('dialogTitle')}</DialogTitle>

        {modeView && <modeView.Component onBack={onBack} onClose={onClose} />}

        {!modeView && (
          <Command
            className="**:[[cmdk-group-heading]]:px-2.5 **:[[cmdk-group-heading]]:pt-3 **:[[cmdk-group-heading]]:pb-1 **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:text-[10px] **:[[cmdk-group-heading]]:text-muted-foreground **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-wider"
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !inputValue && pages.length > 0) {
                e.preventDefault()
                goBack()
              }
            }}
            shouldFilter={page !== 'rename-level'}
          >
            {/* Search bar */}
            <div className="flex items-center border-border/50 border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              {page && (
                <button
                  className="mr-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/70"
                  onClick={goBack}
                  type="button"
                >
                  {page === 'camera-scope'
                    ? (cameraScope?.label ?? t('snapshotBreadcrumb'))
                    : pageBreadCrumbLabel(page)}
                </button>
              )}
              <Command.Input
                autoFocus
                className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                onValueChange={setInputValue}
                placeholder={
                  page === 'rename-level'
                    ? t('placeholderRename')
                    : page
                      ? t('placeholderFilter')
                      : t('placeholderSearch')
                }
                value={inputValue}
              />
            </div>

            <Command.List className="max-h-100 overflow-y-auto p-1.5">
              <Command.Empty className="py-8 text-center text-muted-foreground text-sm">
                {t('noCommands')}
              </Command.Empty>

              {/* ── Registered page view (e.g. 'ai') ─────────────────────── */}
              {page &&
                views.get(page)?.type === 'page' &&
                (() => {
                  const pageView = views.get(page)
                  return pageView ? <pageView.Component onBack={onBack} onClose={onClose} /> : null
                })()}

              {/* ── Root view: render from registry ───────────────────────── */}
              {!page &&
                Array.from(grouped.entries()).map(([group, groupActions]) => (
                  <Command.Group heading={group} key={group}>
                    {groupActions.map((action) => (
                      <Item
                        badge={action.badge}
                        disabled={action.when ? !action.when() : false}
                        icon={action.icon}
                        key={action.id}
                        keywords={action.keywords}
                        label={action.label}
                        navigate={action.navigate}
                        onSelect={() => action.execute()}
                        shortcut={action.shortcut}
                      />
                    ))}
                  </Command.Group>
                ))}

              {/* ── Wall Mode sub-page ────────────────────────────────────── */}
              {page === 'wall-mode' && (
                <Command.Group heading={t('page.wallMode')}>
                  {(['cutaway', 'up', 'down'] as const).map((mode) => (
                    <OptionItem
                      isActive={wallMode === mode}
                      key={mode}
                      label={wallModeLabel[mode]}
                      onSelect={() => run(() => setWallMode(mode))}
                    />
                  ))}
                </Command.Group>
              )}

              {/* ── Level Mode sub-page ───────────────────────────────────── */}
              {page === 'level-mode' && (
                <Command.Group heading={t('page.levelMode')}>
                  {(['stacked', 'exploded', 'solo'] as const).map((mode) => (
                    <OptionItem
                      isActive={levelMode === mode}
                      key={mode}
                      label={levelModeLabel[mode]}
                      onSelect={() => run(() => setLevelMode(mode))}
                    />
                  ))}
                </Command.Group>
              )}

              {/* ── Go to Level sub-page ──────────────────────────────────── */}
              {page === 'goto-level' && (
                <Command.Group heading={t('page.gotoLevel')}>
                  {allLevels.map((level) => (
                    <OptionItem
                      isActive={level.id === activeLevelId}
                      key={level.id}
                      label={level.name ?? t('levelFallback', { level: level.level })}
                      onSelect={() =>
                        run(() => useViewer.getState().setSelection({ levelId: level.id }))
                      }
                    />
                  ))}
                </Command.Group>
              )}

              {/* ── Rename Level sub-page ─────────────────────────────────── */}
              {page === 'rename-level' && (
                <Command.Group heading={t('page.renameLevel')}>
                  <Command.Item
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-foreground text-sm transition-colors data-[disabled=true]:cursor-not-allowed data-[selected=true]:bg-accent data-[disabled=true]:opacity-40"
                    disabled={!inputValue.trim()}
                    onSelect={confirmRename}
                    value="confirm-rename"
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 20h9" strokeLinecap="round" strokeLinejoin="round" />
                        <path
                          d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="flex-1 truncate">
                      {inputValue.trim() ? (
                        <span className="font-medium">{t('renameTo', { name: inputValue.trim() })}</span>
                      ) : (
                        <span className="text-muted-foreground">{t('renameHint')}</span>
                      )}
                    </span>
                  </Command.Item>
                </Command.Group>
              )}

              {/* ── Camera Snapshot: scope picker ─────────────────────────── */}
              {page === 'camera-view' && (
                <Command.Group heading={t('cameraSnapshotSelectScope')}>
                  <OptionItem
                    icon={
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path d="M3 3h18v18H3z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M3 9h18M9 21V9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    }
                    label={tSite('defaultSite')}
                    onSelect={() => {
                      const { rootNodeIds } = useScene.getState()
                      const siteId = rootNodeIds[0]
                      if (siteId) {
                        setCameraScope({ nodeId: siteId, label: tSite('defaultSite') })
                        navigateTo('camera-scope')
                      }
                    }}
                  />
                  <OptionItem
                    icon={
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <polyline
                          points="9 22 9 12 15 12 15 22"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    }
                    label={tSite('defaultBuilding')}
                    onSelect={() => {
                      const building = Object.values(useScene.getState().nodes).find(
                        (n) => n.type === 'building',
                      )
                      if (building) {
                        setCameraScope({ nodeId: building.id, label: tSite('defaultBuilding') })
                        navigateTo('camera-scope')
                      }
                    }}
                  />
                  <OptionItem
                    disabled={!activeLevelId}
                    icon={
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M12 2L2 7l10 5 10-5-10-5z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M2 17l10 5 10-5M2 12l10 5 10-5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    }
                    label={tSite('altLevel')}
                    onSelect={() => {
                      if (activeLevelId) {
                        setCameraScope({ nodeId: activeLevelId, label: tSite('altLevel') })
                        navigateTo('camera-scope')
                      }
                    }}
                  />
                  <OptionItem
                    disabled={!useViewer.getState().selection.selectedIds.length}
                    icon={
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path d="M5 3l14 9-14 9V3z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    }
                    label={t('scopeSelection')}
                    onSelect={() => {
                      const firstId = useViewer.getState().selection.selectedIds[0]
                      if (firstId) {
                        setCameraScope({ nodeId: firstId, label: t('scopeSelection') })
                        navigateTo('camera-scope')
                      }
                    }}
                  />
                </Command.Group>
              )}

              {/* ── Camera Snapshot: actions for selected scope ───────────── */}
              {page === 'camera-scope' && cameraScope && (
                <Command.Group heading={t('snapshotGroupTitle', { scope: cameraScope.label })}>
                  <OptionItem
                    icon={
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="12"
                          cy="13"
                          r="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    }
                    label={hasScopeSnapshot ? tSite('updateSnapshot') : tSite('takeSnapshot')}
                    onSelect={takeSnapshot}
                  />
                  {hasScopeSnapshot && (
                    <OptionItem
                      icon={
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="12"
                            cy="12"
                            r="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      }
                      label={tSite('viewSnapshot')}
                      onSelect={viewSnapshot}
                    />
                  )}
                  {hasScopeSnapshot && (
                    <OptionItem
                      icon={
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <polyline
                            points="3 6 5 6 21 6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M19 6l-1 14H6L5 6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M9 6V4h6v2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      }
                      label={tSite('clearSnapshot')}
                      onSelect={clearSnapshot}
                    />
                  )}
                </Command.Group>
              )}
            </Command.List>

            {/* Footer hint */}
            <div className="flex items-center justify-between border-border/50 border-t px-3 py-2">
              <span className="text-[11px] text-muted-foreground">
                <Shortcut keys={['↑', '↓']} /> {t('footerNavigate')}
              </span>
              <span className="text-[11px] text-muted-foreground">
                <Shortcut keys={['↵']} /> {t('footerSelect')}
              </span>
              {page ? (
                <span className="text-[11px] text-muted-foreground">
                  <Shortcut keys={['⌫']} /> {t('footerBack')}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  <Shortcut keys={['Esc']} /> {t('footerClose')}
                </span>
              )}
            </div>
          </Command>
        )}
      </DialogContent>
    </Dialog>
  )
}
