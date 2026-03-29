'use client'

import { Viewer } from '@pascal-app/viewer'
import { useContextBridge } from '@react-three/drei'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import type { StructureTool } from '../store/use-editor'

export type EditorCanvasI18nValue = {
  nodeMenu: { move: string; duplicate: string; delete: string }
  resolveToolLabel: (
    mode: string,
    tool: string | null,
    catalogCategory: string | null,
  ) => string
}

export const EditorCanvasI18nContext = createContext<EditorCanvasI18nValue | null>(null)

export function useEditorCanvasI18n(): EditorCanvasI18nValue {
  const v = useContext(EditorCanvasI18nContext)
  if (!v) {
    throw new Error('useEditorCanvasI18n must be used under EditorCanvasI18nProvider')
  }
  return v
}

/** Fills i18n from next-intl (DOM tree). Wrap the whole editor; use {@link EditorViewerWithR3fI18nBridge} for the 3D canvas. */
export function EditorCanvasI18nProvider({ children }: { children: ReactNode }) {
  const tNode = useTranslations('actionMenu.node')
  const tStructure = useTranslations('actionMenu.structure')
  const tFurnish = useTranslations('actionMenu.furnish')

  const value = useMemo<EditorCanvasI18nValue>(
    () => ({
      nodeMenu: {
        move: tNode('move'),
        duplicate: tNode('duplicate'),
        delete: tNode('delete'),
      },
      resolveToolLabel: (mode, tool, catalogCategory) => {
        if (mode !== 'build' || !tool) return ''
        if (tool === 'item' && catalogCategory) {
          return tFurnish(catalogCategory)
        }
        return tStructure(tool as StructureTool)
      },
    }),
    [tNode, tStructure, tFurnish],
  )

  return (
    <EditorCanvasI18nContext.Provider value={value}>{children}</EditorCanvasI18nContext.Provider>
  )
}

/**
 * Wraps the 3D `Viewer` / Canvas: `useContextBridge` must run in the DOM React tree (under
 * `EditorCanvasI18nProvider`), not inside R3F as a child of Canvas, or the bridge reads `null`.
 */
export function EditorViewerWithR3fI18nBridge({
  children,
  selectionManager,
}: {
  children: ReactNode
  selectionManager: 'default' | 'custom'
}) {
  const IntlBridge = useContextBridge(EditorCanvasI18nContext)
  return (
    <Viewer selectionManager={selectionManager}>
      <IntlBridge>{children}</IntlBridge>
    </Viewer>
  )
}
