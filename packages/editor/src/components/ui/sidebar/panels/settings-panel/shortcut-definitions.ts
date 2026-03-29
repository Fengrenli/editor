/** Key combo source strings (ShortcutToken); not localized. */

export type ShortcutDefinitionItem = {
  keys: string[]
  id: string
  noteId?: string
}

export type ShortcutCategoryDef = {
  id: string
  items: ShortcutDefinitionItem[]
}

export const SHORTCUT_CATEGORIES: ShortcutCategoryDef[] = [
  {
    id: 'editorNavigation',
    items: [
      { keys: ['1'], id: 'switchSitePhase' },
      { keys: ['2'], id: 'switchStructurePhase' },
      { keys: ['3'], id: 'switchFurnishPhase' },
      { keys: ['S'], id: 'switchStructureLayer' },
      { keys: ['F'], id: 'switchFurnishLayer' },
      { keys: ['Z'], id: 'switchZonesLayer' },
      { keys: ['Cmd/Ctrl', 'Arrow Up'], id: 'selectNextLevel' },
      { keys: ['Cmd/Ctrl', 'Arrow Down'], id: 'selectPrevLevel' },
      { keys: ['Cmd/Ctrl', 'B'], id: 'toggleSidebar' },
    ],
  },
  {
    id: 'modesHistory',
    items: [
      { keys: ['V'], id: 'selectMode' },
      { keys: ['B'], id: 'buildMode' },
      { keys: ['Esc'], id: 'escCancelTool' },
      { keys: ['Delete / Backspace'], id: 'deleteSelected' },
      { keys: ['Cmd/Ctrl', 'Z'], id: 'undo' },
      { keys: ['Cmd/Ctrl', 'Shift', 'Z'], id: 'redo' },
    ],
  },
  {
    id: 'selection',
    items: [
      {
        keys: ['Cmd/Ctrl', 'Left click'],
        id: 'multiSelect',
        noteId: 'multiSelectNote',
      },
    ],
  },
  {
    id: 'drawingTools',
    items: [
      {
        keys: ['Shift'],
        id: 'shiftDisableSnap',
        noteId: 'shiftDisableSnapNote',
      },
    ],
  },
  {
    id: 'itemPlacement',
    items: [
      { keys: ['R'], id: 'rotateItemCw' },
      { keys: ['T'], id: 'rotateItemCcw' },
      {
        keys: ['Shift'],
        id: 'shiftBypassPlacement',
        noteId: 'shiftBypassPlacementNote',
      },
    ],
  },
  {
    id: 'camera',
    items: [
      {
        keys: ['Middle click'],
        id: 'middleClickPan',
        noteId: 'middleClickPanNote',
      },
      {
        keys: ['Right click'],
        id: 'rightClickOrbit',
        noteId: 'rightClickOrbitNote',
      },
    ],
  },
]
