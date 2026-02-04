import type { UserInsight } from "./types";

type ChatScreenProps = {
  channelInput: string
  handleNew: () => void
  messages: { role: 'user' | 'assistant'; content: string; insight?: UserInsight }[]
  isThinking: boolean
  inputValue: string
  setInputValue: (value: string) => void
  handleFollowUp: (option: string) => void
  handleSend: () => void
}

const ChatScreen = ({
  channelInput,
  handleNew,
  messages,
  isThinking,
  inputValue,
  setInputValue,
  handleFollowUp,
  handleSend,
}: ChatScreenProps) => {
  return (
    <div className="container">
      <h1>Learn From Creators</h1>
      <div className="chat-header">
        <p className="chat-title">Analyzing: {channelInput}</p>
        <button className="new-btn" onClick={handleNew}>
          New
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <p>{msg.content}</p>
            {msg.role === 'assistant' && msg.insight?.followUpOptions && (
              <div className="follow-ups">
                {msg.insight.followUpOptions.map((option, j) => (
                  <button key={j} onClick={() => handleFollowUp(option)}>
                    {option}
                  </button>
                ))}
              </div>
            )}
            {msg.role === 'assistant' && msg.insight?.metrics && (
              <div className="metrics">
                <span className="metric">
                  <span className="metric-label">Tokens:</span> {msg.insight.metrics.inputTokens} in /{' '}
                  {msg.insight.metrics.outputTokens} out
                </span>
                <span className="metric">
                  <span className="metric-label">Latency:</span> {(msg.insight.metrics.latencyMs / 1000).toFixed(2)}s
                </span>
                <span className={`metric validation ${msg.insight.metrics.schemaValidated ? 'valid' : 'invalid'}`}>
                  {msg.insight.metrics.schemaValidated ? '✓ Schema Valid' : '✗ Schema Failed'}
                </span>
              </div>
            )}
          </div>
        ))}
        {isThinking && (
          <div className="message assistant">
            <p className="thinking">Thinking...</p>
          </div>
        )}
      </div>

      <div className="input-row">
        <input
          type="text"
          placeholder="Ask a question..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          disabled={isThinking}
        />
        <button onClick={handleSend} disabled={isThinking}>
          Send
        </button>
      </div>
    </div>
  )
}

export default ChatScreen
