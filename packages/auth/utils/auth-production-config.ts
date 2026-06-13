/*
 * SPDX-License-Identifier: AGPL-3.0-only
 * auth-production-config.ts
 * Copyright (C) 2025 Nextify Limited
 */

function parseOrigin(value: string | undefined): string | null {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function getCookieDomain(hostname: string): string {
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return 'localhost'
  }

  const parts = hostname.split('.')
  if (parts.length <= 2) {
    return `.${hostname}`
  }

  return `.${parts.slice(-2).join('.')}`
}

export function getAuthProductionConfig() {
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'
  const appOrigin = parseOrigin(appUrl) ?? 'http://localhost:3000'
  const hostname = new URL(appOrigin).hostname

  const trustedOrigins = Array.from(
    new Set(
      [
        appOrigin,
        parseOrigin(process.env['NEXT_PUBLIC_CDN_URL']),
        parseOrigin(process.env['NEXT_PUBLIC_DEPLOY_URL']),
        parseOrigin(process.env['NEXT_PUBLIC_DISPATCHER_URL']),
        parseOrigin(process.env['NEXT_PUBLIC_DOCS_URL']),
        'http://localhost:3000',
        'http://localhost:3004',
        'http://localhost:3007',
        'http://localhost:3008',
      ].filter((origin): origin is string => Boolean(origin))
    )
  )

  return {
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
        domain: getCookieDomain(hostname),
      },
    },
    trustedOrigins,
  }
}
