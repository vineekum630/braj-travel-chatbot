import { useEffect, useRef, useState } from 'react'
import { ArrowUp, MapPin, Menu, MessageCircle, Plus, Sparkles, X } from 'lucide-react'
import './App.css'

type Message = { role: 'assistant' | 'user'; content: string }
type Session = { id: string; title: string; messages: Message[] }
type ApiStatus = 'checking' | 'online' | 'offline'

const greeting: Message = {
  role: 'assistant',
  content: 'Radhe Radhe! I’m your Braj travel companion. From the lanes of Mathura to the quiet ghats of Vrindavan, I can help you shape a trip that feels just right. What are you dreaming up?',
}
const suggestions = ['Plan a one-day temple trail', 'Best time to visit Prem Mandir?', 'How do I get from Mathura to Barsana?']
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

function newSession(): Session {
  return { id: crypto.randomUUID(), title: 'A new Braj journey', messages: [greeting] }
}

function loadSessions(): Session[] {
  try {
    const stored = localStorage.getItem('braj-chat-sessions')
    const sessions = stored ? JSON.parse(stored) as Session[] : []
    return sessions.length ? sessions : [newSession()]
  } catch {
    return [newSession()]
  }
}

function App() {
  const [sessions, setSessions] = useState<Session[]>(loadSessions)
  const [activeId, setActiveId] = useState(() => localStorage.getItem('braj-chat-active') ?? '')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')
  const [menuOpen, setMenuOpen] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const active = sessions.find((session) => session.id === activeId) ?? sessions[0]
  const activeSessionId = active?.id

  useEffect(() => {
    localStorage.setItem('braj-chat-sessions', JSON.stringify(sessions))
    if (activeSessionId) localStorage.setItem('braj-chat-active', activeSessionId)
  }, [activeSessionId, sessions])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [active?.messages, busy])

  useEffect(() => {
    let isCurrent = true

    async function checkApi() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/health`)
        const data = await response.json() as { status?: string; service?: string }
        if (!response.ok || data.status !== 'ok' || data.service !== 'braj-chatbot-api') {
          throw new Error('API health check failed')
        }
        if (isCurrent) setApiStatus('online')
      } catch {
        if (isCurrent) setApiStatus('offline')
      }
    }

    void checkApi()
    const intervalId = window.setInterval(() => void checkApi(), 30_000)
    return () => {
      isCurrent = false
      window.clearInterval(intervalId)
    }
  }, [])

  function startNewChat() {
    const session = newSession()
    setSessions((current) => [session, ...current])
    setActiveId(session.id)
    setDraft('')
    setError('')
    setMenuOpen(false)
  }

  async function sendMessage(text = draft) {
    const content = text.trim()
    if (!content || busy || !active) return
    const history: Message[] = [...active.messages, { role: 'user', content }]
    const title = active.messages.length === 1 ? content.slice(0, 38) : active.title
    setSessions((current) => current.map((session) => session.id === active.id ? { ...session, title, messages: history } : session))
    setDraft('')
    setError('')
    setBusy(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      const data = await response.json() as { reply?: string; error?: string }
      if (!response.ok) throw new Error(data.error ?? 'The guide is unavailable right now.')
      if (!data.reply) throw new Error('The guide returned an empty reply. Please try again.')
      setSessions((current) => current.map((session) => session.id === active.id
        ? { ...session, messages: [...history, { role: 'assistant', content: data.reply! }] }
        : session))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not reach the travel guide. Check that the backend is running.')
    } finally {
      setBusy(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  return (
    <div className="app-shell">
      {menuOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar${menuOpen ? ' sidebar-open' : ''}`}>
        <div className="brand-lockup"><span className="brand-mark"><MapPin size={18} /></span><span><strong>braj</strong><small>TRAVEL COMPANION</small></span><button className="icon-button close-menu" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={19} /></button></div>
        <button className="new-chat-button" onClick={startNewChat}><Plus size={17} /> New conversation</button>
        <div className="history-heading">YOUR JOURNEYS</div>
        <div className="history-list">{sessions.map((session) => <button className={`history-item${active?.id === session.id ? ' history-item-active' : ''}`} key={session.id} onClick={() => { setActiveId(session.id); setMenuOpen(false); setError('') }}><MessageCircle size={16} /><span>{session.title}</span></button>)}</div>
        <div className="sidebar-bottom"><div className="sidebar-note"><span className="note-dot" />Rooted in Braj, here for your journey.</div><div className="sidebar-credit">MATHURA · VRINDAVAN · BRAJ</div></div>
      </aside>

      <main className="main-panel">
        <header className="topbar"><button className="icon-button menu-toggle" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={20} /></button><div className="location-label"><MapPin size={15} /> MATHURA & VRINDAVAN</div><div className="guide-status"><span className={`status-dot api-status-${apiStatus}`} /> API {apiStatus === 'checking' ? 'CHECKING' : apiStatus.toUpperCase()} <span className="status-divider" /> <Sparkles size={14} /> AI</div></header>
        <section className="chat-area">
          <div className="chat-intro"><div className="intro-kicker"><span /> A LITTLE CLOSER TO BRAJ</div><h1>Find your way<br /><em>through Braj.</em></h1><p>Thoughtful routes, temple timings, local rhythms.<br className="desktop-break" /> Let’s make your visit feel like your own.</p></div>
          <div className="messages" aria-live="polite">
            {active?.messages.map((message, index) => <article className={`message-row message-${message.role}`} key={`${active.id}-${index}`}>
              {message.role === 'assistant' && <span className="assistant-avatar"><Sparkles size={15} /></span>}
              <div className="message-content">{index === 0 && message.role === 'assistant' && <div className="message-author">YOUR BRAJ GUIDE <span>·</span> JUST NOW</div>}<p>{message.content}</p></div>
            </article>)}
            {busy && <div className="message-row message-assistant"><span className="assistant-avatar"><Sparkles size={15} /></span><div className="typing-indicator" aria-label="Braj guide is responding"><i /><i /><i /></div></div>}
            <div ref={endRef} />
          </div>
          {active?.messages.length === 1 && <div className="suggestions" aria-label="Suggested questions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => void sendMessage(suggestion)}>{suggestion}<span>↗</span></button>)}</div>}
          <div className="composer-wrap">
            {error && <div className="error-message" role="alert">{error}</div>}
            <div className="composer"><textarea aria-label="Message your Braj travel guide" placeholder="Ask about your trip to Braj..." value={draft} rows={1} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} disabled={busy} /><button className="send-button" aria-label="Send message" disabled={!draft.trim() || busy} onClick={() => void sendMessage()}><ArrowUp size={19} /></button></div>
            <div className="composer-hint">LOCAL KNOWLEDGE, AI-POWERED <span>·</span> VERIFY TIMINGS BEFORE YOU TRAVEL</div>
          </div>
        </section>
      </main>

      <aside className="details-panel">
        <div className="details-topline">THE BRAJ REGION <span>01 / 03</span></div>
        <div className="region-art" aria-label="Illustration of a winding route through Braj"><span className="art-sun" /><span className="art-river" /><span className="art-route" /><span className="map-label map-mathura"><i /> MATHURA</span><span className="map-label map-vrindavan"><i /> VRINDAVAN</span><span className="map-label map-barsana"><i /> BARSANA</span><span className="map-caption">UTTAR PRADESH, INDIA</span></div>
        <div className="region-copy"><div className="region-eyebrow">A PLACE OF MANY PATHS</div><h2>One region.<br /><em>A thousand stories.</em></h2><p>Walk the old parikrama paths, pause by the Yamuna, and leave space for the unexpected.</p></div>
        <div className="region-divider" /><div className="quick-facts-heading">A FEW STARTING POINTS</div>
        <div className="quick-fact"><span className="fact-index">01</span><span><strong>Mathura</strong><small>THE CITY OF KRISHNA'S BIRTH</small></span></div>
        <div className="quick-fact"><span className="fact-index">02</span><span><strong>Vrindavan</strong><small>TEMPLES & YAMUNA GHATS</small></span></div>
        <div className="quick-fact"><span className="fact-index">03</span><span><strong>Barsana</strong><small>HILLSIDE TEMPLE TOWN</small></span></div>
        <div className="details-footer">A GOOD JOURNEY LEAVES ROOM TO WANDER.</div>
      </aside>
    </div>
  )
}

export default App
