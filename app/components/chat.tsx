'use client'

import { type CoreMessage } from 'ai'
import { readStreamableValue } from 'ai/rsc'
import {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { Bot, SendIcon, X } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { continueConversation } from '../actions'

export interface ChatHandle {
  sendMessage: (message: string) => void
}

interface ChatProps {
  onRemove: () => void
  isSync: boolean
  onSyncChange: (sync: boolean) => void
  syncedInput: string
  onSyncedInputChange: (input: string) => void
  sendMessage: (message: string) => void
  isSyncEnabled: boolean
}

const Chat = forwardRef<ChatHandle, ChatProps>(
  (
    {
      onRemove,
      isSync,
      onSyncChange,
      syncedInput,
      onSyncedInputChange,
      sendMessage,
      isSyncEnabled,
    },
    ref,
  ) => {
    const [messages, setMessages] = useState<CoreMessage[]>([])
    const [input, setInput] = useState('')
    const [selectedModel, setSelectedModel] = useState('chatgpt-4o-latest')

    useEffect(() => {
      if (isSync) {
        setInput(syncedInput)
      }
    }, [isSync, syncedInput])

    useImperativeHandle(ref, () => ({
      sendMessage: async (message: string) => {
        await handleSubmit(new Event('submit') as any, message)
      },
    }))

    const handleModelChange = useCallback(
      (value: string) => {
        if (messages.length > 0) {
          if (
            window.confirm(
              'Changing the model will reset the chat history. Are you sure?',
            )
          ) {
            setSelectedModel(value)
            setMessages([])
          }
        } else {
          setSelectedModel(value)
        }
      },
      [messages],
    )

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newInput = e.target.value
        setInput(newInput)
        if (isSync) {
          onSyncedInputChange(newInput)
        }
      },
      [isSync, onSyncedInputChange],
    )

    const handleSubmit = useCallback(
      async (e: React.FormEvent, overrideMessage?: string) => {
        e.preventDefault()
        const messageToSend = overrideMessage || (isSync ? syncedInput : input)

        const newMessages: CoreMessage[] = [
          ...messages,
          { content: messageToSend, role: 'user' },
        ]

        setMessages(newMessages)
        setInput('')
        if (isSync) {
          onSyncedInputChange('')
        }

        sendMessage(messageToSend)

        const result = await continueConversation(newMessages, selectedModel)

        for await (const content of readStreamableValue(result)) {
          setMessages([
            ...newMessages,
            {
              role: 'assistant',
              content: content as string,
            },
          ])
        }
      },
      [
        messages,
        input,
        syncedInput,
        isSync,
        selectedModel,
        sendMessage,
        onSyncedInputChange,
      ],
    )

    const getModelInfo = useCallback((model: string) => {
      switch (model) {
        case 'chatgpt-4o-latest':
          return {
            title: 'GPT-4o latest',
            description:
              "GPT-4o latest is OpenAI's most recent language model with advanced natural language processing capabilities...",
          }
        case 'gpt-4o-mini':
          return {
            title: 'GPT-4o mini',
            description:
              "GPT-4o mini is OpenAI's most advanced and cost-effective small model...",
          }
        case 'claude-3-5-sonnet':
          return {
            title: 'Claude 3.5 Sonnet',
            description:
              "Claude 3.5 Sonnet is Anthropic's high-performance language model capable of handling a wide range of tasks...",
          }
        case 'gemini-1.5-pro':
          return {
            title: 'Gemini 1.5 Pro',
            description:
              "Gemini 1.5 Pro is Google's high-performance language model capable of handling a wide range of tasks...",
          }
        case 'gemini-1.5-flash':
          return {
            title: 'Gemini 1.5 Flash',
            description:
              "Gemini 1.5 Flash is Google's fastest and most cost-effective model for high-frequency tasks...",
          }
        case 'llama-3.1-70b':
          return {
            title: 'LLaMA 3.1 70B',
            description:
              'LLaMA 3.1 70B is a large-scale language model suitable for diverse tasks...',
          }
        case 'llama-3.1-8b':
          return {
            title: 'LLaMA 3.1 8B',
            description:
              'LLaMA 3.1 8B is a small-scale language model that is fast and compact...',
          }
        default:
          return {
            title: 'Unknown Model',
            description: 'Information for the selected model is not available.',
          }
      }
    }, [])

    return (
      <Card className="flex h-full flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center justify-between space-x-2">
            <Select onValueChange={handleModelChange} value={selectedModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chatgpt-4o-latest">GPT-4o latest</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o mini</SelectItem>
                <SelectItem value="claude-3-5-sonnet">
                  Claude 3.5 Sonnet
                </SelectItem>
                <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                <SelectItem value="gemini-1.5-flash">
                  Gemini 1.5 Flash
                </SelectItem>
                <SelectItem value="llama-3.1-70b">LLaMA 3.1 70B</SelectItem>
                <SelectItem value="llama-3.1-8b">LLaMA 3.1 8B</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Switch
                checked={isSync}
                onCheckedChange={onSyncChange}
                aria-label="Sync"
              />
              <span
                className={`text-xs ${isSync ? 'opacity-100' : 'opacity-25'}`}
              >
                Synced
              </span>
            </div>
            <Button size="icon" variant="ghost" onClick={onRemove}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto">
          {messages.length > 0 ? (
            messages.map((m, i) => (
              <div key={i} className="whitespace-pre-wrap">
                <div className="flex items-start">
                  {m.role === 'assistant' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`${m.role === 'user' ? 'mb-4 max-w-lg rounded-lg bg-blue-100 px-4 py-2 dark:bg-blue-950' : 'mb-5 ml-3 p-1'}`}
                  >
                    {m.content as string}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{getModelInfo(selectedModel).title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{getModelInfo(selectedModel).description}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>

        <CardFooter className="flex-shrink-0">
          <form
            onSubmit={handleSubmit}
            className="flex w-full items-end rounded-md border p-2"
          >
            <Textarea
              value={input}
              onChange={handleInputChange}
              placeholder="Enter a message..."
              className="flex-grow resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={isSync && isSyncEnabled}
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              disabled={isSync && isSyncEnabled}
            >
              <SendIcon className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    )
  },
)

Chat.displayName = 'Chat'

export default Chat
