import { YoutubeTranscript } from "youtube-transcript";
import "dotenv/config";
import { HttpsProxyAgent } from "https-proxy-agent";
import nodeFetch from "node-fetch";
import {
  extractHandleFromUrl,
  extractChannelIdFromUrl,
} from "../utils/urlParser.js";
import { chunkText } from "../utils/textProcessing.js";
import { shouldRetryOnNetworkError, withRetry } from "../utils/retry.js";

const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) throw new Error("YOUTUBE_API_KEY is not defined");

// Store original fetch at module load time (before any modifications)
const originalFetch = globalThis.fetch;

// Create proxy agent if PROXY_URL is set
const proxyAgent = process.env.PROXY_URL
  ? new HttpsProxyAgent(process.env.PROXY_URL)
  : undefined;

// Create a proxied fetch function (doesn't modify global)
const proxiedFetch = (
  url: string | URL | Request,
  init?: Record<string, unknown>,
) => {
  return nodeFetch(url.toString(), {
    ...init,
    agent: proxyAgent,
  });
};

/**
 * Temporarily replaces global fetch with a proxied version,
 * executes the callback, then restores the original fetch.
 * This allows the youtube-transcript library to use the proxy.
 */
const withProxiedFetch = async <T>(callback: () => Promise<T>): Promise<T> => {
  if (!proxyAgent) {
    return callback();
  }

  // Replace with proxied fetch
  // @ts-expect-error - TypeScript may complain about modifying globalThis.fetch
  globalThis.fetch = proxiedFetch;

  try {
    return await callback();
  } finally {
    // Always restore original fetch
    globalThis.fetch = originalFetch;
  }
};

const getYoutuberId = async (input: string): Promise<string> => {
  const channelIdFromUrl = extractChannelIdFromUrl(input);
  if (channelIdFromUrl) {
    return channelIdFromUrl;
  }

  let handle = extractHandleFromUrl(input);
  if (!handle) {
    handle = input.startsWith("@") ? input.slice(1) : input;
  }

  const endpoint = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`;

  try {
    const res = await withRetry(() => fetch(endpoint), 2, 500, shouldRetryOnNetworkError);
    if (!res.ok) throw new Error("Failed to fetch YouTube channel ID");
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      throw new Error(`No channel found for handle: ${handle}`);
    }

    return data.items[0].id;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

const getVideoIds = async (
  channelId: string,
  maxResults = 10,
): Promise<string[]> => {
  const playlistId = `UU${channelId.substring(2)}`;
  const endpoint = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${apiKey}`;

  try {
    const res = await withRetry(()=> fetch(endpoint), 2, 500, shouldRetryOnNetworkError);
    if (!res.ok) throw new Error("Failed to fetch playlist items");
    const data = await res.json();
    return data.items.map((item: any) => item.snippet.resourceId.videoId);
  } catch (e) {
    console.error(e);
    throw e;
  }
};

const getTranscripts = async (videoIds: string[]): Promise<string[]> => {
  const transcripts: string[] = [];

  for (const videoId of videoIds) {
    try {
      // Use proxied fetch for transcript requests (YouTube blocks cloud IPs)
      const transcript = await withProxiedFetch(() =>
        withRetry(() => YoutubeTranscript.fetchTranscript(videoId), 2, 500, shouldRetryOnNetworkError)
      );
      const fullTranscript = transcript.map((entry) => entry.text).join(" ");
      transcripts.push(fullTranscript);
    } catch (e) {
      console.error(`Failed to fetch transcript for ${videoId}:`, e);
    }
  }

  return transcripts;
};

const fireItUp = async (channelName: string): Promise<string[]> => {
  const channelId = await getYoutuberId(channelName);
  const videoIds = await getVideoIds(channelId, 5);
  const transcripts = await getTranscripts(videoIds);

  const allChunks = transcripts.flatMap((t) => chunkText(t));
  return allChunks;
};

export { fireItUp };
