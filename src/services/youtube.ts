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
  const endpoint = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;

  try {
    const res = await withRetry(()=> fetch(endpoint), 2, 500, shouldRetryOnNetworkError);
    if (!res.ok) throw new Error("Failed to fetch playlist items");
    const data = await res.json();
    const allVideoIds: string[] = data.items.map((item: any) => item.snippet.resourceId.videoId);

    const filtered = await filterOutShorts(allVideoIds);
    return filtered.slice(0, maxResults);
  } catch (e) {
    console.error(e);
    throw e;
  }
};

const filterOutShorts = async (videoIds: string[]): Promise<string[]> => {
  const ids = videoIds.join(",");
  const endpoint = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${apiKey}`;

  const res = await withRetry(() => fetch(endpoint), 2, 500, shouldRetryOnNetworkError);
  if (!res.ok) throw new Error("Failed to fetch video details");
  const data = await res.json();

  return data.items
    .filter((item: any) => {
      const duration = item.contentDetails.duration;
      const seconds = parseDuration(duration);
      return seconds > 180;
    })
    .map((item: any) => item.id);
};

const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");
  return hours * 3600 + minutes * 60 + seconds;
};

const getTranscripts = async (videoIds: string[]): Promise<string[]> => {
  const results = await Promise.allSettled(
    videoIds.map((videoId) =>
      withRetry(() => transcriptClient.fetchTranscript(videoId), 2, 500, shouldRetryOnNetworkError)
        .then((transcript) => transcript.map((entry) => entry.text).join(" "))
    )
  );

  return results
    .filter((result): result is PromiseFulfilledResult<string> => {
      if (result.status === "rejected") {
        console.error("Failed to fetch transcript:", result.reason);
      }
      return result.status === "fulfilled";
    })
    .map((result) => result.value);
};

const fireItUp = async (channelName: string): Promise<string[]> => {
  const channelId = await getYoutuberId(channelName);
  const videoIds = await getVideoIds(channelId, 5);
  const transcripts = await getTranscripts(videoIds);

  const allChunks = transcripts.flatMap((t) => chunkText(t));
  return allChunks;
};

export { fireItUp };
