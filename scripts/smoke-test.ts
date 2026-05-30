import { Pinecone } from '@pinecone-database/pinecone';
import "dotenv/config"

const PRODUCTION_URL = process.env.PRODUCTION_URL
const TEST_CHANNEL = 'https://www.youtube.com/@SportsRadio94WIP'
const TEST_NAMESPACE = 'SportsRadio94WIP'

if(!PRODUCTION_URL){
    throw new Error(" URL is missing")
}

if (!process.env.PINECONE_API_KEY) throw new Error('PINECONE_API_KEY is not defined')
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })

const pcIndex = pc.index('standard-dense-js')
await pcIndex.namespace(TEST_NAMESPACE).deleteAll()


