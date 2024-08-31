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
    const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

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

        if (!messageToSend.trim()) return

        const newMessages: CoreMessage[] = [
          ...messages,
          { content: messageToSend, role: 'user' },
        ]

        setMessages(newMessages)
        setInput('')
        setError(null)
        if (isSync) {
          onSyncedInputChange('')
        }

        sendMessage(messageToSend)
        setIsLoading(true)

        try {
          const result = await continueConversation(newMessages, selectedModel)

          for await (const content of readStreamableValue(result)) {
            setMessages((prevMessages) => [
              ...prevMessages,
              {
                role: 'assistant',
                content: content as string,
              },
            ])
          }
        } catch (error) {
          console.error('Error in handleSubmit:', error)
          setError('An error occurred while processing your request. Please try again.')
        } finally {
          setIsLoading(false)
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
        case 'gpt-3.5-turbo':
          return {
            title: 'GPT-3.5 Turbo',
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

    return (
      <Card className="flex h-full flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center justify-between space-x-2">
            <Select onValueChange={handleModelChange} value={selectedModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
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
  },
)

Chat.displayName = 'Chat'

export default Chat