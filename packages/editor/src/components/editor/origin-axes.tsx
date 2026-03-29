'use client'

import { sceneRegistry, useScene } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { BufferGeometry, Float32BufferAttribute, type Group, type LineSegments } from 'three'
import { EDITOR_LAYER } from '../../lib/constants'

const AXIS_LENGTH = 3.8

/**
 * World axes at plan origin on the current level: +X red, +Y green, +Z blue.
 * Follows selected level Y like the grid; editor layer only.
 */
export function OriginAxes() {
  const groupRef = useRef<Group>(null)
  const linesRef = useRef<LineSegments>(null)
  const levelId = useViewer((s) => s.selection.levelId)
  const nodes = useScene((s) => s.nodes)

  const geometry = useMemo(() => {
    const positions = new Float32Array([
      0,
      0,
      0,
      AXIS_LENGTH,
      0,
      0, // +X
      0,
      0,
      0,
      0,
      AXIS_LENGTH,
      0, // +Y
      0,
      0,
      0,
      0,
      0,
      AXIS_LENGTH, // +Z
    ])
    /** 高饱和端点色：近原点略暗、远端更亮，避免被 tone mapping / 深色场景压成灰 */
    const colors = new Float32Array([
      1, 0.45, 0.35, 1, 0.05, 0.02, // +X 红
      0.35, 1, 0.45, 0.02, 1, 0.05, // +Y 绿
      0.45, 0.65, 1, 0.05, 0.35, 1, // +Z 蓝
    ])
    const geom = new BufferGeometry()
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geom.setAttribute('color', new Float32BufferAttribute(colors, 3))
    return geom
  }, [])

  useLayoutEffect(() => {
    const line = linesRef.current
    if (line) {
      line.raycast = () => {}
    }
  }, [])

  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g) {
      return
    }

    let targetY = 0
    if (levelId) {
      const mesh = sceneRegistry.nodes.get(levelId)
      if (mesh) {
        targetY = mesh.position.y
      }
    }

    const levelNode = levelId ? nodes[levelId] : null
    g.visible = Boolean(levelNode?.type === 'level')

    const nextY = g.position.y + (targetY - g.position.y) * Math.min(1, delta * 12)
    g.position.set(0, nextY, 0)
  })

  return (
    <group ref={groupRef}>
      <lineSegments geometry={geometry} layers={EDITOR_LAYER} ref={linesRef} renderOrder={1000}>
        <lineBasicMaterial
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
          transparent
          vertexColors
        />
      </lineSegments>
    </group>
  )
}
