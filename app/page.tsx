import { ModeToggle } from '@/components/mode-toggle'
import Chats from './components/chats'

export default function Home() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex-shrink-0 p-4 text-right">
        <ModeToggle />
      </header>
      <main className="flex-1 overflow-hidden">
        <Chats />
      </main>
    </div>
  )
}
