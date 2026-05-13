'use client'
import { useState, useEffect } from 'react'
import { Shield, Eye, EyeOff, CheckCircle, Trash2, Loader2 } from 'lucide-react'

export default function PJNCredencialesForm() {
  const [cuit,        setCuit]        = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [hasPassword, setHasPassword] = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [status,      setStatus]      = useState<'idle' | 'ok' | 'error'>('idle')
  const [msg,         setMsg]         = useState('')

  useEffect(() => {
    fetch('/api/perfil/pjn')
      .then(r => r.json())
      .then(d => { setCuit(d.cuit ?? ''); setHasPassword(d.hasPassword); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!cuit || !password) return
    setSaving(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/perfil/pjn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuit, password }),
      })
      if (res.ok) {
        setStatus('ok')
        setMsg('Credenciales guardadas correctamente')
        setHasPassword(true)
        setPassword('')
      } else {
        setStatus('error')
        setMsg('Error al guardar. Intentá de nuevo.')
      }
    } catch {
      setStatus('error')
      setMsg('Error de conexión.')
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar tus credenciales del PJN?')) return
    await fetch('/api/perfil/pjn', { method: 'DELETE' })
    setCuit('')
    setPassword('')
    setHasPassword(false)
    setStatus('idle')
  }

  function formatCuit(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 10) return `${digits.slice(0,2)}-${digits.slice(2)}`
    return `${digits.slice(0,2)}-${digits.slice(2,10)}-${digits.slice(10)}`
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-so-muted text-xs py-4">
      <Loader2 size={14} className="animate-spin" />
      Cargando...
    </div>
  )

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-so-surface border border-so-border flex items-center justify-center">
          <Shield size={16} className="text-so-red" />
        </div>
        <div>
          <p className="text-sm font-medium text-so-text">Credenciales PJN</p>
          <p className="text-[11px] text-so-muted">Para sincronización automática de expedientes</p>
        </div>
        {hasPassword && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-emerald-400">
            <CheckCircle size={12} /> Configurado
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">CUIT</label>
          <input
            type="text"
            value={cuit}
            onChange={e => setCuit(formatCuit(e.target.value))}
            placeholder="20-12345678-9"
            className="input w-full"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">
            Contraseña PJN {hasPassword && <span className="text-emerald-400 normal-case tracking-normal">(ya configurada)</span>}
          </label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={hasPassword ? 'Ingresá nueva contraseña para cambiar' : 'Contraseña del PJN'}
              className="input w-full pr-10"
            />
            <button type="button" onClick={() => setShowPass(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-so-muted hover:text-so-text transition-colors">
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="text-[10px] text-so-muted mt-1.5">
            La contraseña se guarda encriptada. Nadie más puede verla.
          </p>
        </div>

        {status !== 'idle' && (
          <p className={`text-xs ${status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving || !cuit || !password}
            className="btn text-xs disabled:opacity-40 flex items-center gap-2">
            {saving && <Loader2 size={12} className="animate-spin" />}
            {saving ? 'Guardando...' : 'Guardar credenciales'}
          </button>
          {hasPassword && (
            <button type="button" onClick={handleDelete}
              className="flex items-center gap-1.5 text-xs text-so-muted hover:text-red-400 transition-colors">
              <Trash2 size={12} /> Eliminar
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
