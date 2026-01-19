import type { Handler } from "@netlify/functions";
import { upsertChunks } from "../../src/services/upsertVectors.js";

function isValidYouTubeInput(input: string): boolean {
  const urlPattern = /^(https?:\/\/)?(www\.)?youtube\.com\/@[\w-]+/i;
  return urlPattern.test(input);
}

function cleanYouTubeUrl(input: string): string {
  const match = input.match(/^(https?:\/\/)?(www\.)?youtube\.com\/@[\w-]+/i);
  return match ? match[0] : input;
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { channelInput } = JSON.parse(event.body || "{}");

    if (!channelInput) {
      return { statusCode: 400, body: JSON.stringify({ error: "channelInput is required" }) };
    }

    if (!isValidYouTubeInput(channelInput)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Please enter a valid YouTube channel URL (e.g., https://www.youtube.com/@ChannelName)"
        })
      };
    }

    const cleanedUrl = cleanYouTubeUrl(channelInput);
    await upsertChunks(cleanedUrl);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Ingest error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
    };
  }
};

export { handler };
