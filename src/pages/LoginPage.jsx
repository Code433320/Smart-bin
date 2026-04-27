import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Recycle, ShieldCheck, User, ArrowRight, Eye, EyeOff, Leaf } from 'lucide-react'

const LoginPage = () => {
  const navigate = useNavigate()
  const [role, setRole] = useState('user') // 'user' or 'admin'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const credentials = {
    user: { email: 'citizen@smartbin.in', password: 'citizen123' },
    admin: { email: 'admin@smartbin.gov.in', password: 'admin123' },
  }

  const handleLogin = (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    setTimeout(() => {
      const cred = credentials[role]
      if (email === cred.email && password === cred.password) {
        navigate(role === 'admin' ? '/admin' : '/dashboard')
      } else {
        setError('Invalid credentials. Try the hint below.')
        setLoading(false)
      }
    }, 800)
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden flex-col justify-between p-16">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] border border-white/5 rounded-full" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <Recycle className="text-white" size={22} />
            </div>
            <span className="font-heading font-bold text-xl text-white tracking-tight">SMARTBIN</span>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-5xl font-heading font-extrabold text-white leading-tight mb-6">
            Technology meets<br />responsibility.
          </h1>
          <p className="text-white/50 text-lg max-w-md leading-relaxed">
            Join the smart waste revolution. Track your impact, earn government-backed rewards, and help build a cleaner future.
          </p>

          <div className="flex gap-8 mt-12">
            {[
              { val: '1,200+', label: 'Citizens' },
              { val: '98.4%', label: 'Accuracy' },
              { val: '₹2.4L', label: 'Rewards Given' },
            ].map((s, i) => (
              <div key={i}>
                <p className="text-2xl font-heading font-black text-white">{s.val}</p>
                <p className="text-xs text-white/40 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-sm relative z-10">© 2026 SmartBin · Govt. of India Initiative</p>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <Recycle className="text-white" size={18} />
            </div>
            <span className="font-heading font-bold text-lg">SMARTBIN</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-heading font-extrabold mb-2">Welcome back</h2>
            <p className="text-text-muted mb-8">Sign in to access your dashboard.</p>

            {/* Role Toggle */}
            <div className="bg-surface rounded-2xl p-1.5 flex mb-8">
              {[
                { key: 'user', label: 'Citizen', icon: User },
                { key: 'admin', label: 'Admin (Govt.)', icon: ShieldCheck },
              ].map((r) => (
                <button
                  key={r.key}
                  onClick={() => { setRole(r.key); setError(''); setEmail(''); setPassword('') }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                    role === r.key
                      ? 'bg-white text-text shadow-sm'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  <r.icon size={16} />
                  {r.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={credentials[role].email}
                  className="w-full bg-white border border-black/8 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-text-muted/40"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-black/8 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted/50 hover:text-text-muted transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-red-500 text-sm font-medium bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Credential Hint */}
            <div className="mt-8 bg-surface rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Leaf size={14} className="text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Demo Credentials</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <p className="text-text-muted">
                  <span className="font-semibold text-text">Email:</span> {credentials[role].email}
                </p>
                <p className="text-text-muted">
                  <span className="font-semibold text-text">Password:</span> {credentials[role].password}
                </p>
              </div>
            </div>

            <p className="text-center text-text-muted text-xs mt-8">
              By signing in, you agree to SmartBin's Terms of Service.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
