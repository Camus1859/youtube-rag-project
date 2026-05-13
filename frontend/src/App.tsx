import { useState, useEffect } from 'react'
import './App.css'
import type { UserInsight, Message, View } from './types'
import { getNamespaceFromInput } from '../../src/utils/urlParser'
import InputScreen from './InputScreen'
import LoadingScreen from './LoadingScreen'
import ChatScreen from './ChatScreen'
import loadingSteps from './LoadingSteps'
import { isValidYouTubeUrl, cleanYouTubeUrl } from '../../src/utils/urlValidation'
import RagTooltip from './RagToolTip'

function App() {
  const [view, setView] = useState<View>('input')
  const [channelInput, setChannelInput] = useState<string>('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; insight?: UserInsight }[]>([])
  const [inputValue, setInputValue] = useState<string>('')
  const [isThinking, setIsThinking] = useState<boolean>(false)
  const [loadingStep, setLoadingStep] = useState<number>(0)
  const [idempotencyKey, setIdempotencyKey] = useState<string>('')

  useEffect(() => {
    if (view !== 'loading') {
      setLoadingStep(0)
      return
    }
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < loadingSteps.length - 1 ? prev + 1 : prev))
    }, 2500)
    return () => clearInterval(interval)
  }, [view])

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

      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const { success: ingestSuccess, data: ingestData, error: ingestError } = await res.json()

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

      if (!askRes.ok) throw new Error(`Server error: ${askRes.status}`)
      const { success: askSuccess, data: askData, error: askError } = await askRes.json()

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

      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const { success, data, error } = await res.json()

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

  const namespaceString = getNamespaceFromInput(channelInput)
  const doesNamespaceExistInLocalStorage = localStorage.getItem(namespaceString)

  if (view === 'input') {
    return (
      <InputScreen
        setChannelInput={setChannelInput}
        handleAnalyze={handleAnalyze}
        ragTooltip={RagTooltip}
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
        ragTooltip={RagTooltip}
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
