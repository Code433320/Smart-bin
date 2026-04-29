import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Flame, Zap, Award, ArrowUpRight, History, Bell, ArrowLeft, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { getRewards, updateUserProfile, subscribeToBroadcasts, accumulatePoints, subscribeToFirestoreLeaderboard, getLeaderboard } from '../services/firestore'
import { subscribeToUserPoints, validateRtdbUser, subscribeToBinData, syncAllRtdbUsers } from '../services/rtdb'
import { Cpu, CheckCircle2, AlertCircle, X, Megaphone } from 'lucide-react'
import { toast } from 'react-hot-toast'

const UserDashboard = () => {
  const { currentUser, userProfile, logout, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [leaderboard, setLeaderboard] = useState([])
  const [recentLogs, setRecentLogs] = useState([])
  const [rewards, setRewards] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [liveRtdb, setLiveRtdb] = useState(null)
  const [linking, setLinking] = useState(false)
  const [linkName, setLinkName] = useState('')
  const [isLinkingOpen, setIsLinkingOpen] = useState(false)
  const [broadcasts, setBroadcasts] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [seenBroadcastCount, setSeenBroadcastCount] = useState(0)

  useEffect(() => {
    let unsubLb = () => {}
    // 1. Fetch rewards and sync users
    async function init() {
      try {
        await syncAllRtdbUsers() // Ensure Pramod and others are in Firestore
        const [rw, fsUsers] = await Promise.all([
          getRewards(),
          getLeaderboard(20)
        ])
        setRewards(rw)
        // 2. True leaderboard: Firestore persistent data
        unsubLb = subscribeToFirestoreLeaderboard(20, (data) => setLeaderboard(data))
      } catch (err) { console.error('Init error:', err) }
      setLoadingData(false)
    }
    init()

    // 3. Recent activity
    const unsubActivity = subscribeToBinData((data) => setRecentLogs(data.slice(0, 5)))

    // 4. Broadcast notifications
    let isFirstLoad = true
    const unsubBroadcast = subscribeToBroadcasts((data) => {
      setBroadcasts(data)
      if (!isFirstLoad && data.length > 0) {
        const latest = data[0]
        toast(latest.message, { id: `broadcast-${latest.id}`, icon: '📢', duration: 6000 })
      }
      isFirstLoad = false
    })

    return () => {
      unsubLb()
      unsubActivity()
      unsubBroadcast()
    }
  }, [])

  // ═══ POINTS PERSISTENCE ═══
  // savedPoints = accumulated total from ALL past sessions
  // points = savedPoints + current RTDB (always the TRUE total, used by leaderboard)
  // lastRtdbSnapshot = raw RTDB value (for drop detection)
  const lastPointsRef = useRef(null)

  useEffect(() => {
    const rtdbName = userProfile?.rtdbName
    if (!rtdbName || !currentUser) return

    // Initialize from Firestore's last known RTDB value
    const savedSnapshot = userProfile?.lastRtdbSnapshot ?? 0
    if (lastPointsRef.current === null) {
      lastPointsRef.current = savedSnapshot
    }

    const savedPoints = userProfile?.savedPoints || 0

    const unsub = subscribeToUserPoints(rtdbName, (data) => {
      setLiveRtdb(data)
      const currentRtdbPoints = data?.points || 0

      let newSavedPoints = savedPoints

      // DROP DETECTED: bin was emptied (either while online or offline)
      if (currentRtdbPoints < lastPointsRef.current && lastPointsRef.current > 0) {
        console.log(`Bin reset detected! Saving ${lastPointsRef.current} points.`)
        newSavedPoints = savedPoints + lastPointsRef.current
        toast.success(`+${lastPointsRef.current} pts saved to your permanent total!`, { icon: '💾' })
      }

      // Update tracking ref for next comparison
      lastPointsRef.current = currentRtdbPoints

      // True Persistent Total = Accumulated Past + Current Buffer
      const totalPoints = newSavedPoints + currentRtdbPoints
      
      updateUserProfile(currentUser.uid, {
        savedPoints: newSavedPoints,
        points: totalPoints,
        monthlyImpactKg: parseFloat((totalPoints * 0.15).toFixed(1)),
        lastRtdbSnapshot: currentRtdbPoints,
        lastFillPercent: data?.fillPercent || data?.fill_percent || 0,
        lastTemp: data?.temperature || null,
      }).then(() => {
        if (newSavedPoints !== savedPoints) refreshProfile()
      }).catch(console.error)
    })
    return () => unsub()
  }, [userProfile?.rtdbName, currentUser, userProfile?.savedPoints])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleLinkHardware = async (e) => {
    e.preventDefault()
    if (!linkName.trim()) return
    setLinking(true)
    try {
      const exists = await validateRtdbUser(linkName.trim())
      if (!exists) {
        toast.error(`Name "${linkName}" not found in hardware registry.`)
        setLinking(false)
        return
      }

      // Check for existing 'hw_...' profile with points to migrate
      const hwDocId = `hw_${linkName.trim().toLowerCase()}`
      const hwProfile = await getUserProfile(hwDocId)
      
      let pointsToMigrate = 0
      if (hwProfile && hwProfile.points > 0) {
        pointsToMigrate = hwProfile.points
        toast.info(`Migrating ${pointsToMigrate} points from your hardware history...`, { icon: '🚚' })
      }

      await updateUserProfile(currentUser.uid, { 
        rtdbName: linkName.trim(),
        savedPoints: (userProfile?.savedPoints || 0) + pointsToMigrate,
        points: (userProfile?.points || 0) + pointsToMigrate,
      })
      
      await refreshProfile()
      toast.success('Hardware linked and points synchronized!')
      setIsLinkingOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Failed to link hardware.')
    }
    setLinking(false)
  }

  const profile = userProfile || {}
  const displayName = profile.displayName || currentUser?.displayName || 'Citizen'
  
  // Points Logic:
  // 1. profile.savedPoints = points from all PREVIOUSLY emptied bin sessions
  // 2. currentSessionPoints = points from the current ACTIVE bin session in RTDB
  const currentSessionPoints = liveRtdb?.points ?? 0
  const points = (profile.savedPoints || 0) + currentSessionPoints
  
  const tier = profile.tier || 'BRONZE'
  const streak = profile.streak || 0
  
  // Impact: 1 point = 0.15kg
  const monthlyImpactKg = parseFloat((points * 0.15).toFixed(1))
  
  const monthlyGoalKg = 15 // Target one full bin (15kg) per month
  const impactPercent = Math.min(Math.round((monthlyImpactKg / monthlyGoalKg) * 100), 100)

  // Find current user rank in Firestore leaderboard
  const myRank = leaderboard.findIndex(u => u.id === currentUser?.uid || u.displayName === userProfile?.rtdbName)
  const rankDisplay = myRank >= 0 ? `#${myRank + 1}` : '--'

  const dotColors = { 'Wet Waste': 'bg-primary', 'Dry Waste': 'bg-blue-500', 'Hazardous': 'bg-red-500', 'Dry': 'bg-blue-500', 'Wet': 'bg-primary' }

  function formatLogDate(timestamp) {
    if (!timestamp) return 'Just now'
    // If timestamp is from device boot (relative), show relative time
    if (typeof timestamp === 'number' && timestamp < 1000000) return `${timestamp}s ago`
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-background text-text p-6 md:p-10">
      <header className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center hover:bg-surface-warm transition-colors">
            <ArrowLeft size={18} className="text-text-muted" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-heading">My Dashboard</h1>
            <p className="text-text-muted text-sm">Welcome back, <span className="text-primary font-semibold">{displayName}</span></p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <button onClick={() => { setShowNotifications(!showNotifications); setSeenBroadcastCount(broadcasts.length) }}
              className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center relative hover:bg-surface-warm transition-colors">
              <Bell size={18} className="text-text-muted" />
              {broadcasts.length > seenBroadcastCount && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-bounce">
                  {broadcasts.length - seenBroadcastCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-black/10 z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-black/5 flex justify-between items-center">
                    <h4 className="font-bold text-sm flex items-center gap-2"><Megaphone size={14} className="text-primary" /> Notifications</h4>
                    <button onClick={() => setShowNotifications(false)}><X size={16} className="text-text-muted" /></button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {broadcasts.length > 0 ? broadcasts.map((b, i) => (
                      <div key={b.id || i} className="p-4 border-b border-black/5 last:border-0 hover:bg-surface/50 transition-colors">
                        <p className="text-sm font-medium text-text">{b.message}</p>
                        <p className="text-[10px] text-text-muted mt-1">
                          {b.zone || 'All Zones'} · {b.timestamp?.toDate ? b.timestamp.toDate().toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : 'Just now'}
                        </p>
                      </div>
                    )) : (
                      <p className="p-6 text-center text-text-muted text-sm">No notifications yet</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="bg-surface flex items-center gap-3 px-4 py-2 rounded-xl">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-green-300" />
            <span className="font-semibold text-sm text-text">Rank {rankDisplay}</span>
          </div>
          <button onClick={handleLogout} className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors" title="Logout">
            <LogOut size={18} className="text-red-500" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Points Card & Rewards */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-primary text-white p-8 rounded-3xl relative overflow-hidden shadow-xl shadow-primary/15">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-10">
                <div className="bg-white/15 p-3 rounded-2xl"><Award size={28} className="text-white" /></div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Citizen Tier</span>
                  <p className="text-2xl font-heading font-black mt-0.5">{tier}</p>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-white/50 text-xs font-medium mb-1">Total Points</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-5xl font-heading font-black tracking-tight">{points.toLocaleString()}</h2>
                  <span className="text-white/60 font-bold text-sm">PTS</span>
                </div>
              </div>
              {/* Live RTDB indicator */}
              {liveRtdb && (
                <div className="mb-4 bg-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-[10px] text-white/70 font-bold uppercase tracking-wide">Live · {userProfile?.rtdbName}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 p-3 rounded-xl">
                  <p className="text-[10px] text-white/50 mb-1">Streak</p>
                  <div className="flex items-center gap-1.5"><Flame className="text-amber-300" size={14} /><span className="font-bold text-sm">{streak} Days</span></div>
                </div>
                <div className="bg-white/10 p-3 rounded-xl">
                  <p className="text-[10px] text-white/50 mb-1">Ranking</p>
                  <div className="flex items-center gap-1.5"><Trophy className="text-amber-300" size={14} /><span className="font-bold text-sm">{rankDisplay}</span></div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Link Hardware Prompt for existing users */}
          {!userProfile?.rtdbName && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="bg-white p-6 rounded-2xl border-2 border-dashed border-primary/20 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Cpu size={24} className="text-primary" />
              </div>
              <h4 className="font-bold text-sm mb-1">Connect your SmartBin</h4>
              <p className="text-xs text-text-muted mb-4">Link your hardware-registered name to see live points and sensor data.</p>
              
              {isLinkingOpen ? (
                <form onSubmit={handleLinkHardware} className="w-full space-y-3">
                  <input type="text" value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="e.g. Akshat"
                    className="w-full bg-surface border border-black/5 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" required />
                  <div className="flex gap-2">
                    <button type="submit" disabled={linking} className="flex-1 bg-primary text-white py-2 rounded-xl text-xs font-bold disabled:opacity-50">
                      {linking ? 'Linking...' : 'Confirm Link'}
                    </button>
                    <button type="button" onClick={() => setIsLinkingOpen(false)} className="px-4 py-2 bg-surface rounded-xl text-xs font-bold text-text-muted">Cancel</button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setIsLinkingOpen(true)} className="bg-primary text-white px-6 py-2 rounded-xl text-xs font-bold hover:shadow-lg transition-all">Link Now</button>
              )}
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-text"><Zap size={16} className="text-primary" /> Redeem Points</h3>
            <div className="space-y-2">
              {rewards.map((item, i) => (
                <div key={item.id || i} className="flex justify-between items-center p-3 rounded-xl hover:bg-surface transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{item.emoji || '🎁'}</span>
                    <span className="text-sm">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-muted">{(item.pointsCost || 0).toLocaleString()} pts</span>
                    <ArrowUpRight size={12} className="text-text-muted/40 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Leaderboard */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold font-heading">Citizen Leaderboard</h3>
              <span className="text-xs text-text-muted font-medium bg-surface px-3 py-1.5 rounded-lg">Live</span>
            </div>
            <div className="space-y-3">
              {leaderboard.map((user, i) => {
                const isMe = user.displayName === userProfile?.rtdbName || user.id === currentUser?.uid
                return (
                  <motion.div key={user.id} whileHover={{ x: 4 }}
                    className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${isMe ? 'bg-primary/10 border border-primary/20' : 'hover:bg-surface'}`}>
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${i < 3 ? 'bg-primary text-white' : 'bg-surface text-text-muted'}`}>{user.rank}</span>
                      <div>
                        <span className={`font-medium text-sm ${isMe ? 'text-primary' : 'text-text'}`}>{user.displayName || 'Citizen'}</span>
                        {isMe && <span className="ml-2 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">You</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm text-text">{(user.impactKg || 0)} kg</span>
                      <p className="text-[10px] text-text-muted font-medium">{(user.points || 0).toLocaleString()} pts</p>
                    </div>
                  </motion.div>
                )
              })}
              {leaderboard.length === 0 && <p className="text-center text-text-muted text-sm py-8">No leaderboard data yet. Start disposing waste to earn points!</p>}
            </div>
          </motion.div>
        </div>

        {/* Activity & Impact */}
        <div className="lg:col-span-3 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><History size={16} className="text-primary" /> Recent Activity</h3>
            <div className="space-y-5">
              {recentLogs.length > 0 ? recentLogs.map((log, i) => (
                <div key={log.id} className="flex gap-3 relative">
                  {i < recentLogs.length - 1 && <div className="absolute top-7 left-[9px] w-[1px] h-8 bg-black/5" />}
                  <div className={`w-[18px] h-[18px] rounded-full ${dotColors[log.wasteType] || 'bg-gray-400'}/15 flex items-center justify-center shrink-0 mt-0.5`}>
                    <div className={`w-2 h-2 rounded-full ${dotColors[log.wasteType] || 'bg-gray-400'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text">{log.wasteType || 'Waste Disposal'}</p>
                    <p className="text-[10px] text-text-muted">{formatLogDate(log.timestamp)}</p>
                  </div>
                  <span className="text-primary font-bold text-xs">+{log.pointsAwarded}</span>
                </div>
              )) : <p className="text-center text-text-muted text-sm py-4">No activity yet</p>}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm text-center">
            <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-2">Monthly Impact</p>
            <h4 className="text-2xl font-bold text-text">{monthlyImpactKg.toFixed(1)} kg <span className="text-primary">Saved</span></h4>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default UserDashboard
