const extractHandleFromUrl = (url: string): string | null => {
  const match = url.match(/@([^/]+)/);
  return match?.[1] ?? null;
};

const extractChannelIdFromUrl = (url: string): string | null => {
  const match = url.match(/\/channel\/([^/]+)/);
  return match?.[1] ?? null;
};

const getNamespaceFromInput = (input: string): string => {
  const handle = extractHandleFromUrl(input);
  if (handle) return handle;

  const channelId = extractChannelIdFromUrl(input);
  if (channelId) return channelId;

  return input.startsWith("@") ? input.slice(1) : input;
};

export { extractHandleFromUrl, extractChannelIdFromUrl, getNamespaceFromInput };
