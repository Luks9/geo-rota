type ActionButtonsProps = {
  isAtivo: boolean
  onEdit: () => void
  onToggleStatus: () => void
}

function ActionButtons({ isAtivo, onEdit, onToggleStatus }: ActionButtonsProps) {
  return (
    <div className="buttons is-right">
      <button type="button" className="button is-small is-link is-light" onClick={onEdit}>
        <span className="icon is-small">
          <i className="fas fa-edit" aria-hidden="true" />
        </span>
        <span>Editar</span>
      </button>
      <button
        type="button"
        className={`button is-small ${isAtivo ? 'is-warning is-light' : 'is-success is-light'}`}
        onClick={onToggleStatus}
      >
        <span className="icon is-small">
          <i className={`fas ${isAtivo ? 'fa-user-slash' : 'fa-user-check'}`} aria-hidden="true" />
        </span>
        <span>{isAtivo ? 'Desativar' : 'Ativar'}</span>
      </button>
    </div>
  )
}

export default ActionButtons
