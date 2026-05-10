import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', username: '', password: '', full_name: '' })
  const [loading, setLoading] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    console.log("🚀 Intentando registro en:", api.defaults.baseURL + '/auth/register');
    try {
      const res = await api.post('/auth/register', form)
      console.log("✅ Registro exitoso:", res.data);
      toast.success('Cuenta creada. Revisa tu email para verificarla.')
      navigate('/login')
    } catch (err: any) {
      console.error("❌ Error en registro:", err.response || err);
      toast.error(err.response?.data?.detail || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(-45deg, #f8fafc, #eff6ff, #f5f3ff, #f8fafc)',
      backgroundSize: '400% 400%',
      animation: 'gradientBG 15s ease infinite',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: 'system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .premium-input {
          width: 100%;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          padding: 1rem 1.25rem;
          font-size: 1rem;
          transition: all 0.3s;
          outline: none;
          box-sizing: border-box;
          color: #0f172a;
        }
        .premium-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
        .premium-btn {
          width: 100%;
          background: #0f172a;
          color: white;
          font-weight: 800;
          padding: 1.25rem;
          border-radius: 1rem;
          border: none;
          cursor: pointer;
          transition: all 0.4s;
          position: relative;
          overflow: hidden;
          margin-top: 1rem;
        }
        .premium-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.4);
          background: #1e293b;
        }
        .premium-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%',
          maxWidth: '500px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          padding: '3rem',
          borderRadius: '2.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 1)',
          zIndex: 10
        }}
      >
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '1rem', display: 'flex' }}>
              <Zap style={{ color: 'white', width: '1.5rem', height: '1.5rem' }} />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>IAPost</h1>
          </div>
          <p style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 0.5rem 0' }}>
            v1.0.8 - Final Fix
          </p>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.5rem 0' }}>Crear Cuenta</h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Empieza tu viaje con inteligencia artificial</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', marginLeft: '0.2rem' }}>Nombre Completo</label>
            <input 
              type="text"
              required
              className="premium-input"
              placeholder="Miki Fernandez"
              value={form.full_name}
              onChange={set('full_name')}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', marginLeft: '0.2rem' }}>Usuario</label>
            <input 
              type="text"
              required
              className="premium-input"
              placeholder="miki"
              value={form.username}
              onChange={set('username')}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', marginLeft: '0.2rem' }}>Email Profesional</label>
            <input 
              type="email"
              required
              className="premium-input"
              placeholder="tu@email.com"
              value={form.email}
              onChange={set('email')}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', marginLeft: '0.2rem' }}>Contraseña</label>
            <input 
              type="password"
              required
              className="premium-input"
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
            />
          </div>

          <button 
            type="submit" 
            className="premium-btn"
            disabled={loading}
          >
            {loading ? 'Construyendo cuenta...' : 'Registrarme Ahora'}
          </button>
        </form>

        <p style={{ marginTop: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>
          ¿Ya tienes cuenta? <Link to="/login" style={{ color: '#3b82f6', fontWeight: 800, textDecoration: 'none' }}>Inicia sesión</Link>
        </p>
      </motion.div>
    </div>
  )
}
