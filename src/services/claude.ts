import axios from "axios";
import "dotenv/config";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not defined in environment variables");
}

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  id: string;
  content: { type: string; text: string }[];
  model: string;
  role: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

const sendMessageToClaude = async (
  messages: ClaudeMessage[],
  systemPrompt?: string,
  maxTokens = 1024
): Promise<ClaudeResponse> => {
  const response = await axios.post(
    ANTHROPIC_API_URL,
    {
      max_tokens: maxTokens,
      messages: messages,
      model: "claude-sonnet-4-20250514",
      ...(systemPrompt && { system: systemPrompt }),
    },
    {
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "X-Api-Key": ANTHROPIC_API_KEY,
      },
    },
  );
  return response.data;
};

export { sendMessageToClaude };