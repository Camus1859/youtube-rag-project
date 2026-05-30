import { Pinecone } from '@pinecone-database/pinecone'
import 'dotenv/config'

const PRODUCTION_URL = process.env.PRODUCTION_URL
const TEST_CHANNEL = 'https://www.youtube.com/@SportsRadio94WIP'
const TEST_NAMESPACE = 'SportsRadio94WIP'

if (!PRODUCTION_URL) {
  throw new Error(' URL is missing')
}

if (!process.env.PINECONE_API_KEY) throw new Error('PINECONE_API_KEY is not defined')
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })

const pcIndex = pc.index('standard-dense-js')
console.log('Deleting test namespace...')

try {
  await pcIndex.namespace(TEST_NAMESPACE).deleteAll()
  console.log('Namespace deleted.')
} catch {
  console.log('Namespace not found, skipping delete.')
}

const handleAnalyze = async () => {
  try {
    const res = await fetch(`${PRODUCTION_URL}/.netlify/functions/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channelInput: TEST_CHANNEL }),
    })

    if (!res.ok) throw new Error(`Server error: ${res.status}`)
    const { success: ingestSuccess, data: ingestData, error: ingestError } = await res.json()

    if (!ingestSuccess) {
      throw new Error(ingestError?.message || 'Ingest failed')
    }
    console.log('Ingest passed.')

    const askRes = await fetch(`${PRODUCTION_URL}/.netlify/functions/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelInput: TEST_CHANNEL,
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

    console.log('Ask passed.')
    console.log('All smoke tests passed.')
    return 0
  } catch (error) {
    console.error('Smoke test failed:', error)
    return 1
  }
}

const result = await handleAnalyze()
process.exit(result)
