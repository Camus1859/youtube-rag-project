type LoadingScreenProps = {
  doesNamespaceExistInLocalStorage: string | null
  loadingSteps: { step: number; title: string; detail: string }[]
  loadingStep: number
  ragTooltip: React.ReactNode
}

const getStepStatus = (stepIndex: number, currentMarker: number): string => {
  if (stepIndex < currentMarker) {
    return 'completed'
  }
  if (stepIndex === currentMarker) {
    return 'active'
  }
  return 'pending'
}

const getStepIndicator = (stepIndex: number, currentMarker: number, stepNumber: number): string | number => {
  if (stepIndex < currentMarker) {
    return '✓'
  }
  return stepNumber
}

const shouldShowDetail = (stepIndex: number, currentMarker: number): boolean => {
  return stepIndex === currentMarker
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
            {loadingSteps.map((step, index) => {
              const status = getStepStatus(index, loadingStep)
              const indicator = getStepIndicator(index, loadingStep, step.step)
              const showDetail = shouldShowDetail(index, loadingStep)

              return (
                <div key={step.step} className={`loading-step ${status}`}>
                  <div className="step-indicator">{indicator}</div>
                  <div className="step-content">
                    <p className="step-title">{step.title}</p>
                    {showDetail && <p className="step-detail">{currentStep.detail}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

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

export default LoadingScreen
