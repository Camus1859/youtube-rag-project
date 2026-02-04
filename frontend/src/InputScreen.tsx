import type React from "react"

type InputScreenProps = {
  setChannelInput: (input: string) => void
  handleAnalyze: () => void
  ragTooltip: React.ReactNode
  channelInput: string
}

const InputScreen = ({ setChannelInput, handleAnalyze, ragTooltip, channelInput }: InputScreenProps) => {
  return (
    <div className="container">
      <h1>Learn From Creators</h1>
      <p className="subtitle">AI-powered transcript analysis for deeper understanding</p>
      <p className="subtitle-note">
        Powered by {ragTooltip} — responses come from what creators have actually said, not general knowledge.
      </p>
      <div className="instructions">
        <p>
          <strong>How to get the channel URL:</strong>
        </p>
        <ol>
          <li>
            Go to{' '}
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">
              youtube.com
            </a>
          </li>
          <li>Find your favorite YouTuber's channel</li>
          <li>
            Click the <strong>Home</strong> button on their page
          </li>
          <li>Copy the URL (it should look like: https://www.youtube.com/@ChannelName)</li>
        </ol>
      </div>
      <div className="input-row">
        <input
          type="text"
          placeholder="e.g., https://www.youtube.com/@Fireship"
          value={channelInput}
          onChange={e => setChannelInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
        />
        <button onClick={handleAnalyze}>Analyze</button>
      </div>
    </div>
  )
}

export default InputScreen
