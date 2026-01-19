import { YoutubeTranscript } from "youtube-transcript";
import "dotenv/config";
import { extractHandleFromUrl, extractChannelIdFromUrl } from "../utils/urlParser.js";
import { chunkText } from "../utils/textProcessing.js";

const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) throw new Error("YOUTUBE_API_KEY is not defined");

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
    const res = await fetch(endpoint);
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
    const res = await fetch(endpoint);
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
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
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
  const videoIds = await getVideoIds(channelId, 20);
  const transcripts = await getTranscripts(videoIds);

  const allChunks = transcripts.flatMap((t) => chunkText(t));
  return allChunks;
};

export { fireItUp };
