type LoadingScreenProps = {
  doesNamespaceExistInLocalStorage: string | null
  loadingSteps: { step: number; title: string; detail: string }[]
  loadingStep: number
  ragTooltip: React.ReactNode
}

const LoadingScreen = ({
  doesNamespaceExistInLocalStorage,
  loadingSteps,
  loadingStep,
  ragTooltip,
}: LoadingScreenProps) => {
  const currentStep = loadingSteps[loadingStep]

  if (doesNamespaceExistInLocalStorage !== 'true') {
    return (
      <div className="container">
        <h1>Learn From Creators</h1>
        <p className="subtitle-note" style={{ marginBottom: '1.5rem' }}>
          Powered by {ragTooltip}
        </p>
        <div className="loading">
          <div className="spinner"></div>
          <div className="loading-steps">
            {loadingSteps.map((s, i) => (
              <div
                key={s.step}
                className={`loading-step ${i < loadingStep ? 'completed' : i === loadingStep ? 'active' : 'pending'}`}
              >
                <div className="step-indicator">{i < loadingStep ? '✓' : s.step}</div>
                <div className="step-content">
                  <p className="step-title">{s.title}</p>
                  {i === loadingStep && <p className="step-detail">{currentStep.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  } else {
    return (
      <div className="container">
        <h1>Learn From Creators</h1>
        <p className="subtitle-note" style={{ marginBottom: '1.5rem' }}>
          Powered by {ragTooltip}
        </p>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }
}

export default LoadingScreen
