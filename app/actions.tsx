'use server'

import { CoreMessage, streamText } from 'ai'
import { createStreamableValue } from 'ai/rsc'
import { openai, createOpenAI as createGroq } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'

const groq = createGroq({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

function getModel(modelName: string) {
  switch (modelName) {
    case 'chatgpt-4o-latest':
      return openai('chatgpt-4o-latest')
    case 'gpt-4o-mini':
      return openai('gpt-4o-mini')
    case 'claude-3-5-sonnet':
      return anthropic('claude-3-5-sonnet-20240620')
    case 'gemini-1.5-pro':
      return google('gemini-1.5-pro-latest')
    case 'gemini-1.5-flash':
      return google('gemini-1.5-flash-latest')
    case 'llama-3.1-70b':
      return groq('llama-3.1-70b-versatile')
    case 'llama-3.1-8b':
      return groq('llama-3.1-8b-instant')
    default:
      throw new Error('無効なモデルが選択されました')
  }
}

export async function continueConversation(
  messages: CoreMessage[],
  model: string,
) {
  const result = await streamText({
    model: getModel(model),
    messages,
  })

  const stream = createStreamableValue(result.textStream)
  return stream.value
}
