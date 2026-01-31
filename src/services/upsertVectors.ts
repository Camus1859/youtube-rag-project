import { pcIndex } from "./pinecone.js";
import { textsToVectors } from "./embeddings.js";
import { fireItUp } from "./youtube.js";
import { getNamespaceFromInput } from "../utils/urlParser.js";
import { shouldRetryOnNetworkError, withRetry } from "../utils/retry.js";

const BATCH_SIZE = 50;

const upsertChunks = async (input: string) => {
  const namespace = getNamespaceFromInput(input);
  const rawChunks = await fireItUp(input);
  const chunks = rawChunks.filter(c => c && c.trim().length > 0);

  if (chunks.length === 0) {
    throw new Error("No transcripts found for this channel. The channel may not exist or may not have any videos with captions.");
  }

  const vectors = await textsToVectors(chunks);

  const records = chunks.map((chunk, i) => ({
    id: `chunk-${i}`,
    values: vectors[i] as number[],
    metadata: { text: chunk },
  }));

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    await withRetry(() => pcIndex.namespace(namespace).upsert(batch), 2, 500, shouldRetryOnNetworkError );
  }

};

export { upsertChunks };
