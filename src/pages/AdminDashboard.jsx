import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router'
import { LayoutDashboard, Users, MapPin, Settings, AlertTriangle, Send, Activity, Trash2, Cpu, LogOut, Database, Wifi, WifiOff, History, Thermometer, Droplets, QrCode, Flame, ShieldCheck, Truck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardStats, getAlerts, subscribeToAlerts, addBroadcast, addTemperatureAlert, resolveTemperatureAlert, subscribeToFirestoreLeaderboard } from '../services/firestore'
import { subscribeToBins, seedBinsInRTDB, subscribeToBinData, computeDisposalStats, subscribeToSharedBin, subscribeToLeaderboard, syncAllRtdbUsers, updateBinData } from '../services/rtdb'
import { seedDatabase, patchDemoUsers } from '../services/seedData'
import { toast } from 'react-hot-toast'
import BinVisual from '../components/ui/BinVisual'

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
  const alertsRef = React.useRef([])
  const [bins, setBins] = useState([])
  const [disposalEvents, setDisposalEvents] = useState([])
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [patching, setPatching] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [activeTab, setActiveTab] = useState('Overview')
  const [selectedBin, setSelectedBin] = useState(null)
  const [tempAlerts, setTempAlerts] = useState([]) // Active high-temp alerts
  const [dispatchingCrew, setDispatchingCrew] = useState({}) // Track which alerts have crew dispatched
  const [users, setUsers] = useState([])

  const TEMP_THRESHOLD = 50 // °C — fire risk threshold

  // Track which temp alerts we've already logged to Firestore (avoid duplicates)
  const loggedTempAlertsRef = React.useRef(new Set())
  
  useEffect(() => {
    alertsRef.current = alerts
  }, [alerts])

  useEffect(() => {
    fetchDashData()

    // 1. REAL-TIME ALERTS: Keep the sidebar and banners in sync
    const unsubAlerts = subscribeToAlerts((activeAlerts) => {
      setAlerts(activeAlerts)
    })

    // 2. REAL-TIME BINS: Monitor sensor data
    const unsubBins = subscribeToBins((liveBins) => {
      if (!liveBins || liveBins.length === 0) return
      
      const newTempAlerts = []
      
      // Monitor ALL bins (hardware + simulated) for temperature alerts
      liveBins.forEach(bin => {
        const temp = bin.temperature
        // Only show alert in banner if it's hot AND there's an active (unresolved) alert in Firestore
        const activeAlert = alertsRef.current.find(a => a.binId === bin.id && a.category === 'temperature' && !a.resolved)

        if (temp !== null && temp >= TEMP_THRESHOLD) {
          if (activeAlert) {
            newTempAlerts.push({
              binId: bin.id,
              binName: bin.name || bin.id,
              location: bin.location || 'Primary Site',
              temperature: temp,
            })
          }
          
          // Log to Firestore ONLY if we haven't already logged this specific trigger
          // and there isn't already an active alert for this bin
          if (!loggedTempAlertsRef.current.has(bin.id) && !activeAlert) {
            loggedTempAlertsRef.current.add(bin.id)
            addTemperatureAlert(bin.id, bin.name || bin.id, temp).catch(console.error)
            toast.error(`🔥 FIRE RISK: ${bin.name || bin.id} is at ${temp.toFixed(1)}°C!`, {
              id: `temp-alert-${bin.id}`,
              duration: 10000,
              icon: '🔥'
            })
          }
        } else if (temp !== null && temp < TEMP_THRESHOLD) {
          loggedTempAlertsRef.current.delete(bin.id)
        }
      })
      
      setTempAlerts(newTempAlerts)
      setBins(liveBins)
    })

    // Subscribe to binData disposal events
    const unsubDisposal = subscribeToBinData((events) => {
      setDisposalEvents(events)
    })

    // 3. REAL-TIME LEADERBOARD
    syncAllRtdbUsers().catch(console.error)
    const unsubLb = subscribeToFirestoreLeaderboard(20, (data) => setUsers(data))

    return () => { 
      unsubAlerts()
      unsubBins() 
      unsubDisposal() 
      unsubLb() 
    }
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
      toast.success('Broadcast sent to all citizens!')
    } catch (err) { console.error('Broadcast error:', err) }
    setSending(false)
  }

  // 🔥 Temperature alert actions
  const handleDispatchCrew = async (binId) => {
    setDispatchingCrew(prev => ({ ...prev, [binId]: 'dispatched' }))
    toast.success(`🚒 Crew dispatched to ${binId}!`, { icon: '🚒', duration: 5000 })
  }

  const handleConfirmAction = async (binId) => {
    try {
      setDispatchingCrew(prev => ({ ...prev, [binId]: 'confirmed' }))
      
      // Find the active alert for this bin to resolve it
      const alert = alerts.find(a => a.binId === binId && a.category === 'temperature' && !a.resolved)
      if (alert) {
        await resolveTemperatureAlert(alert.id, 'crew_dispatched')
      }

      // Reset temperature in RTDB to simulate crew fixing it
      await updateBinData(binId, { temperature: 30.0 + Math.random() * 2 })
      
      toast.success(`✅ Action confirmed for ${binId}. Temperature reset.`, { icon: '✅', duration: 5000 })
      fetchDashData()
    } catch (err) {
      console.error('Resolution error:', err)
      toast.error('Failed to fully resolve alert.')
    }
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

  const disposalStats = computeDisposalStats(disposalEvents)

  const sideItems = [
    { icon: LayoutDashboard, label: 'Overview' },
    { icon: History, label: 'Disposal Log' },
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

  const s = stats || { totalCitizens: 0, wasteProcessed: '0.0 Tons', pointsIssued: '0', activeAlerts: 0, binsOnline: 0, distribution: { dry: 0, wet: 0, hazardous: 0 } }
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

          {/* 🔥 TEMPERATURE PRIORITY ALERT BANNER */}
          {tempAlerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {tempAlerts.map((ta) => {
                const status = dispatchingCrew[ta.binId]
                return (
                  <div key={`temp-${ta.binId}`}
                    className="bg-gradient-to-r from-red-600 to-orange-500 text-white p-5 rounded-2xl shadow-lg shadow-red-500/20 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                      <Flame size={24} className="text-white animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                          🔥 PRIORITY 1 — FIRE RISK
                        </span>
                      </div>
                      <h4 className="font-bold text-lg">{ta.binName} — {ta.temperature}°C</h4>
                      <p className="text-white/70 text-xs">{ta.location} · Last recorded temperature exceeds {TEMP_THRESHOLD}°C threshold</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {status === 'confirmed' ? (
                        <div className="flex items-center gap-2 bg-white/20 px-4 py-2.5 rounded-xl">
                          <ShieldCheck size={16} />
                          <span className="text-xs font-bold">Action Confirmed</span>
                        </div>
                      ) : status === 'dispatched' ? (
                        <button onClick={() => handleConfirmAction(ta.binId)}
                          className="flex items-center gap-2 bg-white text-red-600 px-4 py-2.5 rounded-xl text-xs font-bold hover:shadow-lg transition-all">
                          <ShieldCheck size={14} /> Confirm Action Taken
                        </button>
                      ) : (
                        <>
                          <button onClick={() => handleDispatchCrew(ta.binId)}
                            className="flex items-center gap-2 bg-white text-red-600 px-4 py-2.5 rounded-xl text-xs font-bold hover:shadow-lg transition-all">
                            <Truck size={14} /> Send Crew
                          </button>
                          <button onClick={() => handleConfirmAction(ta.binId)}
                            className="flex items-center gap-2 bg-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-white/30 transition-all">
                            <ShieldCheck size={14} /> Confirm Action
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}

          {/* ═══ DISPOSAL LOG TAB ═══ */}
          {activeTab === 'Disposal Log' ? (
            <div className="space-y-6">
              {/* Disposal Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2"><History size={14} className="text-primary" /><span className="text-[10px] font-bold text-text-muted uppercase">Total Disposals</span></div>
                  <h3 className="text-2xl font-heading font-black text-text">{disposalStats.total}</h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2"><Thermometer size={14} className="text-amber-500" /><span className="text-[10px] font-bold text-text-muted uppercase">Avg Temp</span></div>
                  <h3 className="text-2xl font-heading font-black text-text">{disposalStats.avgTemp}°C</h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2"><Activity size={14} className="text-blue-500" /><span className="text-[10px] font-bold text-text-muted uppercase">Points Given</span></div>
                  <h3 className="text-2xl font-heading font-black text-text">{disposalStats.totalPoints}</h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2"><Trash2 size={14} className="text-primary" /><span className="text-[10px] font-bold text-text-muted uppercase">By Type</span></div>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded">D:{disposalStats.byType.Dry}</span>
                    <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded">W:{disposalStats.byType.Wet}</span>
                    <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded">H:{disposalStats.byType.Hazardous}</span>
                  </div>
                </div>
              </div>

              {/* Live Disposal Table */}
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-black/5 flex justify-between items-center">
                  <h3 className="font-bold text-base font-heading flex items-center gap-2">
                    <History size={18} className="text-primary" /> Hardware Disposal Events
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs text-text-muted font-bold">Live from RTDB</span>
                  </div>
                </div>

                {disposalEvents.length === 0 ? (
                  <div className="p-12 text-center">
                    <Database size={32} className="text-text-muted/30 mx-auto mb-3" />
                    <p className="text-text-muted text-sm">No disposal events recorded yet.</p>
                    <p className="text-text-muted/60 text-xs mt-1">Events appear here when trash is disposed in the hardware bin.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface/50">
                          <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-text-muted tracking-wider">#</th>
                          <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-text-muted tracking-wider">Waste Type</th>
                          <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-text-muted tracking-wider">Fill %</th>
                          <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-text-muted tracking-wider">Temp</th>
                          <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-text-muted tracking-wider">Humidity</th>
                          <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-text-muted tracking-wider">Moisture</th>
                          <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-text-muted tracking-wider">Points</th>
                          <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-text-muted tracking-wider">Servo</th>
                          <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-text-muted tracking-wider">QR ID</th>
                          <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-text-muted tracking-wider">Time (s)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 🏆 FIXED: Persistent Hardware 'Fill 1' Status Row */}
                        {bins.filter(b => b.id === 'SHARED-BIN-01').map(hw => (
                          <tr key="hardware-status" className="bg-primary/5 border-b-2 border-primary/10">
                            <td className="px-4 py-3 text-primary font-black text-xs italic">Live</td>
                            <td className="px-4 py-3">
                              <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-primary text-white uppercase tracking-wider">Fill 1 (Hardware)</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${fillColor(hw.fillLevel)}`} style={{ width: `${hw.fillLevel}%` }} />
                                </div>
                                <span className={`text-xs font-black ${fillTextColor(hw.fillLevel)}`}>{hw.fillLevel}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-text font-bold">{hw.temperature !== null ? `${hw.temperature.toFixed(1)}°C` : '—'}</td>
                            <td className="px-4 py-3 text-xs text-text-muted">Avg</td>
                            <td className="px-4 py-3 text-xs text-text font-mono">{hw.moisture ?? '—'}</td>
                            <td className="px-4 py-3"><span className="text-xs font-bold text-text-muted">Hardware</span></td>
                            <td className="px-4 py-3 text-[10px] text-text-muted italic">{hw.latestUser || 'System'}</td>
                            <td className="px-4 py-3">
                              <span className="text-[10px] text-primary/60 flex items-center gap-1 font-bold animate-pulse"><Wifi size={10} /> Active</span>
                            </td>
                            <td className="px-4 py-3 text-[10px] text-text-muted font-mono">Real-time</td>
                          </tr>
                        ))}

                        {disposalEvents.map((evt, i) => {
                          const typeColor = evt.wasteType === 'Dry' ? 'bg-blue-50 text-blue-600' :
                            evt.wasteType === 'Wet' ? 'bg-green-50 text-green-600' :
                              evt.wasteType === 'Hazardous' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
                          return (
                            <motion.tr key={evt.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                              className="border-t border-black/5 hover:bg-surface/30 transition-colors">
                              <td className="px-4 py-3 text-text-muted font-mono text-xs">{i + 1}</td>
                              <td className="px-4 py-3">
                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${typeColor}`}>{evt.wasteType}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${fillColor(evt.fillPercent)}`} style={{ width: `${evt.fillPercent}%` }} />
                                  </div>
                                  <span className={`text-xs font-bold ${fillTextColor(evt.fillPercent)}`}>{evt.fillPercent}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-text">{evt.temperature !== null ? `${evt.temperature}°C` : '—'}</td>
                              <td className="px-4 py-3 text-xs text-text">{evt.humidity !== null ? `${evt.humidity}%` : '—'}</td>
                              <td className="px-4 py-3 text-xs text-text font-mono">{evt.moisture ?? '—'}</td>
                              <td className="px-4 py-3"><span className="text-xs font-bold text-primary">+{evt.pointsAwarded}</span></td>
                              <td className="px-4 py-3 text-xs text-text-muted font-mono">{evt.servoPosition ?? '—'}</td>
                              <td className="px-4 py-3">
                                {evt.qrId ? (
                                  <span className="text-xs font-mono bg-purple-50 text-purple-600 px-2 py-0.5 rounded">{evt.qrId}</span>
                                ) : (
                                  <span className="text-[10px] text-text-muted/40 flex items-center gap-1"><QrCode size={10} /> Pending</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-text-muted font-mono">{evt.timestamp ?? '—'}s</td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (

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
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8">
                    {bins.map((bin, i) => {
                      const fill = typeof bin.fillLevel === 'number' ? bin.fillLevel : parseInt(bin.fillLevel) || 0
                      const isCritical = bin.status === 'critical' || fill >= 80
                      return (
                        <motion.div
                          key={bin.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => setSelectedBin(bin)}
                          className="flex flex-col items-center group cursor-pointer"
                        >
                          {/* Visual Bin */}
                          <div className="relative mb-3">
                            <BinVisual fillLevel={fill} size={110} id={bin.id} />
                            {isCritical && (
                              <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm"
                              />
                            )}
                          </div>

                          {/* Text below bin */}
                          <h4 className="font-bold text-sm text-text group-hover:text-primary transition-colors line-clamp-1">{bin.name || bin.id}</h4>
                          <p className="text-[10px] text-text-muted uppercase font-bold tracking-tight">{bin.wasteType || 'General'}</p>

                          <div className={`mt-2 px-2 py-0.5 rounded text-[9px] font-black uppercase ${isCritical ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'
                            }`}>
                            {fill}% FULL
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}

                {/* Waste Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
                    <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Trash2 size={16} className="text-primary" /> Waste Distribution</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Dry Waste', val: `40%`, color: 'bg-blue-500' },
                        { label: 'Wet Waste', val: `35%`, color: 'bg-primary' },
                        { label: 'Hazardous', val: `25%`, color: 'bg-red-500' },
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
                  <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                      <Activity size={24} className="text-primary" />
                    </div>
                    <h4 className="font-bold text-sm text-text">System Monitoring</h4>
                    <p className="text-[11px] text-text-muted mt-1 px-4">All hardware nodes are currently synchronizing with Asia Southeast region.</p>
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
                      <div key={a.id || i} className={`p-4 rounded-xl border ${
                        a.category === 'temperature' ? 'bg-red-50 border-red-200' :
                        a.type === 'critical' ? 'bg-red-50 border-red-100' :
                        a.type === 'warning' ? 'bg-amber-50 border-amber-100' :
                        'bg-blue-50 border-blue-100'
                      }`}>
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="text-sm font-black text-text leading-tight">{a.category === 'temperature' ? '🔥 ' : ''}{a.message}</p>
                            <p className="text-[10px] text-text-muted mt-1.5 font-bold tracking-tight">{formatAlertTime(a.timestamp)}</p>
                          </div>
                          {a.category === 'temperature' && !a.resolved && (
                            <button 
                              onClick={() => {
                                resolveTemperatureAlert(a.id, 'crew_dispatched').then(() => {
                                  // Also reset the temperature in RTDB
                                  updateBinData(a.binId, { temperature: 31.5 })
                                  toast.success('Alert resolved and temperature normalized!', { icon: '✅' })
                                  fetchDashData() // Refresh alerts
                                })
                              }}
                              className="shrink-0 px-2 py-1.5 bg-red-600 text-white text-[9px] font-black rounded-lg hover:bg-red-700 transition-colors shadow-sm uppercase"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    )) : bins.filter(b => b.status === 'critical' || b.fillLevel >= 80).length === 0 && (
                      <p className="text-center text-text-muted text-sm py-4">✅ No active alerts</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ BIN DETAIL MODAL ═══ */}
        {selectedBin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-black/5">
              <div className="p-6 bg-surface border-b border-black/5 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-xl font-heading">{selectedBin.name || selectedBin.id}</h3>
                  <p className="text-xs text-text-muted flex items-center gap-1"><MapPin size={12} /> {selectedBin.location || 'Primary Site'}</p>
                </div>
                <button onClick={() => setSelectedBin(null)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors">
                  <LogOut size={18} className="rotate-180" />
                </button>
              </div>

              <div className="p-8 flex flex-col items-center">
                <BinVisual fillLevel={selectedBin.fillLevel} size={180} id={`modal-${selectedBin.id}`} />

                <div className="grid grid-cols-2 gap-4 w-full mt-8">
                  <div className="bg-surface p-4 rounded-2xl border border-black/5">
                    <div className="flex items-center gap-2 mb-1 text-text-muted"><Thermometer size={14} /> <span className="text-[10px] font-bold uppercase">Temperature</span></div>
                    <p className="text-xl font-black text-text">{selectedBin.temperature ?? '31.2'}°C</p>
                  </div>
                  <div className="bg-surface p-4 rounded-2xl border border-black/5">
                    <div className="flex items-center gap-2 mb-1 text-text-muted"><Droplets size={14} /> <span className="text-[10px] font-bold uppercase">Moisture</span></div>
                    <p className="text-xl font-black text-text">{selectedBin.moisture ?? '4095'}</p>
                  </div>
                  <div className="bg-surface p-4 rounded-2xl border border-black/5">
                    <div className="flex items-center gap-2 mb-1 text-text-muted"><Activity size={14} /> <span className="text-[10px] font-bold uppercase">Fill Level</span></div>
                    <p className={`text-xl font-black ${fillTextColor(selectedBin.fillLevel)}`}>{selectedBin.fillLevel}%</p>
                  </div>
                  <div className="bg-surface p-4 rounded-2xl border border-black/5">
                    <div className="flex items-center gap-2 mb-1 text-text-muted"><Database size={14} /> <span className="text-[10px] font-bold uppercase">Status</span></div>
                    <p className="text-sm font-black text-primary uppercase">{selectedBin.status || 'Online'}</p>
                  </div>
                </div>

                <div className="w-full mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <p className="text-[10px] font-bold text-primary uppercase mb-1">Hardware Diagnostics</p>
                  <p className="text-[11px] text-text-muted italic">Device reporting normal synchronization with Southeast Asia data center. Latency: 42ms.</p>
                </div>
              </div>

              <div className="p-4 bg-surface text-center">
                <button onClick={() => setSelectedBin(null)} className="text-xs font-bold text-text-muted hover:text-text uppercase tracking-widest">Close Dashboard</button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminDashboard
