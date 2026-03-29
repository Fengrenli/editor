import {
  type AnyNodeId,
  GuideNode,
  removeAssetByUrl,
  ScanNode,
  saveAsset,
  type useScene,
} from '@pascal-app/core'

type SceneGetState = typeof useScene.getState

function referenceDisplayName(file: File): string {
  const name = file.name.trim()
  if (!name) {
    return 'Reference'
  }
  return name.replace(/\.[^/.]+$/, '') || name
}

/**
 * Persist scan/guide under level using IndexedDB (`asset://`) and create the scene node.
 * Used when the host does not supply {@link SitePanelProps.onUploadAsset} (e.g. local app).
 */
export async function uploadLocalLevelReference(
  getState: SceneGetState,
  levelId: string,
  file: File,
  type: 'scan' | 'guide',
): Promise<void> {
  const url = await saveAsset(file)
  const { createNode } = getState()
  const name = referenceDisplayName(file)

  if (type === 'guide') {
    createNode(
      GuideNode.parse({
        url,
        name,
        opacity: 90,
        scale: 1,
        position: [0, 0, 0],
      }),
      levelId as AnyNodeId,
    )
    return
  }

  createNode(
    ScanNode.parse({
      url,
      name,
      position: [0, 0, 0],
    }),
    levelId as AnyNodeId,
  )
}

export async function deleteRemoteOrLocalAsset(url: string): Promise<void> {
  await removeAssetByUrl(url)
}
