import "dotenv/config";
import { sendMessageToClaude } from "./claude.js";
import { textToVector } from "./embeddings.js";
import { pcIndex } from "./pinecone.js";
import { getNamespaceFromInput } from "../utils/urlParser.js";
import { truncateHistory, type Message } from "../utils/textProcessing.js";
import { UserInsightSchema } from "../schemas/userInsight.js";
import type { UserInsight } from "../schemas/userInsight.js";

const SYSTEM_PROMPT = `You are an AI assistant analyzing a YouTube creator based on their video transcripts.
Respond ONLY with valid JSON matching this exact structure (no markdown, no explanation outside the JSON):

{
  "message": "Your main response to the user's question",
  "action": "ask_clarification" | "provide_analysis" | "need_more_data",
  "followUpOptions": ["Option 1", "Option 2", "Option 3"],
  "interests": [{"topic": "string", "confidence": "high|medium|low", "evidence": "string"}],
  "personalityTraits": [{"trait": "string", "description": "string"}],
  "speakingStyle": {"tone": "string", "vocabulary": "string", "patterns": ["string"]},
  "topTopics": [{"name": "string", "frequency": "string"}],
  "summary": "Brief overall summary"
}

DECISION RULES:
1. If the user's question is broad or vague (e.g., "analyze this creator", "tell me about them", "what do they talk about"):
   - Set action to "ask_clarification"
   - Provide 3-4 followUpOptions suggesting specific areas to explore
   - Keep message brief, asking what they'd like to focus on

2. If the user's question is specific (e.g., "what are their views on AI?", "how do they feel about politics?"):
   - Set action to "provide_analysis"
   - Provide the full analysis with relevant fields (interests, personalityTraits, etc.)
   - Optionally include followUpOptions to suggest related topics to explore deeper

3. If the retrieved context doesn't contain relevant information to answer:
   - Set action to "need_more_data"
   - Explain what information is missing or unavailable
   - MUST include followUpOptions with specific questions based on what IS in the transcripts

FOLLOW-UP OPTIONS RULES:
- followUpOptions must be phrased as specific questions the user can ask
- They must be based on actual content you can see in the provided transcripts
- BAD examples: "Learn about their approach", "Explore their views" (too vague)
- GOOD examples: "What did they say about Trump's tariffs?", "How do they cover the Greenland situation?", "What's their opinion on the Denmark protests?"
- Each option should reference specific topics, people, events, or themes mentioned in the transcripts
- Keep options short (under 10 words) but specific

IMPORTANT: "message" and "action" are always required. For optional fields (interests, personalityTraits, speakingStyle, topTopics, summary), either omit them entirely OR provide complete data. Never send empty arrays [] or empty objects {}.`;

const askQuestion = async (
  input: string,
  question: string,
  conversationHistory: Message[] = []
): Promise<UserInsight> => {
  const namespace = getNamespaceFromInput(input);
  const vector = await textToVector(question);

  const response = await pcIndex.namespace(namespace).query({
    vector,
    topK: 5,
    includeMetadata: true,
  });

  const chunks = response.matches.map((m) => m.metadata?.text);
  const prompt = `Here is some context from the creator's transcripts:\n${chunks.join("\n\n")}\n\nQuestion: ${question}`;

  const truncatedHistory = truncateHistory(conversationHistory);
  const messages: Message[] = [
    ...truncatedHistory,
    { role: "user", content: prompt },
  ];

  const claudeResponse = await sendMessageToClaude(messages, SYSTEM_PROMPT);

  const rawText = claudeResponse.content[0]?.text ?? "";

  const cleanedText = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleanedText);
    const result = UserInsightSchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    } else {
      console.error("Zod validation failed:", result.error.format());
      return { message: rawText, action: "provide_analysis" };
    }
  } catch {
    console.error("JSON parsing failed, returning raw response");
    return { message: rawText, action: "provide_analysis" };
  }
};

export { askQuestion };
export type { Message };
