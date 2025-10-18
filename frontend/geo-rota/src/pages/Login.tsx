import { type ChangeEvent, type FormEvent, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'
import { useNotification } from '../hooks/useNotification'

type FormState = {
  email: string
  password: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, isAuthenticating } = useAuth()
  const { success, warning, danger } = useNotification()
  const [form, setForm] = useState<FormState>({ email: '', password: '' })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const locationState = location.state as { from?: { pathname?: string } } | undefined
  const redirectPath = locationState?.from?.pathname ?? '/'

  if (isAuthenticated) {
    return <Navigate to={redirectPath} replace />
  }

  const handleInputChange = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setForm((prev) => ({ ...prev, [field]: value }))
    setFormErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
    if (submitError) setSubmitError(null)
  }

  const validate = (): FormErrors => {
    const errors: FormErrors = {}
    const trimmedEmail = form.email.trim()

    if (!trimmedEmail) {
      errors.email = 'Informe o e-mail.'
    } else if (!emailPattern.test(trimmedEmail)) {
      errors.email = 'E-mail invalido.'
    }

    if (!form.password.trim()) {
      errors.password = 'Informe a senha.'
    }

    return errors
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      warning('Corrija os campos destacados e tente novamente.', { duration: 3500 })
      return
    }

    try {
      await login(form.email, form.password)
      success('Login realizado com sucesso!', { duration: 2500 })
      navigate(redirectPath, { replace: true })
    } catch (err) {
      if (err instanceof Error && err.message) {
        setSubmitError(err.message)
        danger(err.message, { duration: 5000 })
      } else {
        setSubmitError('Nao foi possivel autenticar. Tente novamente.')
        danger('Nao foi possivel autenticar. Tente novamente.', { duration: 5000 })
      }
    }
  }

  return (
    <section className="section is-fullheight-with-navbar">
      <div className="container">
        <div className="columns is-centered">
          <div className="column is-5-tablet is-4-desktop is-3-widescreen">
            <div className="box">
              <h1 className="title is-4 has-text-centered mb-5">Acesse o GeoRota</h1>
              {submitError && (
                <div className="notification is-danger is-light" role="alert">
                  {submitError}
                </div>
              )}
              <form onSubmit={handleSubmit} noValidate>
                <div className="field">
                  <label className="label" htmlFor="email">
                    E-mail
                  </label>
                  <div className="control has-icons-left">
                    <input
                      id="email"
                      type="email"
                      className={`input ${formErrors.email ? 'is-danger' : ''}`}
                      placeholder="seu.nome@empresa.com"
                      value={form.email}
                      onChange={handleInputChange('email')}
                      autoComplete="email"
                      required
                    />
                    <span className="icon is-small is-left">
                      <i className="fas fa-envelope" aria-hidden="true" />
                    </span>
                  </div>
                  {formErrors.email && <p className="help is-danger">{formErrors.email}</p>}
                </div>

                <div className="field">
                  <label className="label" htmlFor="password">
                    Senha
                  </label>
                  <div className="control has-icons-left">
                    <input
                      id="password"
                      type="password"
                      className={`input ${formErrors.password ? 'is-danger' : ''}`}
                      placeholder="Senha"
                      value={form.password}
                      onChange={handleInputChange('password')}
                      autoComplete="current-password"
                      required
                    />
                    <span className="icon is-small is-left">
                      <i className="fas fa-lock" aria-hidden="true" />
                    </span>
                  </div>
                  {formErrors.password && <p className="help is-danger">{formErrors.password}</p>}
                </div>

                <div className="field mt-5">
                  <button
                    type="submit"
                    className={`button is-success is-fullwidth ${isAuthenticating ? 'is-loading' : ''}`}
                    disabled={isAuthenticating}
                  >
                    Entrar
                  </button>
                </div>
              </form>
            </div>
            <p className="has-text-centered is-size-7 has-text-grey">
              Use as credenciais fornecidas pelo administrador para acessar a plataforma.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Login
