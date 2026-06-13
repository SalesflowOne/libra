/*
 * SPDX-License-Identifier: AGPL-3.0-only
 * providers.ts
 * Copyright (C) 2025 Nextify Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 */

import { env } from '@/env.mjs'
import { anthropic } from '@ai-sdk/anthropic'
import { createAzure } from '@ai-sdk/azure'
import { createOpenAI } from '@ai-sdk/openai'
import { xai } from '@ai-sdk/xai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { customProvider } from 'ai'

type AzureConfig = {
  resourceName: string
  apiKey: string
  apiVersion: string
  baseURL?: string
}

function readEnv(key: string): string | undefined {
  const fromProcess = process.env[key]
  if (typeof fromProcess === 'string' && fromProcess.length > 0) {
    return fromProcess
  }

  const fromEnv = (env as unknown as Record<string, unknown>)[key]
  return typeof fromEnv === 'string' ? fromEnv : undefined
}

function isConfigured(value?: string | null): boolean {
  if (!value?.trim()) return false
  if (value.includes('placeholder')) return false
  return true
}

function createAzureProvider() {
  const azureConfig: AzureConfig = {
    resourceName: readEnv('AZURE_RESOURCE_NAME') || '',
    apiKey: readEnv('AZURE_API_KEY') || '',
    apiVersion: 'preview',
  }

  const azureBaseUrl = readEnv('AZURE_BASE_URL')
  if (azureBaseUrl) {
    const baseUrl = azureBaseUrl.endsWith('/') ? azureBaseUrl : `${azureBaseUrl}/`
    const accountId = readEnv('CLOUDFLARE_ACCOUNT_ID')
    const gatewayName = readEnv('CLOUDFLARE_AIGATEWAY_NAME')
    const resourceName = readEnv('AZURE_RESOURCE_NAME')

    if (accountId && gatewayName && resourceName) {
      azureConfig.baseURL = `${baseUrl}${accountId}/${gatewayName}/azure-openai/${resourceName}/openai`
    }
  }

  return createAzure(azureConfig)
}

/**
 * Build provider at request time so Cloudflare Worker secrets in process.env are available.
 */
export function getMyProvider() {
  const isAzureConfigured =
    isConfigured(readEnv('AZURE_API_KEY')) && isConfigured(readEnv('AZURE_RESOURCE_NAME'))
  const isOpenRouterConfigured = isConfigured(readEnv('OPENROUTER_API_KEY'))
  const isOpenAIConfigured = isConfigured(readEnv('OPENAI_API_KEY'))

  const openaiProvider = createOpenAI({
    apiKey: readEnv('OPENAI_API_KEY') || '',
  })

  const azure = isAzureConfigured ? createAzureProvider() : null
  const openrouterProvider = isOpenRouterConfigured
    ? createOpenRouter({
        apiKey: readEnv('OPENROUTER_API_KEY') || '',
        headers: {
          'HTTP-Referer': readEnv('NEXT_PUBLIC_APP_URL') || 'https://libra.dev',
          'X-Title': 'Libra AI',
        },
      })
    : null

  const databricksClaude =
    isConfigured(readEnv('DATABRICKS_TOKEN')) && isConfigured(readEnv('DATABRICKS_BASE_URL'))
      ? createOpenAI({
          baseURL: readEnv('DATABRICKS_BASE_URL'),
          apiKey: readEnv('DATABRICKS_TOKEN') || '',
        })
      : null

  const openaiModel = (model: string) => {
    if (!isOpenAIConfigured) {
      throw new Error(
        'OpenAI is not configured. Set OPENAI_API_KEY on the worker or configure Azure OpenAI credentials.',
      )
    }
    return openaiProvider(model)
  }

  return customProvider({
    languageModels: {
      'chat-model-reasoning-azure': isAzureConfigured
        ? azure!(readEnv('AZURE_DEPLOYMENT_NAME') || 'gpt-4.1')
        : openaiModel('gpt-4.1'),
      'chat-model-reasoning-azure-mini': isAzureConfigured
        ? azure!('gpt-4.1-mini')
        : openaiModel('gpt-4.1-mini'),
      'chat-model-reasoning-azure-nano': isAzureConfigured
        ? azure!('gpt-4.1-nano')
        : openaiModel('gpt-4.1-nano'),
      'chat-model-databricks-claude': databricksClaude
        ? databricksClaude('databricks-claude-3-7-sonnet')
        : openaiModel('gpt-4.1'),
      'chat-model-reasoning-anthropic': openrouterProvider
        ? openrouterProvider('anthropic/claude-sonnet-4')
        : isConfigured(readEnv('ANTHROPIC_API_KEY'))
          ? anthropic('claude-sonnet-4-20250514')
          : openaiModel('gpt-4.1'),
      'chat-model-reasoning-google': openrouterProvider
        ? openrouterProvider('google/gemini-2.5-pro-preview')
        : openaiModel('gpt-4.1'),
      'chat-model-reasoning-xai': isConfigured(readEnv('XAI_API_KEY'))
        ? xai('grok-3-fast-beta')
        : openaiModel('gpt-4.1'),
    },
    imageModels: {
      'small-model-xai': xai.image('grok-2-image'),
    },
  })
}

// Backward-compatible export for any legacy imports
export const myProvider = getMyProvider()
