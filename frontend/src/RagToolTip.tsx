const RagTooltip = (
  <span className="rag-tooltip">
    RAG
    <span className="tooltip-text">
      <strong>Retrieval Augmented Generation</strong> combines LLMs with external knowledge retrieval. Instead of
      relying only on training data, it fetches relevant content and uses it as context to generate accurate responses.
      <a
        href="https://en.wikipedia.org/wiki/Retrieval-augmented_generation#RAG_and_LLM_limitations"
        target="_blank"
        rel="noopener noreferrer"
        className="tooltip-link"
      >
        Learn more
      </a>
    </span>
  </span>
)

export default RagTooltip
