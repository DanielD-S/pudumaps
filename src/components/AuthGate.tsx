import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import type { Session } from "@supabase/supabase-js"

interface Props {
  children: (session: Session) => React.ReactNode
  fallback: React.ReactNode
}

export default function AuthGate({ children, fallback }: Props) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl shadow p-6">
          Cargando…
        </div>
      </div>
    )
  }

  if (!session) return <>{fallback}</>
  return <>{children(session)}</>
}
