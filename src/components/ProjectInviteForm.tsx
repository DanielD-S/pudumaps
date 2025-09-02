import { useState } from "react"
import { supabase } from "../lib/supabase"

interface Props {
  projectId: string
  onInvite?: () => void
  onNotify?: (msg: string, type?: "success" | "error" | "info") => void
}

export default function ProjectInviteForm({ projectId, onInvite, onNotify }: Props) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"viewer" | "editor">("viewer")
  const [loading, setLoading] = useState(false)

  async function inviteUser() {
    if (!email) {
      onNotify?.("❌ Debes ingresar un correo", "error")
      return
    }
    setLoading(true)

    try {
      // Buscar el usuario en auth.users por correo
      const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
      if (userError) throw userError

      const invited = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
      if (!invited) {
        onNotify?.("❌ Usuario no encontrado", "error")
        setLoading(false)
        return
      }

      // Insertar en project_members
      const { error } = await supabase
        .from("project_members")
        .upsert({ project_id: projectId, user_id: invited.id, role })

      if (error) throw error

      onNotify?.(`✅ ${email} invitado como ${role}`, "success")
      setEmail("")
      setRole("viewer")
      onInvite?.()
    } catch (e: any) {
      console.error(e)
      onNotify?.("❌ Error al invitar usuario", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card space-y-3">
      <h3 className="subtitle">Invitar usuario</h3>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Correo del usuario"
        className="input"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as "viewer" | "editor")}
        className="input"
      >
        <option value="viewer">👀 Solo lectura</option>
        <option value="editor">✏️ Editor</option>
      </select>
      <button
        onClick={inviteUser}
        disabled={loading}
        className="btn btn-primary w-full"
      >
        {loading ? "Invitando..." : "Invitar"}
      </button>
    </div>
  )
}
