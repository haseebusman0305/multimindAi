'use client'

import { type CoreMessage } from 'ai'
import {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
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

export interface ChatHandle {
  sendMessage: (message: string) => void
}

interface ChatProps {
  onRemove: () => void
  isSync: boolean
  onSyncChange: (sync: boolean) => void
  syncedInput: string
  onSyncedInputChange: (input: string) => void
  onSend: (message: string, model: string) => void
  isSyncEnabled: boolean
  messages: CoreMessage[]
}

const Chat = forwardRef<ChatHandle, ChatProps>(
  (
    {
      onRemove,
      isSync,
      onSyncChange,
      syncedInput,
      onSyncedInputChange,
      onSend,
      isSyncEnabled,
      messages,
    },
    ref,
  ) => {
    const [input, setInput] = useState('')
    const [selectedModel, setSelectedModel] = useState('chatgpt')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const cardContentRef = useRef<HTMLDivElement>(null)

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
        setSelectedModel(value)
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

        if (!messageToSend.trim()) return

        setInput('')
        setError(null)
        if (isSync) {
          onSyncedInputChange('')
        }

        setIsLoading(true)

        try {
          await onSend(messageToSend, selectedModel)
          setIsLoading(false)
        } catch (error) {
          console.error('Error in handleSubmit:', error)
          setError('An error occurred while processing your request. Please try again.')
          setIsLoading(false)
        }
      },
      [input, syncedInput, isSync, selectedModel, onSend, onSyncedInputChange],
    )

    const getModelInfo = useCallback((model: string) => {
      switch (model) {
        case 'chatgpt':
          return {
            title: 'ChatGPT Turbo',
            description:
              'GPT-3.5 Turbo is a fast and efficient language model suitable for a wide range of tasks.',
          }
        case 'claude':
          return {
            title: 'Claude',
            description:
              'Claude is an AI assistant created by Anthropic to be helpful, harmless, and honest.',
          }
        case 'gemini':
          return {
            title: 'Gemini',
            description:
              "Gemini is Google's largest and most capable AI model, with strong performance across a wide range of tasks.",
          }
        default:
          return {
            title: 'Unknown Model',
            description: 'Information for the selected model is not available.',
          }
      }
    }, [])

    useEffect(() => {
      if (cardContentRef.current) {
        cardContentRef.current.scrollTop = cardContentRef.current.scrollHeight
      }
    }, [messages, isLoading])

    const renderStyledMessage = (content: string) => {
      const lines = content.split('\n')
      return lines.map((line, index) => {
        // Bold
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        line = line.replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Underline
        line = line.replace(/__(.*?)__/g, '<u>$1</u>')
        // Strikethrough
        line = line.replace(/~~(.*?)~~/g, '<del>$1</del>')
        // Headers
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold mb-2">{line.slice(2)}</h1>
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-bold mb-2">{line.slice(3)}</h2>
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-bold mb-2">{line.slice(4)}</h3>
        }
        // List items
        if (line.startsWith('* ')) {
          return <li key={index} className="ml-4">• {line.slice(2)}</li>
        }
        // Default paragraph
        return <p key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: line }} />
      })
    }

    return (
      <Card className="flex h-full flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center justify-between space-x-2">
            <Select onValueChange={handleModelChange} value={selectedModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chatgpt">ChatGPT</SelectItem>
                <SelectItem value="claude">Claude</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
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

        <CardContent className="flex-1 overflow-y-auto" ref={cardContentRef}>
          {messages.length > 0 ? (
            messages.map((m, i) => (
              <div key={i} className="mb-4">
                <div className="flex items-start">
                  {m.role === 'assistant' && (
                    <Avatar className="mr-2 h-8 w-8">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`${
                      m.role === 'user'
                        ? 'ml-auto rounded-lg bg-blue-100 px-4 py-2 dark:bg-blue-950'
                        : 'rounded-lg bg-gray-100 px-4 py-2 dark:bg-gray-800'
                    }`}
                  >
                    {renderStyledMessage(m.content as string)}
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
          {isLoading && (
            <div className="mb-4 whitespace-pre-wrap">
              <div className="flex items-start">
                <Avatar className="mr-2 h-8 w-8">
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-lg bg-gray-100 px-4 py-2 dark:bg-gray-800">
                  <span className="loading loading-dots loading-sm"></span>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="mt-4 text-red-500">{error}</div>
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
              disabled={isSync && isSyncEnabled || isLoading}
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              disabled={isSync && isSyncEnabled || isLoading}
            >
              <SendIcon className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    )
  }
)

Chat.displayName = 'Chat'

export default Chat