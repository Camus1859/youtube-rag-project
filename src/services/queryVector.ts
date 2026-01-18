import "dotenv/config";
import { sendMessageToClaude } from "./claude.js";
import { getEmbeddingOfUserInput } from "./embeddings.js";
import { pcIndex } from "./pinecone.js";
import { UserInsightSchema } from "../schemas/userInsight.js";
import type { UserInsight } from "../schemas/userInsight.js";

const SYSTEM_PROMPT = `You are an AI assistant analyzing a YouTube creator based on their video transcripts.
Respond ONLY with valid JSON matching this exact structure (no markdown, no explanation outside the JSON):

{
  "message": "Your main response to the user's question",
  "interests": [{"topic": "string", "confidence": "high|medium|low", "evidence": "string"}],
  "personalityTraits": [{"trait": "string", "description": "string"}],
  "speakingStyle": {"tone": "string", "vocabulary": "string", "patterns": ["string"]},
  "topTopics": [{"name": "string", "frequency": "string"}],
  "summary": "Brief overall summary"
}

Only include fields relevant to the question. "message" is always required.`;

const askQuestion = async (channelName: string, question: string): Promise<UserInsight> => {
  const vector = await getEmbeddingOfUserInput(question);

  const response = await pcIndex.namespace(channelName).query({
    vector,
    topK: 5,
    includeMetadata: true,
  });

  const chunks = response.matches.map((m) => m.metadata?.text);
  const prompt = `Here is some context from the creator's transcripts:\n${chunks.join("\n\n")}\n\nQuestion: ${question}`;

  const claudeResponse = await sendMessageToClaude(
    [{ role: "user", content: prompt }],
    SYSTEM_PROMPT
  );

  const rawText = claudeResponse.content[0]?.text ?? "";

  try {
    const parsed = JSON.parse(rawText);
    const result = UserInsightSchema.safeParse(parsed);

    if (result.success) {
        // console.log(JSON.stringify(result.data, null, 2));
      return result.data;
    } else {
      console.error("Zod validation failed:", result.error.format());
      return { message: rawText };
    }
  } catch {
    console.error("JSON parsing failed, returning raw response");
    return { message: rawText };
  }
};

export { askQuestion };
