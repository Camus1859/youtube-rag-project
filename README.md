# YouTube Content RAG Analyzer

A full-stack [RAG](https://en.wikipedia.org/wiki/Retrieval-augmented_generation)
 application that ingests YouTube channel content and enables conversational Q&A powered by AI.

**🚀 Live Demo:** [https://relaxed-llama-ebdc94.netlify.app/](https://relaxed-llama-ebdc94.netlify.app/)

### Features

- RAG pipeline: ingest → embed → store → retrieve → generate
- Multi-API orchestration (YouTube, OpenAI, Pinecone, Anthropic)
- Semantic search across video transcripts using vector embeddings
- Conversational AI with context management and follow-up suggestions
- Structured JSON output with Zod schema validation

### Tech Stack

React, Vite, TypeScript, Netlify Functions, OpenAI Embeddings API, Pinecone Vector DB, Anthropic Claude, Zod

### Architecture

```
Channel URL → YouTube API (fetch transcripts)
           → Chunking (500 chars, 100 overlap)
           → OpenAI Embeddings API (text-embedding-3-small)
           → Pinecone (store vectors by channel namespace)
           → User query → RAG retrieval → Claude → Zod validation → Response
```

### Run Locally

Requires `.env` file:

```
YOUTUBE_API_KEY=
OPENAI_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX=
ANTHROPIC_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

```bash
npm install && cd frontend && npm install && cd ..
netlify dev
```
