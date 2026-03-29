'use client'

import { Icon } from '@iconify/react'
import { initSpaceDetectionSync, initSpatialGridSync, useScene } from '@pascal-app/core'
import { InteractiveSystem, useViewer } from '@pascal-app/viewer'
import { useTranslations } from 'next-intl'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ViewerOverlay } from '../../components/viewer-overlay'
import { ViewerZoneSystem } from '../../components/viewer-zone-system'
import {
  EditorCanvasI18nProvider,
  EditorViewerWithR3fI18nBridge,
} from '../../contexts/editor-canvas-i18n'
import { type PresetsAdapter, PresetsProvider } from '../../contexts/presets-context'
import { type SaveStatus, useAutoSave } from '../../hooks/use-auto-save'
import { useKeyboard } from '../../hooks/use-keyboard'
import {
  deleteRemoteOrLocalAsset,
  uploadLocalLevelReference,
} from '../../lib/local-reference-upload'
import {
  applySceneGraphToEditor,
  loadSceneFromLocalStorage,
  type SceneGraph,
  saveSceneToLocalStorage,
  writePersistedSelection,
} from '../../lib/scene'
import { initSFXBus } from '../../lib/sfx-bus'
import useEditor from '../../store/use-editor'
import { CeilingSystem } from '../systems/ceiling/ceiling-system'
import { RoofEditSystem } from '../systems/roof/roof-edit-system'
import { ZoneLabelEditorSystem } from '../systems/zone/zone-label-editor-system'
import { ZoneSystem } from '../systems/zone/zone-system'
import { ToolManager } from '../tools/tool-manager'
import { ActionMenu } from '../ui/action-menu'
import { HelperManager } from '../ui/helpers/helper-manager'
import { PanelManager } from '../ui/panels/panel-manager'
import { ErrorBoundary } from '../ui/primitives/error-boundary'
import { SidebarProvider } from '../ui/primitives/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/primitives/tooltip'
import { SceneLoader } from '../ui/scene-loader'
import { AppSidebar } from '../ui/sidebar/app-sidebar'
import type { SettingsPanelProps } from '../ui/sidebar/panels/settings-panel'
import type { SitePanelProps } from '../ui/sidebar/panels/site-panel'
import { CustomCameraControls } from './custom-camera-controls'
import { ExportManager } from './export-manager'
import { FloatingActionMenu } from './floating-action-menu'
import { FloorplanPanel } from './floorplan-panel'
import { Grid } from './grid'
import { OriginAxes } from './origin-axes'
import { PresetThumbnailGenerator } from './preset-thumbnail-generator'
import { SelectionManager } from './selection-manager'
import { SiteEdgeLabels } from './site-edge-labels'
import { ThumbnailGenerator } from './thumbnail-generator'
import { WallMeasurementLabel } from './wall-measurement-label'

let hasInitializedEditorRuntime = false
const CAMERA_CONTROLS_HINT_DISMISSED_STORAGE_KEY = 'editor-camera-controls-hint-dismissed:v1'

function initializeEditorRuntime() {
  if (hasInitializedEditorRuntime) return
  initSpatialGridSync()
  initSpaceDetectionSync(useScene, useEditor)
  initSFXBus()

  hasInitializedEditorRuntime = true
}
export interface EditorProps {
  // UI slots
  appMenuButton?: ReactNode
  sidebarTop?: ReactNode
  projectId?: string | null

  // Persistence — defaults to localStorage when omitted
  onLoad?: () => Promise<SceneGraph | null>
  onSave?: (scene: SceneGraph) => Promise<void>
  onDirty?: () => void
  onSaveStatusChange?: (status: SaveStatus) => void

  // Version preview
  previewScene?: SceneGraph
  isVersionPreviewMode?: boolean

  // Loading indicator (e.g. project fetching in community mode)
  isLoading?: boolean

  // Thumbnail
  onThumbnailCapture?: (blob: Blob) => void

  // Panel config (passed through to sidebar panels)
  settingsPanelProps?: SettingsPanelProps
  sitePanelProps?: SitePanelProps

  // Presets storage backend (defaults to localStorage)
  presetsAdapter?: PresetsAdapter
}

