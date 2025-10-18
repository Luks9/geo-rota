import type { ReactNode } from 'react'

type FuncionarioModalProps = {
  title: string
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

function FuncionarioModal({ title, isOpen, onClose, children, footer }: FuncionarioModalProps) {
  return (
    <div className={`modal ${isOpen ? 'is-active' : ''}`}>
      <div className="modal-background" aria-hidden onClick={onClose} />
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">{title}</p>
          <button type="button" className="delete" aria-label="Fechar" onClick={onClose} />
        </header>
        <section className="modal-card-body">{children}</section>
        {footer && <footer className="modal-card-foot">{footer}</footer>}
      </div>
    </div>
  )
}

export default FuncionarioModal
