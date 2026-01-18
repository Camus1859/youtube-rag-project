import { pcIndex } from "./pinecone.js";
import { getEmbeddings } from "./embeddings.js";
import { fireItUp } from "./youtube.js";

const upsertChunks = async (channelName: string) => {
  const chunks = await fireItUp(channelName);
  const embeddings = await getEmbeddings(chunks);

  const records = chunks.map((chunk, i) => ({
    id: `chunk-${i}`,
    values: embeddings[i] as number[],
    metadata: { text: chunk },
  }));

  await pcIndex.namespace(channelName).upsert(records);
};

export { upsertChunks };
