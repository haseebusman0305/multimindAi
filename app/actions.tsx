'use server'

import { CoreMessage } from 'ai'
import OpenAI from 'openai'
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatAnthropic } from "@langchain/anthropic";
import { config } from 'dotenv';

config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const gemini = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
  modelName: "gemini-pro",
});

const claude = new ChatAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  modelName: "claude-3-opus-20240229",
});

function getModel(modelName: string) {
  switch (modelName) {
    case 'chatgpt':
      return async (messages: CoreMessage[]) => {
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: messages as any,
          stream: true,
        })
        return response
      }
    case 'claude':
      return async (messages: CoreMessage[]) => {
        const response = await claude.stream(messages.map(m => ({ content: m.content, role: m.role })))
        return response
      }
    case 'gemini':
      return async (messages: CoreMessage[]) => {
        const response = await gemini.stream(messages.map(m => ({ content: m.content, role: m.role })))
        return response
      }
    default:
      throw new Error('An invalid model was selected')
  }
}

export async function continueConversation(
  messages: CoreMessage[],
  model: string,
): Promise<{ status: 'success' | 'error'; content?: string; message?: string }> {
  try {
    console.log('continueConversation called with model:', model)
    const modelFunction = getModel(model)
    const result = await modelFunction(messages)

    let fullResponse = '';
    for await (const chunk of result) {
      if (model === 'gpt-3.5-turbo') {
        fullResponse += (chunk as any).choices[0]?.delta?.content || '';
      } else {
        const chunkWithContent = chunk as { content?: string };
        fullResponse += chunkWithContent.content || '';
      }
    }

    console.log('Full response:', fullResponse)

    return {
      status: 'success',
      content: fullResponse
    }
  } catch (error) {
    console.error('Error in continueConversation:', error)
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    }
  }
}