function EditorSceneCrashFallback() {
  const t = useTranslations('editorUi.crash')
  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-background/95 p-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background p-6 shadow-xl">
        <h2 className="font-semibold text-lg">{t('title')}</h2>
        <p className="mt-2 text-muted-foreground text-sm">{t('description')}</p>
        <div className="mt-4 flex items-center gap-2">
          <button
            className="rounded-md border border-border bg-accent px-3 py-2 font-medium text-sm hover:bg-accent/80"
            onClick={() => window.location.reload()}
            type="button"
          >
            {t('reload')}
          </button>
          <a
            className="rounded-md border border-border bg-background px-3 py-2 font-medium text-sm hover:bg-accent/40"
            href="/"
          >
            {t('home')}
          </a>
        </div>
      </div>
    </div>
  )
}

function SelectionPersistenceManager({ enabled }: { enabled: boolean }) {
  const selection = useViewer((state) => state.selection)

  useEffect(() => {
    if (!enabled) {
      return
    }

    writePersistedSelection(selection)
  }, [enabled, selection])

  return null
}

type ShortcutKeyId = 'space' | 'leftClick' | 'rightClick' | 'scroll'

type ShortcutKey = {
  id: ShortcutKeyId
}

type CameraControlHint = {
  action: string
  keys: ShortcutKey[]
  alternativeKeys?: ShortcutKey[]
}

const SHORTCUT_KEY_ICONS: Record<ShortcutKeyId, string> = {
  space: 'lucide:space',
  leftClick: 'ph:mouse-left-click-fill',
  rightClick: 'ph:mouse-right-click-fill',
  scroll: 'qlementine-icons:mouse-middle-button-16',
}

function readCameraControlsHintDismissed(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return window.localStorage.getItem(CAMERA_CONTROLS_HINT_DISMISSED_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeCameraControlsHintDismissed(dismissed: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    if (dismissed) {
      window.localStorage.setItem(CAMERA_CONTROLS_HINT_DISMISSED_STORAGE_KEY, '1')
      return
    }

    window.localStorage.removeItem(CAMERA_CONTROLS_HINT_DISMISSED_STORAGE_KEY)
  } catch {}
}

function InlineShortcutKey({
  label,
  shortcutKey,
}: {
  shortcutKey: ShortcutKey
  label: string
}) {
  const icon = SHORTCUT_KEY_ICONS[shortcutKey.id]

  return (
    <span
      aria-label={label}
      className="inline-flex items-center text-foreground/90"
      role="img"
      title={label}
    >
      <Icon aria-hidden="true" color="currentColor" height={16} icon={icon} width={16} />
      <span className="sr-only">{label}</span>
    </span>
  )
}

function ShortcutSequence({
  getLabel,
  keys,
}: {
  getLabel: (id: ShortcutKeyId) => string
  keys: ShortcutKey[]
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {keys.map((key, index) => (
        <div className="flex items-center gap-1" key={`${key.id}-${index}`}>
          {index > 0 ? <span className="text-[10px] text-muted-foreground/70">+</span> : null}
          <InlineShortcutKey label={getLabel(key.id)} shortcutKey={key} />
        </div>
      ))}
    </div>
  )
}

function CameraControlHintItem({
  getLabel,
  hint,
}: {
  getLabel: (id: ShortcutKeyId) => string
  hint: CameraControlHint
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 px-4 text-center first:pl-0 last:pr-0">
      <span className="font-medium text-[10px] text-muted-foreground/60 tracking-[0.03em]">
        {hint.action}
      </span>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <ShortcutSequence getLabel={getLabel} keys={hint.keys} />
        {hint.alternativeKeys ? (
          <>
            <span className="text-[10px] text-muted-foreground/40">/</span>
            <ShortcutSequence getLabel={getLabel} keys={hint.alternativeKeys} />
          </>
        ) : null}
      </div>
    </div>
  )
}

function ViewerCanvasControlsHint({
  isPreviewMode,
  onDismiss,
}: {
  isPreviewMode: boolean
  onDismiss: () => void
}) {
  const t = useTranslations('editorUi.camera')

  const getLabel = useCallback(
    (id: ShortcutKeyId) => {
      switch (id) {
        case 'space':
          return t('shortcutSpace')
        case 'leftClick':
          return t('shortcutLeftClick')
        case 'rightClick':
          return t('shortcutRightClick')
        case 'scroll':
          return t('shortcutScrollWheel')
        default:
          return id
      }
    },
    [t],
  )

  const hints: CameraControlHint[] = useMemo(
    () =>
      isPreviewMode
        ? [
            { action: t('actionPan'), keys: [{ id: 'leftClick' }] },
            { action: t('actionRotate'), keys: [{ id: 'rightClick' }] },
            { action: t('actionZoom'), keys: [{ id: 'scroll' }] },
          ]
        : [
            { action: t('actionPan'), keys: [{ id: 'space' }, { id: 'leftClick' }] },
            { action: t('actionRotate'), keys: [{ id: 'rightClick' }] },
            { action: t('actionZoom'), keys: [{ id: 'scroll' }] },
          ],
    [isPreviewMode, t],
  )

  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-[45] max-w-[calc(100vw-2rem)] -translate-x-1/2">
      <section
        aria-label={t('hintSectionAria')}
        className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-border/35 bg-background/90 px-3.5 py-2.5 shadow-[0_22px_40px_-28px_rgba(15,23,42,0.65),0_10px_24px_-20px_rgba(15,23,42,0.55)] backdrop-blur-xl"
      >
        <div className="grid min-w-0 flex-1 grid-cols-3 items-start divide-x divide-border/18">
          {hints.map((hint, index) => (
            <CameraControlHintItem getLabel={getLabel} hint={hint} key={index} />
          ))}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label={t('dismissAria')}
              className="flex h-5 shrink-0 items-center justify-center self-center border-border/18 border-l pl-3 text-muted-foreground/70 transition-colors hover:text-foreground"
              onClick={onDismiss}
              type="button"
            >
              <Icon
                aria-hidden="true"
                color="currentColor"
                height={14}
                icon="lucide:x"
                width={14}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={8}>
            {t('dismissTooltip')}
          </TooltipContent>
        </Tooltip>
      </section>
    </div>
  )
}

