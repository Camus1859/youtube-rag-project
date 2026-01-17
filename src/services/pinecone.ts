import { Pinecone } from "@pinecone-database/pinecone";
import "dotenv/config";

if (!process.env.PINECONE_API_KEY) throw new Error("PINECONE_API_KEY is not defined");
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const pcIndex = pc.index("standard-dense-js");

export { pcIndex };