import React from 'react'
import { motion } from 'framer-motion'
import { Trophy, Flame, Zap, Award, ArrowUpRight, History, Bell, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

const UserDashboard = () => {
  return (
    <div className="relative min-h-screen bg-background text-text p-6 md:p-10">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center hover:bg-surface-warm transition-colors">
            <ArrowLeft size={18} className="text-text-muted" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-heading">My Dashboard</h1>
            <p className="text-text-muted text-sm">Welcome back, <span className="text-primary font-semibold">Arjun Sharma</span></p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center relative hover:bg-surface-warm transition-colors">
            <Bell size={18} className="text-text-muted" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full"></span>
          </button>
          <div className="bg-surface flex items-center gap-3 px-4 py-2 rounded-xl">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-green-300" />
            <span className="font-semibold text-sm text-text">Rank #12</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Points Card & Rewards */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary text-white p-8 rounded-3xl relative overflow-hidden shadow-xl shadow-primary/15"
          >
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-10">
                <div className="bg-white/15 p-3 rounded-2xl">
                  <Award size={28} className="text-white" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Citizen Tier</span>
                  <p className="text-2xl font-heading font-black mt-0.5">GOLD</p>
                </div>
              </div>

              <div className="mb-8">
                <p className="text-white/50 text-xs font-medium mb-1">Total Points</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-5xl font-heading font-black tracking-tight">12,450</h2>
                  <span className="text-white/60 font-bold text-sm">PTS</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 p-3 rounded-xl">
                  <p className="text-[10px] text-white/50 mb-1">Streak</p>
                  <div className="flex items-center gap-1.5">
                    <Flame className="text-amber-300" size={14} />
                    <span className="font-bold text-sm">5 Days</span>
                  </div>
                </div>
                <div className="bg-white/10 p-3 rounded-xl">
                  <p className="text-[10px] text-white/50 mb-1">Ranking</p>
                  <div className="flex items-center gap-1.5">
                    <Trophy className="text-amber-300" size={14} />
                    <span className="font-bold text-sm">Top 5%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm"
          >
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-text">
              <Zap size={16} className="text-primary" /> Redeem Points
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Electricity Bill Reduction', pts: '2,500', color: 'bg-blue-500' },
                { label: 'Public Transit Pass', pts: '1,200', color: 'bg-primary' },
                { label: 'Traffic Challan Waiver', pts: '5,000', color: 'bg-red-500' },
                { label: 'Govt. Store Voucher', pts: '800', color: 'bg-amber-500' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-xl hover:bg-surface transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-muted">{item.pts} pts</span>
                    <ArrowUpRight size={12} className="text-text-muted/40 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Middle Column: Leaderboard */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold font-heading">Citizen Leaderboard</h3>
              <select className="bg-surface border-none text-xs font-semibold text-text-muted rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-primary">
                <option>Local Area</option>
                <option>City-wide</option>
              </select>
            </div>

            <div className="space-y-3">
              {[
                { name: 'Priya Verma', points: '14,200', rank: 1, me: false },
                { name: 'Arjun Sharma', points: '12,450', rank: 2, me: true },
                { name: 'Rahul Singh', points: '11,800', rank: 3, me: false },
                { name: 'Ananya Rao', points: '9,400', rank: 4, me: false },
                { name: 'Sameer Khan', points: '8,900', rank: 5, me: false },
                { name: 'Meera Joshi', points: '7,300', rank: 6, me: false },
              ].map((user, i) => (
                <motion.div
                  key={i}
                  whileHover={{ x: 4 }}
                  className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${user.me ? 'bg-primary/10 border border-primary/20' : 'hover:bg-surface'}`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${i < 3 ? 'bg-primary text-white' : 'bg-surface text-text-muted'}`}>
                      {user.rank}
                    </span>
                    <div>
                      <span className={`font-medium text-sm ${user.me ? 'text-primary' : 'text-text'}`}>{user.name}</span>
                      {user.me && <span className="ml-2 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">You</span>}
                    </div>
                  </div>
                  <span className="font-bold text-sm text-text-muted">{user.points}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column: Activity & Impact */}
        <div className="lg:col-span-3 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm"
          >
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <History size={16} className="text-primary" /> Recent Activity
            </h3>
            <div className="space-y-5">
              {[
                { type: 'Wet Waste', date: 'Today, 10:30 AM', pts: '+20', dot: 'bg-primary' },
                { type: 'Dry Waste', date: 'Yesterday, 6:15 PM', pts: '+10', dot: 'bg-blue-500' },
                { type: 'Hazardous', date: '24 Apr, 2:00 PM', pts: '+30', dot: 'bg-red-500' },
                { type: 'Dry Waste', date: '23 Apr, 9:00 AM', pts: '+10', dot: 'bg-blue-500' },
              ].map((log, i) => (
                <div key={i} className="flex gap-3 relative">
                  {i < 3 && <div className="absolute top-7 left-[9px] w-[1px] h-8 bg-black/5" />}
                  <div className={`w-[18px] h-[18px] rounded-full ${log.dot}/15 flex items-center justify-center shrink-0 mt-0.5`}>
                    <div className={`w-2 h-2 rounded-full ${log.dot}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text">{log.type}</p>
                    <p className="text-[10px] text-text-muted">{log.date}</p>
                  </div>
                  <span className="text-primary font-bold text-xs">{log.pts}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm text-center"
          >
            <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-2">Monthly Impact</p>
            <h4 className="text-2xl font-bold text-text">2.4 kg <span className="text-primary">Saved</span></h4>
            <div className="mt-4 h-2 bg-surface rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '65%' }}
                transition={{ duration: 1.2, delay: 0.8 }}
                className="h-full bg-primary rounded-full"
              />
            </div>
            <p className="text-[10px] text-text-muted mt-2">65% of monthly goal reached</p>
          </motion.div>

          <div className="bg-surface p-5 rounded-2xl text-center">
            <p className="text-xs text-text-muted mb-1">Govt. Notifications</p>
            <p className="text-sm font-medium text-text leading-relaxed">
              "Great segregation this week! Keep your streak going for a <span className="text-primary font-bold">50pt bonus</span>."
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserDashboard
