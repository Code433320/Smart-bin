import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Flame, Zap, Award, ArrowUpRight, History, Bell, ArrowLeft, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { getLeaderboard, getUserWasteLogs, getRewards } from '../services/firestore'

const UserDashboard = () => {
  const { currentUser, userProfile, logout, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [leaderboard, setLeaderboard] = useState([])
  const [recentLogs, setRecentLogs] = useState([])
  const [rewards, setRewards] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [lb, logs, rw] = await Promise.all([
          getLeaderboard(6),
          currentUser ? getUserWasteLogs(currentUser.uid, 4) : [],
          getRewards(),
        ])
        setLeaderboard(lb)
        setRecentLogs(logs)
        setRewards(rw)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      }
      setLoadingData(false)
    }
    fetchData()
  }, [currentUser])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const profile = userProfile || {}
  const displayName = profile.displayName || currentUser?.displayName || 'Citizen'
  const points = profile.points || 0
  const tier = profile.tier || 'BRONZE'
  const streak = profile.streak || 0
  const monthlyImpactKg = profile.monthlyImpactKg || 0
  const monthlyGoalKg = profile.monthlyGoalKg || 5
  const impactPercent = Math.min(Math.round((monthlyImpactKg / monthlyGoalKg) * 100), 100)

  // Find current user rank in leaderboard
  const myRank = leaderboard.findIndex(u => u.id === currentUser?.uid)
  const rankDisplay = myRank >= 0 ? `#${myRank + 1}` : '--'

  const dotColors = { 'Wet Waste': 'bg-primary', 'Dry Waste': 'bg-blue-500', 'Hazardous': 'bg-red-500' }

  function formatLogDate(timestamp) {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diff = now - date
    if (diff < 86400000) return `Today, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
    if (diff < 172800000) return `Yesterday, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + `, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
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
          <button className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center relative hover:bg-surface-warm transition-colors">
            <Bell size={18} className="text-text-muted" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full"></span>
          </button>
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
              <div className="mb-8">
                <p className="text-white/50 text-xs font-medium mb-1">Total Points</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-5xl font-heading font-black tracking-tight">{points.toLocaleString()}</h2>
                  <span className="text-white/60 font-bold text-sm">PTS</span>
                </div>
              </div>
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
                const isMe = user.id === currentUser?.uid
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
                    <span className="font-bold text-sm text-text-muted">{(user.points || 0).toLocaleString()}</span>
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
                    <p className="text-sm font-semibold text-text">{log.wasteType}</p>
                    <p className="text-[10px] text-text-muted">{formatLogDate(log.timestamp)}</p>
                  </div>
                  <span className="text-primary font-bold text-xs">+{log.pointsEarned}</span>
                </div>
              )) : <p className="text-center text-text-muted text-sm py-4">No activity yet</p>}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm text-center">
            <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-2">Monthly Impact</p>
            <h4 className="text-2xl font-bold text-text">{monthlyImpactKg.toFixed(1)} kg <span className="text-primary">Saved</span></h4>
            <div className="mt-4 h-2 bg-surface rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${impactPercent}%` }} transition={{ duration: 1.2, delay: 0.8 }} className="h-full bg-primary rounded-full" />
            </div>
            <p className="text-[10px] text-text-muted mt-2">{impactPercent}% of monthly goal reached</p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default UserDashboard
