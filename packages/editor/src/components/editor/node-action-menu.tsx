'use client'

import { Copy, Move, Trash2 } from 'lucide-react'
import { useContext, type MouseEventHandler, type PointerEventHandler } from 'react'
import { EditorCanvasI18nContext } from '../../contexts/editor-canvas-i18n'
import { cn } from '../../lib/utils'

export type NodeActionMenuLabels = {
  move: string
  duplicate: string
  delete: string
}

type NodeActionMenuProps = {
  /** Required when rendered inside drei's `<Html>` (portal loses R3F context). Omit on floorplan DOM. */
  nodeLabels?: NodeActionMenuLabels
  onDelete: MouseEventHandler<HTMLButtonElement>
  onDuplicate?: MouseEventHandler<HTMLButtonElement>
  onMove?: MouseEventHandler<HTMLButtonElement>
  onPointerDown?: PointerEventHandler<HTMLDivElement>
  onPointerUp?: PointerEventHandler<HTMLDivElement>
  onPointerEnter?: PointerEventHandler<HTMLDivElement>
  onPointerLeave?: PointerEventHandler<HTMLDivElement>
}

export function NodeActionMenu({
  nodeLabels: nodeLabelsProp,
  onDelete,
  onDuplicate,
  onMove,
  onPointerDown,
  onPointerUp,
  onPointerEnter,
  onPointerLeave,
}: NodeActionMenuProps) {
  const ctx = useContext(EditorCanvasI18nContext)
  const labels = nodeLabelsProp ?? ctx?.nodeMenu ?? null
  if (!labels) {
    throw new Error(
      'NodeActionMenu: pass nodeLabels when inside a portal, or render under EditorCanvasI18nProvider',
    )
  }
  const deleteOnlyToolbar = !onMove && !onDuplicate

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-center gap-1 rounded-lg border p-1 shadow-xl backdrop-blur-md',
        deleteOnlyToolbar
          ? 'border-white/15 bg-zinc-950/35 shadow-lg'
          : 'border-border bg-background/95 shadow-xl',
      )}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerUp={onPointerUp}
    >
      {onMove && (
        <button
          aria-label={labels.move}
          className="tooltip-trigger rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={onMove}
          title={labels.move}
          type="button"
        >
          <Move className="h-4 w-4" />
        </button>
      )}
      {onDuplicate && (
        <button
          aria-label={labels.duplicate}
          className="tooltip-trigger rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={onDuplicate}
          title={labels.duplicate}
          type="button"
        >
          <Copy className="h-4 w-4" />
        </button>
      )}
      <button
        aria-label={labels.delete}
        className="tooltip-trigger rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
        title={labels.delete}
        type="button"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
