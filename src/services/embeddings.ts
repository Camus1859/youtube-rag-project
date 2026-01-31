import OpenAI from "openai";
import "dotenv/config";
import { shouldRetryOnNetworkError, withRetry } from "../utils/retry.js";


const openai = new OpenAI();

const textToVector = async (text: string): Promise<number[]> => {
  const response = await  withRetry(() => openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  }), 2, 500, shouldRetryOnNetworkError);

  if (response.data.length === 0) {
    throw new Error("No embedding returned from OpenAI");
  }

  const embedding = response.data[0]?.embedding;

  if (!embedding) {
    throw new Error("No embedding data found");
  }

  return embedding;
};

const textsToVectors = async (texts: string[]): Promise<number[][]> => {
  const BATCH_SIZE = 100;
  const allEmbeddings: number[][] = [];

  const validTexts = texts.filter(t => t && t.trim().length > 0);

  if (validTexts.length === 0) {
    throw new Error("No valid text chunks to embed");
  }

  for (let i = 0; i < validTexts.length; i += BATCH_SIZE) {
    const batch = validTexts.slice(i, i + BATCH_SIZE);
    const response = await withRetry(() => openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
      encoding_format: "float",
    }), 2, 500, shouldRetryOnNetworkError);
    
    allEmbeddings.push(...response.data.map((item) => item.embedding));
  }

  return allEmbeddings;
};

export { textToVector, textsToVectors };
