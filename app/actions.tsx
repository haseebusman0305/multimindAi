'use server'

import { CoreMessage, streamText } from 'ai'
import { createStreamableValue } from 'ai/rsc'
import OpenAI from 'openai'
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatAnthropic } from "@langchain/anthropic";

type AIMessageChunk = {
  content: string;
};

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
    case 'gpt-3.5-turbo':
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
) {
  try {
    const modelFunction = getModel(model)
    const result = await modelFunction(messages)

    const stream = createStreamableValue(
      (async function* () {
        for await (const chunk of result) {
          if (model === 'gpt-3.5-turbo') {
            yield (chunk as OpenAI.Chat.Completions.ChatCompletionChunk).choices[0]?.delta?.content || ''
          } else {
            yield chunk.content || ''
          }
        }
      })()
    )
    return stream.value
  } catch (error) {
    console.error('Error in continueConversation:', error)
    if (error instanceof Error) {
      return createStreamableValue(`An error occurred: ${error.message}. Please try again.`).value
    } else {
      return createStreamableValue('An unknown error occurred. Please try again.').value
    }
  }
}