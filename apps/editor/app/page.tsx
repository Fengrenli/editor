'use client'

import { Editor, useLocalEditorSession } from '@pascal-app/editor'

export default function Home() {
  const { ready, projectId, settingsPanelProps } = useLocalEditorSession()

  if (!(ready && projectId)) {
    return <div className="h-screen w-screen bg-[#1f2433]" />
  }

  return (
    <div className="h-screen w-screen">
      <Editor
        projectId={projectId}
        settingsPanelProps={{
          ...settingsPanelProps,
          projectId,
        }}
      />
    </div>
  )
}
