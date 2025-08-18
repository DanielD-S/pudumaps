import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) alert(error.message)
  }

  async function signUp(e: React.MouseEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) alert(error.message)
    else alert('Revisa tu correo para confirmar la cuenta.')
  }

  return (
    <div className="wrap">
      <form className="card" onSubmit={signIn}>
        <h1 className="title">Pudumaps — Iniciar sesión</h1>
        <label>Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tucorreo@dominio.com" required />
        <label>Contraseña</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="********" required />
        <div className="row">
          <button className="primary" type="submit" disabled={busy}>{busy ? 'Ingresando…' : 'Entrar'}</button>
          <button className="muted" onClick={signUp} disabled={busy}>Crear cuenta</button>
        </div>
        <p className="hint">Primero crea la cuenta si no la tienes.</p>
      </form>
    </div>
  )
}
