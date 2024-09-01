'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { SendIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import Chat, { ChatHandle } from './chat'
import { CoreMessage } from 'ai'
import { continueConversation } from '../actions'

export default function Chats() {
  const [chats, setChats] = useState([{ id: 1, isSync: false, messages: [] as CoreMessage[] }])
  const [syncedInput, setSyncedInput] = useState('')

  const chatRefs = useRef<{ [id: number]: ChatHandle | null }>({})

  const isSyncEnabled = useMemo(
    () => chats.some((chat) => chat.isSync),
    [chats],
  )

  const addChat = () => {
    const newId =
      chats.length > 0 ? Math.max(...chats.map((chat) => chat.id)) + 1 : 1
    setChats([...chats, { id: newId, isSync: false, messages: [] }])
  }

  const removeChat = (id: number) => {
    setChats(chats.filter((chat) => chat.id !== id))
  }

  const handleSyncChange = useCallback((id: number, sync: boolean) => {
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === id ? { ...chat, isSync: sync } : chat,
      ),
    )
  }, [])

  const handleSyncedInputChange = useCallback((input: string) => {
    setSyncedInput(input)
  }, [])

  const handleBulkSend = useCallback(() => {
    chats.forEach((chat) => {
      if (chat.isSync && chatRefs.current[chat.id]) {
        chatRefs.current[chat.id]?.sendMessage(syncedInput)
      }
    })
    setSyncedInput('')
  }, [chats, syncedInput])

  const handleSend = useCallback(async (chatId: number, message: string, model: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    const newMessages = [...chat.messages, { role: 'user', content: message } as CoreMessage];
    setChats(prevChats => prevChats.map(c => c.id === chatId ? { ...c, messages: newMessages } : c));

    const result = await continueConversation(newMessages, model);

    if (result.status === 'success' && result.content) {
      setChats(prevChats => prevChats.map(c =>
        c.id === chatId
          ? { ...c, messages: [...newMessages, { role: 'assistant', content: result.content } as CoreMessage] }
          : c
      ));
    } else {
      console.error('Error from AI:', result.message);
      // Handle error (e.g., display error message to user)
    }
  }, [chats]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-full space-x-4 overflow-x-auto p-4">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className="h-full w-[calc(33.33%-1rem)] min-w-[320px] max-w-[480px] flex-shrink-0"
          >
            <Chat
              onRemove={() => removeChat(chat.id)}
              isSync={chat.isSync}
              onSyncChange={(sync) => handleSyncChange(chat.id, sync)}
              syncedInput={syncedInput}
              onSyncedInputChange={handleSyncedInputChange}
              messages={chat.messages}
              onSend={(message, model) => handleSend(chat.id, message, model)}
              ref={(el) => {
                if (el) {
                  chatRefs.current[chat.id] = el
                } else {
                  delete chatRefs.current[chat.id]
                }
              }}
              isSyncEnabled={isSyncEnabled}
            />
          </div>
        ))}
        <button
          onClick={addChat}
          className="flex h-full w-[calc(33.33%-1rem)] min-w-[320px] max-w-[480px] flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-700"
        >
          Add a new chat
        </button>
      </div>
      <div className="mt-4 border-t p-4">
        <div className="mx-auto flex w-full max-w-4xl items-end rounded-md border p-2">
          <Textarea
            value={syncedInput}
            onChange={(e) => setSyncedInput(e.target.value)}
            placeholder="Enter a synchronized message..."
            className="flex-grow resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={!isSyncEnabled}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleBulkSend}
            disabled={!isSyncEnabled || !syncedInput.trim()}
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}