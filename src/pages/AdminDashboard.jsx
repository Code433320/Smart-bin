import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router'
import { LayoutDashboard, Users, MapPin, Settings, AlertTriangle, Send, Activity, Trash2, Cpu, LogOut, Database, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardStats, getAlerts, addBroadcast } from '../services/firestore'
import { subscribeToBins, seedBinsInRTDB } from '../services/rtdb'
import { seedDatabase, patchDemoUsers } from '../services/seedData'

// Bin fill color based on level
function fillColor(level) {
  if (level >= 80) return 'bg-red-500'
  if (level >= 50) return 'bg-amber-400'
  return 'bg-primary'
}
function fillTextColor(level) {
  if (level >= 80) return 'text-red-500'
  if (level >= 50) return 'text-amber-500'
  return 'text-primary'
}

const AdminDashboard = () => {
  const { currentUser, userProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [bins, setBins] = useState([])
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [patching, setPatching] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [activeTab, setActiveTab] = useState('Overview')

  useEffect(() => {
    fetchDashData()

    // Subscribe to REAL-TIME bin updates from Realtime Database
    const unsub = subscribeToBins((liveBins) => {
      setBins(liveBins)
    })

    return () => unsub()
  }, [])

  async function fetchDashData() {
    try {
      const [s, a] = await Promise.all([getDashboardStats(), getAlerts(5)])
      setStats(s)
      setAlerts(a)
    } catch (err) {
      console.error('Admin dashboard error:', err)
    }
    setLoadingData(false)
  }

  const handleLogout = async () => { await logout(); navigate('/') }

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) return
    setSending(true)
    try {
      await addBroadcast({ message: broadcastMsg, zone: 'Zone A', sentBy: currentUser?.uid })
      setBroadcastMsg('')
      alert('Broadcast sent!')
    } catch (err) { console.error('Broadcast error:', err) }
    setSending(false)
  }

  const handlePatch = async () => {
    setPatching(true)
    try {
      await patchDemoUsers()
      await fetchDashData()
    } catch (err) { console.error('Patch error:', err) }
    setPatching(false)
  }

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const seededBins = await seedBinsInRTDB()
      setBins(seededBins)
      await fetchDashData()
      alert(`✅ Seeded ${seededBins.length} bins successfully!`)
    } catch (err) {
      console.error('Seed error:', err)
      alert('Seed failed: ' + err.message)
    }
    setSeeding(false)
  }

  const sideItems = [
    { icon: LayoutDashboard, label: 'Overview' },
    { icon: MapPin, label: 'Bin Network' },
    { icon: Users, label: 'User Analytics' },
    { icon: Cpu, label: 'System Health' },
    { icon: Settings, label: 'Configuration' },
  ]

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  const s = stats || { totalCitizens: 0, wasteProcessed: '0.0 Tons', pointsIssued: '0', activeAlerts: 0, binsOnline: 0, distribution: { dry: 0, wet: 0, hazardous: 0 }, accuracy: 0 }
  const binsOnline = bins.filter(b => b.status === 'online').length
  const binsCritical = bins.filter(b => b.status === 'critical' || (b.fillLevel >= 80)).length

  const metrics = [
    { label: 'Total Citizens', val: s.totalCitizens.toLocaleString(), trend: 'Live', icon: Users },
    { label: 'Waste Processed', val: s.wasteProcessed, trend: 'Live', icon: Trash2 },
    { label: 'Points Issued', val: s.pointsIssued, trend: 'Live', icon: Activity },
    { label: 'Critical Bins', val: String(binsCritical).padStart(2, '0'), trend: binsCritical > 0 ? '⚠ Action' : 'All OK', icon: AlertTriangle, critical: binsCritical > 0 },
  ]

  function formatAlertTime(timestamp) {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const diff = Date.now() - date.getTime()
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="relative min-h-screen bg-background text-text flex">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 border-r border-black/5 flex flex-col p-5 bg-white shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <Link to="/" className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0">
            <Trash2 className="text-white" size={20} />
          </Link>
          <span className="font-heading font-black text-base tracking-tight hidden md:block">SMARTBIN</span>
        </div>
        <nav className="flex-1 space-y-1">
          {sideItems.map((item, i) => (
            <button key={i} onClick={() => setActiveTab(item.label)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === item.label ? 'bg-primary text-white shadow-md shadow-primary/15' : 'hover:bg-surface text-text-muted hover:text-text'}`}>
              <item.icon size={18} />
              <span className="font-semibold text-sm hidden md:block">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-5 border-t border-black/5 space-y-2">
          <button onClick={handlePatch} disabled={patching}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-amber-50 text-text-muted hover:text-amber-600 transition-all disabled:opacity-50">
            <Users size={18} />
            <span className="font-semibold text-sm hidden md:block">{patching ? 'Fixing...' : 'Fix Count'}</span>
          </button>
          <button onClick={handleSeed} disabled={seeding}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface text-text-muted hover:text-text transition-all disabled:opacity-50">
            <Database size={18} />
            <span className="font-semibold text-sm hidden md:block">{seeding ? 'Seeding...' : 'Seed Bins'}</span>
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-text-muted hover:text-red-500 transition-all">
            <LogOut size={18} />
            <span className="font-semibold text-sm hidden md:block">Logout</span>
          </button>
          <div className="flex items-center gap-3 p-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-green-300" />
            <div className="hidden md:block">
              <p className="text-xs font-bold text-text">{userProfile?.displayName || 'Admin'}</p>
              <p className="text-[10px] text-text-muted">Govt. Official</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="p-6 flex justify-between items-center border-b border-black/5 bg-white/50 backdrop-blur-sm">
          <div>
            <h2 className="text-2xl font-black font-heading">System Overview</h2>
            <p className="text-text-muted text-sm">Live monitoring — Firebase Realtime DB</p>
          </div>
          <div className="flex gap-3 items-center">
            <div className={`px-4 py-2 rounded-xl flex items-center gap-2 ${binsOnline > 0 ? 'bg-primary/10 text-primary' : 'bg-red-50 text-red-500'}`}>
              {binsOnline > 0 ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span className="text-xs font-bold">{bins.length > 0 ? `${binsOnline}/${bins.length} Bins Online` : 'No Bins — Click Seed'}</span>
              {binsOnline > 0 && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
            </div>
          </div>
        </header>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Top Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className={`bg-white p-5 rounded-2xl border shadow-sm ${m.critical ? 'border-red-200' : 'border-black/5'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2 rounded-xl ${m.critical ? 'bg-red-50' : 'bg-surface'}`}>
                    <m.icon size={16} className={m.critical ? 'text-red-500' : 'text-primary'} />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${m.critical ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}>{m.trend}</span>
                </div>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{m.label}</p>
                <h3 className="text-2xl font-heading font-black mt-1 text-text">{m.val}</h3>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Live Bin Cards */}
            <div className="xl:col-span-8 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base font-heading">Live Bin Network</h3>
                <span className="text-xs text-text-muted bg-surface px-3 py-1.5 rounded-lg">{bins.length} bins total</span>
              </div>

              {bins.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-black/10 p-12 text-center">
                  <Database size={32} className="text-text-muted/30 mx-auto mb-3" />
                  <p className="text-text-muted text-sm">No bin data found in Realtime Database.</p>
                  <button onClick={handleSeed} disabled={seeding}
                    className="mt-4 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {seeding ? 'Seeding...' : '⚡ Seed 4 Bins Now'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bins.map((bin, i) => {
                    const fill = typeof bin.fillLevel === 'number' ? bin.fillLevel : parseInt(bin.fillLevel) || 0
                    const isOnline = bin.status === 'online'
                    const isCritical = bin.status === 'critical' || fill >= 80
                    return (
                      <motion.div key={bin.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
                        className={`bg-white p-5 rounded-2xl border shadow-sm ${isCritical ? 'border-red-200' : 'border-black/5'}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-bold text-sm text-text">{bin.name || bin.id}</p>
                            <p className="text-[11px] text-text-muted mt-0.5">
                              <MapPin size={10} className="inline mr-1" />
                              {bin.location || 'Unknown location'}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${
                            isCritical ? 'bg-red-100 text-red-600' :
                            isOnline ? 'bg-green-50 text-green-600' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-red-500 animate-pulse' : isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {isCritical ? 'Critical' : isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>

                        {/* Fill Level Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-text-muted">Fill Level</span>
                            <span className={`font-black ${fillTextColor(fill)}`}>{fill}%</span>
                          </div>
                          <div className="h-2.5 bg-surface rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${fill}%` }} transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                              className={`h-full rounded-full ${fillColor(fill)}`} />
                          </div>
                        </div>

                        <div className="flex justify-between text-[11px] text-text-muted">
                          <span className="bg-surface px-2 py-1 rounded-lg">{bin.wasteType || 'Mixed'}</span>
                          <span>Updated: {bin.lastUpdated ? new Date(bin.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}

              {/* Waste Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
                  <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Activity size={16} className="text-primary" /> Classification Accuracy</h3>
                  <div className="flex items-center justify-center h-32 relative">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 128 128">
                      <circle cx="64" cy="64" r="52" fill="transparent" stroke="#F5F0EA" strokeWidth="10" />
                      <circle cx="64" cy="64" r="52" fill="transparent" stroke="#1F7A63" strokeWidth="10"
                        strokeDasharray="326.7" strokeDashoffset={326.7 * (1 - s.accuracy / 100)} strokeLinecap="round" />
                    </svg>
                    <div className="absolute text-center">
                      <p className="text-xl font-black text-text">{s.accuracy}%</p>
                      <p className="text-[9px] text-text-muted font-bold">ACCURACY</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
                  <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Trash2 size={16} className="text-primary" /> Waste Distribution</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Dry Waste', val: `${s.distribution.dry}%`, color: 'bg-blue-500' },
                      { label: 'Wet Waste', val: `${s.distribution.wet}%`, color: 'bg-primary' },
                      { label: 'Hazardous', val: `${s.distribution.hazardous}%`, color: 'bg-red-500' },
                    ].map((w, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-text-muted">{w.label}</span>
                          <span className="font-bold text-text">{w.val}</span>
                        </div>
                        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: w.val }} transition={{ duration: 1, delay: 0.5 + i * 0.2 }}
                            className={`h-full ${w.color} rounded-full`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel — Broadcast + Alerts */}
            <div className="xl:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
                <h3 className="text-base font-bold font-heading mb-1">Broadcast Message</h3>
                <p className="text-xs text-text-muted mb-4">Send feedback to all citizens in a zone.</p>
                <textarea value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)}
                  className="w-full bg-surface border-none rounded-xl p-4 text-sm focus:ring-1 focus:ring-primary outline-none mb-4 min-h-[90px] resize-none placeholder:text-text-muted/50"
                  placeholder="Great job this week! Keep up the streak for bonus points." />
                <button onClick={handleBroadcast} disabled={sending || !broadcastMsg.trim()}
                  className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50">
                  <Send size={16} /> {sending ? 'Sending...' : 'Send to Zone A'}
                </button>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-red-600">
                  <AlertTriangle size={16} /> Active Alerts
                </h3>
                <div className="space-y-3">
                  {/* Auto-generate alerts from critical bins */}
                  {bins.filter(b => b.status === 'critical' || b.fillLevel >= 80).map((bin, i) => (
                    <div key={`bin-alert-${i}`} className="p-3 rounded-xl bg-red-50 border border-red-100">
                      <p className="text-sm font-semibold text-text">🚨 {bin.name || bin.id} is {bin.fillLevel}% full</p>
                      <p className="text-[10px] text-text-muted mt-0.5">{bin.location} — Needs immediate pickup</p>
                    </div>
                  ))}
                  {alerts.length > 0 ? alerts.map((a, i) => (
                    <div key={a.id || i} className={`p-3 rounded-xl ${
                      a.type === 'critical' ? 'bg-red-50 border border-red-100' :
                      a.type === 'warning' ? 'bg-amber-50 border border-amber-100' :
                      'bg-blue-50 border border-blue-100'
                    }`}>
                      <p className="text-sm font-semibold text-text">{a.message}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">{formatAlertTime(a.timestamp)}</p>
                    </div>
                  )) : bins.filter(b => b.status === 'critical' || b.fillLevel >= 80).length === 0 && (
                    <p className="text-center text-text-muted text-sm py-4">✅ No active alerts</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
