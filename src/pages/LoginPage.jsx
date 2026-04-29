import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Recycle, ShieldCheck, User, ArrowRight, Eye, EyeOff, Leaf, Cpu } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { validateRtdbUser } from '../services/rtdb'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login, signup, loginWithGoogle } = useAuth()
  const [role, setRole] = useState('user')
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [rtdbName, setRtdbName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        // For citizen signup: validate the hardware name exists in RTDB
        if (role === 'user' && rtdbName) {
          const exists = await validateRtdbUser(rtdbName)
          if (!exists) {
            setError(`Name "${rtdbName}" not found in the SmartBin hardware registry. Check your registered name.`)
            setLoading(false)
            return
          }
        }
        await signup(email, password, displayName, role, rtdbName || null)
        navigate(role === 'admin' ? '/admin' : '/dashboard')
      } else {
        const { profile } = await login(email, password)
        navigate((profile?.role || 'user') === 'admin' ? '/admin' : '/dashboard')
      }
    } catch (err) {
      const code = err.code
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') setError('Invalid email or password.')
      else if (code === 'auth/email-already-in-use') setError('Email already registered. Try logging in.')
      else if (code === 'auth/weak-password') setError('Password must be at least 6 characters.')
      else setError(err.message || 'Something went wrong.')
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError(''); setLoading(true)
    try {
      await loginWithGoogle()
      navigate('/dashboard')
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') setError('Google sign-in failed.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden flex-col justify-between p-16">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-white/5 rounded-full" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center"><Recycle className="text-white" size={22} /></div>
          <span className="font-heading font-bold text-xl text-white tracking-tight">SMARTBIN</span>
        </div>
        <div className="relative z-10">
          <h1 className="text-5xl font-heading font-extrabold text-white leading-tight mb-6">Technology meets<br />responsibility.</h1>
          <p className="text-white/50 text-lg max-w-md leading-relaxed">Join the smart waste revolution. Track your impact, earn government-backed rewards, and help build a cleaner future.</p>
          <div className="flex gap-8 mt-12">
            {[{ val: '1,200+', label: 'Citizens' }, { val: '98.4%', label: 'Accuracy' }, { val: '₹2.4L', label: 'Rewards Given' }].map((s, i) => (
              <div key={i}><p className="text-2xl font-heading font-black text-white">{s.val}</p><p className="text-xs text-white/40 font-medium">{s.label}</p></div>
            ))}
          </div>
        </div>
        <p className="text-white/30 text-sm relative z-10">© 2026 SmartBin · Govt. of India Initiative</p>
      </div>

      {/* Right Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center"><Recycle className="text-white" size={18} /></div>
            <span className="font-heading font-bold text-lg">SMARTBIN</span>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl font-heading font-extrabold mb-2">{mode === 'signup' ? 'Create Account' : 'Welcome back'}</h2>
            <p className="text-text-muted mb-8">{mode === 'signup' ? 'Join SmartBin and start earning.' : 'Sign in to your dashboard.'}</p>

            {/* Role Toggle */}
            <div className="bg-surface rounded-2xl p-1.5 flex mb-6">
              {[{ key: 'user', label: 'Citizen', icon: User }, { key: 'admin', label: 'Admin (Govt.)', icon: ShieldCheck }].map((r) => (
                <button key={r.key} onClick={() => { setRole(r.key); setError(''); setEmail(''); setPassword('') }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${role === r.key ? 'bg-white text-text shadow-sm' : 'text-text-muted hover:text-text'}`}>
                  <r.icon size={16} />{r.label}
                </button>
              ))}
            </div>

            {/* Google Sign-In for citizens */}
            {role === 'user' && (
              <>
                <button onClick={handleGoogleLogin} disabled={loading}
                  className="w-full bg-white border border-black/8 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 hover:bg-surface transition-all mb-4 disabled:opacity-60">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Continue with Google
                </button>
                <div className="flex items-center gap-4 mb-4"><div className="flex-1 h-px bg-black/8" /><span className="text-xs text-text-muted font-medium">or with email</span><div className="flex-1 h-px bg-black/8" /></div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Full Name</label>
                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Arjun Sharma"
                      className="w-full bg-white border border-black/8 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-text-muted/40" required />
                  </div>
                  {role === 'user' && (
                    <div>
                      <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2 flex items-center gap-2">
                        <Cpu size={12} /> Hardware Registered Name
                      </label>
                      <input type="text" value={rtdbName} onChange={(e) => setRtdbName(e.target.value)} placeholder="e.g. Pramod"
                        className="w-full bg-white border border-black/8 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-text-muted/40" />
                      <p className="text-[10px] text-text-muted mt-1.5">This is the name registered with the SmartBin hardware. Leave blank if not yet assigned.</p>
                    </div>
                  )}
                </>
              )}
              <div>
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={role === 'admin' ? 'admin@smartbin.gov.in' : 'you@email.com'}
                  className="w-full bg-white border border-black/8 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-text-muted/40" required />
              </div>
              <div>
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                    className="w-full bg-white border border-black/8 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-12" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted/50 hover:text-text-muted transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-red-500 text-sm font-medium bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl">{error}</motion.p>
                )}
              </AnimatePresence>

              <button type="submit" disabled={loading}
                className="w-full bg-primary text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{mode === 'signup' ? 'Create Account' : 'Sign In'} <ArrowRight size={16} /></>}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }} className="text-sm text-text-muted hover:text-primary transition-colors">
                {mode === 'login' ? <>Don't have an account? <span className="font-semibold text-primary">Sign Up</span></> : <>Already have an account? <span className="font-semibold text-primary">Sign In</span></>}
              </button>
            </div>
            <p className="text-center text-text-muted text-xs mt-6">By signing in, you agree to SmartBin's Terms of Service.</p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
