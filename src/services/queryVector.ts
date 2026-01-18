import "dotenv/config";
import { sendMessageToClaude } from "./claude.js";
import { getEmbeddingOfUserInput } from "./embeddings.js";
import { pcIndex } from "./pinecone.js";

const askQuestion = async (channelName: string, question: string) => {
  const vector = await getEmbeddingOfUserInput(question);

  const response = await pcIndex.namespace(channelName).query({
    vector,
    topK: 5,
    includeMetadata: true,
  });

  const chunks = response.matches.map((m) => m.metadata?.text);
  const prompt = `Here is some context:\n${chunks.join("\n\n")}\n\nQuestion: ${question}`;

  const claudeResponse = await sendMessageToClaude([
    { role: "user", content: prompt },
  ]);

  return claudeResponse.content[0]?.text;
};

export { askQuestion };
