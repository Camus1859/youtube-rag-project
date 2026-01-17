import { YoutubeTranscript } from "youtube-transcript";
import "dotenv/config";

const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) throw new Error("YOUTUBE_API_KEY is not defined");

const getYoutuberId = async (channelName: string): Promise<string> => {
  const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(channelName)}&type=channel&key=${apiKey}`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error("Failed to fetch YouTubers ID");
    const data = await res.json();
    return data.items[0].id.channelId;
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
  const videoIds = await getVideoIds(channelId, 10);
  const transcripts = await getTranscripts(videoIds);

  const allChunks = transcripts.flatMap((t) => chunkText(t));
  return allChunks;
};

const chunkText = (text: string, chunkSize = 500, overlap = 50): string[] => {
  const words = text.split(" ");
  const chunks: string[] = [];
  const step = chunkSize - overlap;

  for (let i = 0; i < words.length; i += step) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    chunks.push(chunk);
  }

  return chunks;
};

export { fireItUp };
