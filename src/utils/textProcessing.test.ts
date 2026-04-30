import { describe, it, expect } from "vitest";
import { chunkText } from "./textProcessing.js";

describe("chunkText", () => {
  it("returns a single chunk when text is under 500 words", () => {
    const text = "hello ".repeat(100).trim();
    const chunks = chunkText(text);
    expect(chunks.length).toBe(1);
  });

  it("splits text into multiple chunks at 500 words", () => {
    const text = "word ".repeat(1000).trim();
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("each chunk has at most 500 words", () => {
    const text = "word ".repeat(1000).trim();
    const chunks = chunkText(text);
    for (const chunk of chunks) {
      const wordCount = chunk.split(" ").length;
      expect(wordCount).toBeLessThanOrEqual(500);
    }
  });

  it("chunks overlap by 50 words", () => {
    const words = Array.from({ length: 1000 }, (_, i) => `word${i}`);
    const text = words.join(" ");
    const chunks = chunkText(text);

    const chunk1Words = chunks[0]!.split(" ");
    const chunk2Words = chunks[1]!.split(" ");
    const last50ofChunk1 = chunk1Words.slice(-50);
    const first50ofChunk2 = chunk2Words.slice(0, 50);

    expect(last50ofChunk1).toEqual(first50ofChunk2);
  });

  it("returns empty array for empty string", () => {
    const chunks = chunkText("");
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe("");
  });
});
