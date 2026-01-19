const chunkText = (
  text: string,
  wordsPerChunk = 500,
  overlapWords = 50,
): string[] => {
  const allWords = text.split(" ");

  const chunks: string[] = [];
  const slideForward = wordsPerChunk - overlapWords;

  let windowStart = 0;

  while (windowStart < allWords.length) {
    const windowEnd = windowStart + wordsPerChunk;
    const wordsInWindow = allWords.slice(windowStart, windowEnd);
    const chunkText = wordsInWindow.join(" ");
    chunks.push(chunkText);

    windowStart = windowStart + slideForward;
  }

  return chunks;
};

const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

type Message = { role: "user" | "assistant"; content: string };

const MAX_HISTORY_TOKENS = 4000;

const truncateHistory = (history: Message[]): Message[] => {
  if (history.length === 0) return [];

  let totalTokens = history.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);

  if (totalTokens <= MAX_HISTORY_TOKENS) return history;

  const truncated = [...history];
  while (truncated.length > 2 && totalTokens > MAX_HISTORY_TOKENS) {
    const removed = truncated.shift();
    if (removed) {
      totalTokens -= estimateTokens(removed.content);
    }
  }

  return truncated;
};

export { chunkText, estimateTokens, truncateHistory };
export type { Message };
