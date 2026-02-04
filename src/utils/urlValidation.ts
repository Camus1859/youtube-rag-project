const isValidYouTubeUrl = (input: string): boolean => {
  const urlPattern = /^(https?:\/\/)?(www\.)?youtube\.com\/@[\w-]+/i
  return urlPattern.test(input)
}

const cleanYouTubeUrl = (input: string): string => {
  const match = input.match(/^(https?:\/\/)?(www\.)?youtube\.com\/@[\w-]+/i)
  return match ? match[0] : input
}
export { isValidYouTubeUrl, cleanYouTubeUrl }
