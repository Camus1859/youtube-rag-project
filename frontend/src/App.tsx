import { useState, useEffect } from 'react'
import './App.css'
import type { UserInsight, Message } from './types'

type View = 'input' | 'loading' | 'chat'

function App() {
  const [view, setView] = useState<View>('input')
  const [channelInput, setChannelInput] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; insight?: UserInsight }[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)

  const loadingSteps = [
    { step: 1, title: 'Fetching video IDs', detail: 'Querying YouTube Data API for 5 most recent uploads' },
    { step: 2, title: 'Extracting transcripts', detail: 'Downloading auto-generated captions via youtube-transcript API' },
    { step: 3, title: 'Chunking text', detail: 'Splitting transcripts into 500-char segments with 100-char overlap' },
    { step: 4, title: 'Generating embeddings', detail: 'Converting chunks to vectors using OpenAI text-embedding-3-small' },
    { step: 5, title: 'Storing in vector DB', detail: 'Upserting embeddings to Pinecone with channel namespace' },
    { step: 6, title: 'Initializing chat', detail: 'Running initial RAG query against stored vectors' },
  ]

  useEffect(() => {
    if (view !== 'loading') {
      setLoadingStep(0)
      return
    }
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < loadingSteps.length - 1 ? prev + 1 : prev))
    }, 2500)
    return () => clearInterval(interval)
  }, [view, loadingSteps.length])

  const isValidYouTubeUrl = (input: string): boolean => {
    const urlPattern = /^(https?:\/\/)?(www\.)?youtube\.com\/@[\w-]+/i
    return urlPattern.test(input)
  }

  const cleanYouTubeUrl = (input: string): string => {
    const match = input.match(/^(https?:\/\/)?(www\.)?youtube\.com\/@[\w-]+/i)
    return match ? match[0] : input
  }

  const handleAnalyze = async () => {
    if (!channelInput.trim()) return

    if (!isValidYouTubeUrl(channelInput.trim())) {
      alert('Please enter a valid YouTube channel URL (e.g., https://www.youtube.com/@ChannelName)')
      return
    }

    const cleanedUrl = cleanYouTubeUrl(channelInput.trim())
    setChannelInput(cleanedUrl) 
    setView('loading')

    const minLoadTime = 10000 
    const startTime = Date.now()

    try {
      const res = await fetch('/.netlify/functions/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelInput: cleanedUrl }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Ingest failed')
      }

      const askRes = await fetch('/.netlify/functions/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelInput: cleanedUrl,
          question: 'Introduce yourself briefly and ask what the user would like to know about this creator. Suggest some specific topics based on the transcript content.',
          history: [],
        }),
      })

      if (!askRes.ok) {
        const err = await askRes.json()
        throw new Error(err.error || 'Ask failed')
      }

      const insight: UserInsight = await askRes.json()

      const elapsed = Date.now() - startTime
      if (elapsed < minLoadTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadTime - elapsed))
      }

      setMessages([{
        role: 'assistant',
        content: insight.message,
        insight,
      }])
      setView('chat')
    } catch (error) {
      console.error('Error:', error)
      alert(error instanceof Error ? error.message : 'Something went wrong')
      setView('input')
    }
  }

  const handleSend = async () => {
    if (!inputValue.trim() || isThinking) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsThinking(true)

    try {
      const history: Message[] = messages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/.netlify/functions/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelInput: channelInput.trim(),
          question: userMessage,
          history,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Ask failed')
      }

      const insight: UserInsight = await res.json()

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: insight.message,
        insight,
      }])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }])
    } finally {
      setIsThinking(false)
    }
  }

  const handleFollowUp = (option: string) => {
    setInputValue(option)
  }

  const handleNew = () => {
    setView('input')
    setChannelInput('')
    setMessages([])
    setInputValue('')
  }

  const ragTooltip = (
    <span className="rag-tooltip">
      RAG
      <span className="tooltip-text">
        <strong>Retrieval Augmented Generation</strong> combines LLMs with external knowledge retrieval. Instead of relying only on training data, it fetches relevant content and uses it as context to generate accurate responses.
        <a href="https://en.wikipedia.org/wiki/Retrieval-augmented_generation#RAG_and_LLM_limitations" target="_blank" rel="noopener noreferrer" className="tooltip-link">Learn more</a>
      </span>
    </span>
  )

  if (view === 'input') {
    return (
      <div className="container">
        <h1>YouTube {ragTooltip} Analyzer</h1>
        <p className="subtitle">Ask questions answered by their actual video transcripts</p>
        <p className="subtitle-note">Unlike ChatGPT, responses come from what they've actually said, not general knowledge.</p>
        <div className="instructions">
          <p><strong>How to get the channel URL:</strong></p>
          <ol>
            <li>Go to <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">youtube.com</a></li>
            <li>Find your favorite YouTuber's channel</li>
            <li>Click the <strong>Home</strong> button on their page</li>
            <li>Copy the URL (it should look like: https://www.youtube.com/@ChannelName)</li>
          </ol>
        </div>
        <div className="input-row">
          <input
            type="text"
            placeholder="e.g., https://www.youtube.com/@Fireship"
            value={channelInput}
            onChange={(e) => setChannelInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
          />
          <button onClick={handleAnalyze}>Analyze</button>
        </div>
      </div>
    )
  }

  if (view === 'loading') {
    const currentStep = loadingSteps[loadingStep]
    return (
      <div className="container">
        <h1>YouTube {ragTooltip} Analyzer</h1>
        <div className="loading">
          <div className="spinner"></div>
          <div className="loading-steps">
            {loadingSteps.map((s, i) => (
              <div key={s.step} className={`loading-step ${i < loadingStep ? 'completed' : i === loadingStep ? 'active' : 'pending'}`}>
                <div className="step-indicator">
                  {i < loadingStep ? '✓' : s.step}
                </div>
                <div className="step-content">
                  <p className="step-title">{s.title}</p>
                  {i === loadingStep && <p className="step-detail">{currentStep.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>YouTube {ragTooltip} Analyzer</h1>
      <div className="chat-header">
        <p className="chat-title">Analyzing: {channelInput}</p>
        <button className="new-btn" onClick={handleNew}>New</button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <p>{msg.content}</p>
            {msg.role === 'assistant' && msg.insight?.followUpOptions && (
              <div className="follow-ups">
                {msg.insight.followUpOptions.map((option, j) => (
                  <button key={j} onClick={() => handleFollowUp(option)}>
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {isThinking && (
          <div className="message assistant">
            <p className="thinking">Thinking...</p>
          </div>
        )}
      </div>

      <div className="input-row">
        <input
          type="text"
          placeholder="Ask a question..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isThinking}
        />
        <button onClick={handleSend} disabled={isThinking}>Send</button>
      </div>
    </div>
  )
}

export default App
