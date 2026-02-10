function FullPageSpinner() {
  return (
    <div className="section has-text-centered" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>
        <span className="icon is-large has-text-success">
          <i className="fas fa-circle-notch fa-spin fa-2x" aria-hidden="true" />
        </span>
        <p className="is-size-5 mt-3">Carregando...</p>
      </div>
    </div>
  )
}

export default FullPageSpinner
