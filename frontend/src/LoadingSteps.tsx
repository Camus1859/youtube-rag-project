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
  { step: 3, title: 'Chunking text', detail: 'Splitting transcripts into 500-word segments with 50-word overlap' },
  {
    step: 4,
    title: 'Generating embeddings',
    detail: 'Converting chunks to vectors using OpenAI text-embedding-3-small',
  },
  { step: 5, title: 'Storing in vector DB', detail: 'Upserting embeddings to Pinecone with channel namespace' },
  { step: 6, title: 'Initializing chat', detail: 'Running initial RAG query against stored vectors' },
]

export default loadingSteps
