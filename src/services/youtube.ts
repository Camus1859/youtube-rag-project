import { YoutubeTranscript } from "youtube-transcript-plus";
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

// Create proxy agent if PROXY_URL is set
const proxyAgent = process.env.PROXY_URL
  ? new HttpsProxyAgent(process.env.PROXY_URL)
  : undefined;

// Create a proxied fetch for youtube-transcript-plus hooks
const proxiedFetch = async ({ url, lang, userAgent, method, headers, body }: {
  url: string; lang?: string; userAgent: string;
  method?: string; headers?: Record<string, string>; body?: string;
}) => {
  return nodeFetch(url, {
    method: method || "GET",
    headers: {
      ...(lang && { "Accept-Language": lang }),
      "User-Agent": userAgent,
      ...headers,
    },
    ...(body && { body }),
    ...(proxyAgent && { agent: proxyAgent }),
  });
};

// Create transcript fetcher with proxy support
const transcriptClient = new YoutubeTranscript({
  videoFetch: proxiedFetch,
  playerFetch: proxiedFetch,
  transcriptFetch: proxiedFetch,
});

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
      const transcript = await withRetry(() => transcriptClient.fetchTranscript(videoId), 2, 500, shouldRetryOnNetworkError);
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
  const videoIds = await getVideoIds(channelId, 3);
  const transcripts = await getTranscripts(videoIds);

  const allChunks = transcripts.flatMap((t) => chunkText(t));
  return allChunks;
};

export { fireItUp };
