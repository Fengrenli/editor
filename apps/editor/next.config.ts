import type { NextConfig } from 'next'
import path from 'node:path'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** Monorepo root when `next build` runs from `apps/editor`. */
const workspaceRoot = path.resolve(process.cwd(), '../..')

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: workspaceRoot,
  /** Next 运行时 require 子路径；Bun/monorepo 下 standalone 易漏打该包，导致 Electron 内 MODULE_NOT_FOUND */
  outputFileTracingIncludes: {
    '/*': [
      './node_modules/@swc/helpers/**/*',
      '../../node_modules/@next/env/**/*',
      '../../node_modules/@swc/helpers/**/*',
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['three', '@pascal-app/viewer', '@pascal-app/core', '@pascal-app/editor'],
  turbopack: {
    resolveAlias: {
      // Required for `next-intl` + Turbopack dev (plugin merge can miss this in monorepo setups)
      'next-intl/config': './i18n/request.ts',
      react: './node_modules/react',
      three: './node_modules/three',
      '@react-three/fiber': './node_modules/@react-three/fiber',
      '@react-three/drei': './node_modules/@react-three/drei',
    },
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  images: {
    unoptimized: process.env.NEXT_PUBLIC_ASSETS_CDN_URL?.startsWith('http://localhost') ?? false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
}

export default withNextIntl(nextConfig)
