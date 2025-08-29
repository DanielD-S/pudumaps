import { useEffect, useState } from "react"

interface ToastProps {
  message: string
  type?: "success" | "error" | "info"
  duration?: number
  onClose?: () => void
}

export default function Toast({ message, type = "info", duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration - 300) // iniciar fade antes
    const cleanup = setTimeout(() => onClose && onClose(), duration)
    return () => {
      clearTimeout(timer)
      clearTimeout(cleanup)
    }
  }, [duration, onClose])

  if (!visible) return null

  const base = "px-4 py-2 rounded-md shadow-md text-sm font-medium flex items-center gap-2 transition-opacity duration-300"
  const styles = {
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-blue-600 text-white",
  }

  const icons = {
    success: "✔️",
    error: "❌",
    info: "ℹ️",
  }

  return (
    <div className={`${base} ${styles[type]}`}>
      <span>{icons[type]}</span>
      <span>{message}</span>
    </div>
  )
}