export default function Editor({
  appMenuButton,
  sidebarTop,
  projectId,
  onLoad,
  onSave,
  onDirty,
  onSaveStatusChange,
  previewScene,
  isVersionPreviewMode = false,
  isLoading = false,
  onThumbnailCapture,
  settingsPanelProps,
  sitePanelProps,
  presetsAdapter,
}: EditorProps) {
  useKeyboard()

  const projectIdRef = useRef(projectId)
  projectIdRef.current = projectId

  const { isLoadingSceneRef } = useAutoSave({
    onSave,
    onDirty,
    onSaveStatusChange,
    isVersionPreviewMode,
    getStorageProjectId: () => projectIdRef.current ?? undefined,
  })

  const [isSceneLoading, setIsSceneLoading] = useState(false)
  const [hasLoadedInitialScene, setHasLoadedInitialScene] = useState(false)
  const [isCameraControlsHintVisible, setIsCameraControlsHintVisible] = useState<boolean | null>(
    null,
  )
  const isPreviewMode = useEditor((s) => s.isPreviewMode)
  const isFloorplanOpen = useEditor((s) => s.isFloorplanOpen)

  const mergedSettingsPanelProps = useMemo(
    () => ({
      ...settingsPanelProps,
      projectId: settingsPanelProps?.projectId ?? projectId ?? undefined,
    }),
    [settingsPanelProps, projectId],
  )

  const onLocalUploadAsset = useCallback(
    async (_pid: string, levelId: string, file: File, type: 'scan' | 'guide') => {
      await uploadLocalLevelReference(useScene.getState, levelId, file, type)
    },
    [],
  )

  const onLocalDeleteAsset = useCallback(async (_pid: string, url: string) => {
    await deleteRemoteOrLocalAsset(url)
  }, [])

  const mergedSitePanelProps = useMemo(
    () => ({
      ...sitePanelProps,
      projectId: sitePanelProps?.projectId ?? projectId ?? undefined,
      onUploadAsset: sitePanelProps?.onUploadAsset ?? onLocalUploadAsset,
      onDeleteAsset: sitePanelProps?.onDeleteAsset ?? onLocalDeleteAsset,
    }),
    [sitePanelProps, projectId, onLocalUploadAsset, onLocalDeleteAsset],
  )

  useEffect(() => {
    initializeEditorRuntime()
  }, [])

  useEffect(() => {
    useViewer.getState().setProjectId(projectId ?? null)

    return () => {
      useViewer.getState().setProjectId(null)
    }
  }, [projectId])

  const previousStorageProjectIdRef = useRef<string | null | undefined>(undefined)

  // Load scene on mount (or when onLoad / projectId changes, e.g. local project switch)
  useEffect(() => {
    let cancelled = false

    async function load() {
      isLoadingSceneRef.current = true
      setHasLoadedInitialScene(false)
      setIsSceneLoading(true)

      const prior = previousStorageProjectIdRef.current
      if (prior !== undefined && prior !== (projectId ?? null) && !onLoad) {
        const { nodes, rootNodeIds } = useScene.getState()
        saveSceneToLocalStorage({ nodes, rootNodeIds } as SceneGraph, prior)
      }

      try {
        const sceneGraph = onLoad ? await onLoad() : loadSceneFromLocalStorage(projectId)
        if (!cancelled) {
          applySceneGraphToEditor(sceneGraph)
        }
      } catch {
        if (!cancelled) applySceneGraphToEditor(null)
      } finally {
        if (!cancelled) {
          previousStorageProjectIdRef.current = projectId ?? null
          setIsSceneLoading(false)
          setHasLoadedInitialScene(true)
          requestAnimationFrame(() => {
            isLoadingSceneRef.current = false
          })
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [onLoad, isLoadingSceneRef, projectId])

  // Apply preview scene when version preview mode changes
  useEffect(() => {
    if (isVersionPreviewMode && previewScene) {
      applySceneGraphToEditor(previewScene)
    }
  }, [isVersionPreviewMode, previewScene])

  useEffect(() => {
    document.body.classList.add('dark')
    return () => {
      document.body.classList.remove('dark')
    }
  }, [])

  useEffect(() => {
    setIsCameraControlsHintVisible(!readCameraControlsHintDismissed())
  }, [])

  const showLoader = isLoading || isSceneLoading
  const dismissCameraControlsHint = useCallback(() => {
    setIsCameraControlsHintVisible(false)
    writeCameraControlsHintDismissed(true)
  }, [])

  return (
    <PresetsProvider adapter={presetsAdapter}>
      <EditorCanvasI18nProvider>
      <div className="dark h-full w-full text-foreground">
        {showLoader && (
          <div className="fixed inset-0 z-60">
            <SceneLoader />
          </div>
        )}

        {!showLoader && isCameraControlsHintVisible ? (
          <ViewerCanvasControlsHint
            isPreviewMode={isPreviewMode}
            onDismiss={dismissCameraControlsHint}
          />
        ) : null}

        {!isLoading && isPreviewMode ? (
          <ViewerOverlay onBack={() => useEditor.getState().setPreviewMode(false)} />
        ) : (
          <>
            <ActionMenu />
            <PanelManager />
            {isFloorplanOpen && <FloorplanPanel />}
            <HelperManager />

            <SidebarProvider className="fixed z-20">
              <AppSidebar
                appMenuButton={appMenuButton}
                settingsPanelProps={mergedSettingsPanelProps}
                sidebarTop={sidebarTop}
                sitePanelProps={mergedSitePanelProps}
              />
            </SidebarProvider>
          </>
        )}

        <ErrorBoundary fallback={<EditorSceneCrashFallback />}>
          <div className="h-full w-full">
            <SelectionPersistenceManager enabled={hasLoadedInitialScene && !showLoader} />
            <EditorViewerWithR3fI18nBridge selectionManager={isPreviewMode ? 'default' : 'custom'}>
              {!isPreviewMode && <SelectionManager />}
              {!isPreviewMode && <FloatingActionMenu />}
              {!isPreviewMode && <WallMeasurementLabel />}
              <ExportManager />
              {isPreviewMode ? <ViewerZoneSystem /> : <ZoneSystem />}
              <CeilingSystem />
              <RoofEditSystem />
              {!isPreviewMode && <Grid cellColor="#aaa" fadeDistance={500} sectionColor="#ccc" />}
              {!isPreviewMode && <OriginAxes />}
              {!(isPreviewMode || isLoading) && <ToolManager />}
              <CustomCameraControls />
              <ThumbnailGenerator onThumbnailCapture={onThumbnailCapture} />
              <PresetThumbnailGenerator />
              {!isPreviewMode && <SiteEdgeLabels />}
              {isPreviewMode && <InteractiveSystem />}
            </EditorViewerWithR3fI18nBridge>
          </div>
          {!(isPreviewMode || isLoading) && <ZoneLabelEditorSystem />}
        </ErrorBoundary>
      </div>
      </EditorCanvasI18nProvider>
    </PresetsProvider>
  )
}
