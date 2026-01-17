import { pcIndex } from "./pinecone.js";
import { getEmbeddings } from "./embeddings.js";
import { fireItUp } from "./youtube.js";

const upsertChunks = async (channelName: string) => {
  const chunks = await fireItUp(channelName);
  const testChunks = chunks.slice(0, 5);
  const embeddings = await getEmbeddings(testChunks);

  const records = testChunks.map((chunk, i) => ({
    id: `chunk-${i}`,
    values: embeddings[i] as number[],
    metadata: { text: chunk },
  }));

  await pcIndex.upsert(records);
};

upsertChunks("Ezra Klein");