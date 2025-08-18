import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Project } from '../types'

export default function Dashboard({ email }: { email: string }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('id,name,description')
      .order('created_at', { ascending: false })
    if (!error && data) setProjects(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    const { data: user } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('projects').insert({
      owner_id: user.user?.id,
      name, description
    }).select('id').single()
    if (error) { alert(error.message); return }
    setName(''); setDescription('')
    navigate(`/project/${data!.id}`)
  }

  async function deleteProject(id: string, name?: string) {
    const ok = confirm(`¿Eliminar el proyecto "${name ?? id}"? Esta acción no se puede deshacer.`)
    if (!ok) return
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) { alert(error.message); return }
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="wrap">
      <div className="card" style={{width:'min(860px, 96vw)'}}>
        <div className="ok" style={{marginBottom:12}}>
          <strong>Sesión iniciada en Pudumaps</strong><br/>{email}
        </div>

        <h2 className="title" style={{marginTop:6}}>Tus proyectos</h2>
        <form onSubmit={createProject} style={{display:'grid', gap:8, marginBottom:16}}>
          <div>
            <label>Nombre</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Mi primer proyecto" required />
          </div>
          <div>
            <label>Descripción (opcional)</label>
            <input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ej: Capas base de Chile" />
          </div>
          <div className="row">
            <button className="primary" type="submit">Crear y abrir</button>
            <button className="muted" type="button" onClick={load}>Actualizar</button>
            <button className="muted" type="button" onClick={signOut} style={{marginLeft:'auto'}}>Cerrar sesión</button>
          </div>
        </form>

        {loading ? (
          <div>Cargando…</div>
        ) : projects.length === 0 ? (
          <div className="hint">Aún no tienes proyectos. Crea el primero arriba.</div>
        ) : (
          <ul style={{display:'grid', gap:8, paddingLeft:0, listStyle:'none'}}>
            {projects.map(p => (
              <li key={p.id} style={{border:'1px solid #eee', borderRadius:12, padding:12}}>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600}}>{p.name}</div>
                    <div className="hint">{p.description}</div>
                  </div>
                  <div style={{display:'flex', gap:8}}>
                    <Link to={`/project/${p.id}`} className="muted" style={{padding:'6px 10px', display:'inline-block'}}>Abrir</Link>
                    <button
                      className="muted"
                      onClick={() => deleteProject(p.id, p.name)}
                      style={{padding:'6px 10px', background:'#fee2e2', border:'1px solid #fecaca', borderRadius:10}}
                      aria-label={`Eliminar proyecto ${p.name}`}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
