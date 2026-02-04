import { useState, useEffect } from 'react'
import './App.css'
import type { UserInsight, Message } from './types'
import { getNamespaceFromInput } from '../../src/utils/urlParser'
import InputScreen from './InputScreen'
import LoadingScreen from './LoadingScreen'
import ChatScreen from './ChatScreen'

type View = 'input' | 'loading' | 'chat'

function App() {
  const [view, setView] = useState<View>('input')
  const [channelInput, setChannelInput] = useState<string>('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; insight?: UserInsight }[]>([])
  const [inputValue, setInputValue] = useState<string>('')
  const [isThinking, setIsThinking] = useState<boolean>(false)
  const [loadingStep, setLoadingStep] = useState<number>(0)
  const [idempotencyKey, setIdempotencyKey] = useState('')

  type LoadingSteps = {
    step: number
    title: string
    detail: string
  }
  const loadingSteps: LoadingSteps[] = [
    { step: 1, title: 'Fetching video IDs', detail: 'Querying YouTube Data API for 5 most recent uploads' },
    {
      step: 2,
      title: 'Extracting transcripts',
      detail: 'Downloading auto-generated captions via youtube-transcript API',
    },
    { step: 3, title: 'Chunking text', detail: 'Splitting transcripts into 500-char segments with 100-char overlap' },
    {
      step: 4,
      title: 'Generating embeddings',
      detail: 'Converting chunks to vectors using OpenAI text-embedding-3-small',
    },
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
    const namespaceString = getNamespaceFromInput(cleanedUrl)
    setChannelInput(cleanedUrl)
    setView('loading')

    const key = idempotencyKey || crypto.randomUUID()
    if (!idempotencyKey) setIdempotencyKey(key)

    const minLoadTime = 10000
    const startTime = Date.now()

    try {
      const res = await fetch('/.netlify/functions/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
        },
        body: JSON.stringify({ channelInput: cleanedUrl }),
      })

      const { success: ingestSuccess, data: ingestData, error: ingestError, meta: ingestMeta } = await res.json()

      if (!ingestSuccess) {
        throw new Error(ingestError?.message || 'Ingest failed')
      }

      localStorage.setItem(namespaceString, 'true')

      const askRes = await fetch('/.netlify/functions/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelInput: cleanedUrl,
          question:
            'Introduce yourself briefly and ask what the user would like to know about this creator. Suggest some specific topics based on the transcript content.',
          history: [],
        }),
      })

      const { success: askSuccess, data: askData, error: askError, meta: askMeta } = await askRes.json()

      if (!askSuccess) {
        throw new Error(askError?.message || 'Ask failed')
      }

      const insight: UserInsight = askData

      const elapsed = Date.now() - startTime
      if (elapsed < minLoadTime && ingestData.nameSpaceExist !== true) {
        await new Promise(resolve => setTimeout(resolve, minLoadTime - elapsed))
      }

      setMessages([
        {
          role: 'assistant',
          content: insight.message,
          insight,
        },
      ])
      setView('chat')
      setIdempotencyKey('')
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

      const { success, data, error, meta } = await res.json()

      if (!success) {
        throw new Error(error?.message || 'Ask failed')
      }

      const insight: UserInsight = data

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: insight.message,
          insight,
        },
      ])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
        },
      ])
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
        <strong>Retrieval Augmented Generation</strong> combines LLMs with external knowledge retrieval. Instead of
        relying only on training data, it fetches relevant content and uses it as context to generate accurate
        responses.
        <a
          href="https://en.wikipedia.org/wiki/Retrieval-augmented_generation#RAG_and_LLM_limitations"
          target="_blank"
          rel="noopener noreferrer"
          className="tooltip-link"
        >
          Learn more
        </a>
      </span>
    </span>
  )

  const namespaceString = getNamespaceFromInput(channelInput)
  const doesNamespaceExistInLocalStorage = localStorage.getItem(namespaceString)

  if (view === 'input') {
    return (
      <InputScreen
        setChannelInput={setChannelInput}
        handleAnalyze={handleAnalyze}
        ragTooltip={ragTooltip}
        channelInput={channelInput}
      />
    )
  }

  if (view === 'loading') {
    return (
      <LoadingScreen
        doesNamespaceExistInLocalStorage={doesNamespaceExistInLocalStorage}
        loadingSteps={loadingSteps}
        loadingStep={loadingStep}
        ragTooltip={ragTooltip}
      />
    )
  }

  return (
    <ChatScreen
      channelInput={channelInput}
      handleNew={handleNew}
      messages={messages}
      handleFollowUp={handleFollowUp}
      isThinking={isThinking}
      inputValue={inputValue}
      setInputValue={setInputValue}
      handleSend={handleSend}
    />
  )
}

export default App
