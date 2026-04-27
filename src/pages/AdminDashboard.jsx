import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { LayoutDashboard, Users, MapPin, Settings, AlertTriangle, Send, Activity, Trash2, Cpu, ArrowLeft } from 'lucide-react'

const AdminDashboard = () => {
  return (
    <div className="relative min-h-screen bg-background text-text flex">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 border-r border-black/5 flex flex-col p-5 bg-white">
        <div className="flex items-center gap-3 mb-10">
          <Link to="/" className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0">
            <Trash2 className="text-white" size={20} />
          </Link>
          <span className="font-heading font-black text-base tracking-tight hidden md:block">SMARTBIN</span>
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { icon: LayoutDashboard, label: 'Overview', active: true },
            { icon: Users, label: 'User Analytics' },
            { icon: MapPin, label: 'Bin Network' },
            { icon: Cpu, label: 'System Health' },
            { icon: Settings, label: 'Configuration' },
          ].map((item, i) => (
            <button
              key={i}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${item.active ? 'bg-primary text-white shadow-md shadow-primary/15' : 'hover:bg-surface text-text-muted hover:text-text'}`}
            >
              <item.icon size={18} />
              <span className="font-semibold text-sm hidden md:block">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-5 border-t border-black/5">
          <div className="flex items-center gap-3 p-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-green-300" />
            <div className="hidden md:block">
              <p className="text-xs font-bold text-text">Admin L4</p>
              <p className="text-[10px] text-text-muted">Govt. Official</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="p-8 flex justify-between items-center border-b border-black/5 bg-white/50 backdrop-blur-sm">
          <div>
            <h2 className="text-2xl font-black font-heading">System Overview</h2>
            <p className="text-text-muted text-sm">Monitoring Sector 42 — Real-time</p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold">24 Bins Online</span>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 overflow-y-auto">
          {/* Top Metrics */}
          <div className="xl:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Citizens', val: '1,284', trend: '+12%', icon: Users },
              { label: 'Waste Processed', val: '2.4 Tons', trend: '+8%', icon: Trash2 },
              { label: 'Points Issued', val: '450K', trend: '+15%', icon: Activity },
              { label: 'Alerts', val: '02', trend: 'Severe', icon: AlertTriangle, critical: true },
            ].map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`bg-white p-6 rounded-2xl border shadow-sm ${m.critical ? 'border-red-200' : 'border-black/5'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2.5 rounded-xl ${m.critical ? 'bg-red-50' : 'bg-surface'}`}>
                    <m.icon size={18} className={m.critical ? 'text-red-500' : 'text-primary'} />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${m.critical ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}>
                    {m.trend}
                  </span>
                </div>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{m.label}</p>
                <h3 className="text-2xl font-heading font-black mt-1 text-text">{m.val}</h3>
              </motion.div>
            ))}
          </div>

          {/* Activity Chart + Breakdowns */}
          <div className="xl:col-span-8 space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm h-80">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-bold font-heading">Hourly Bin Activity</h3>
                <span className="text-xs text-text-muted font-medium">Last 24h</span>
              </div>
              <div className="flex items-end gap-1.5 h-48">
                {Array.from({ length: 24 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.random() * 100}%` }}
                    transition={{ duration: 1, delay: i * 0.04 }}
                    className="flex-1 bg-primary/15 rounded-t-md relative group cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-primary scale-y-0 group-hover:scale-y-100 origin-bottom transition-transform duration-200 rounded-t-md" />
                  </motion.div>
                ))}
              </div>
              <div className="flex justify-between mt-3 text-[10px] font-medium text-text-muted">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>Now</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-primary" /> Accuracy
                </h3>
                <div className="flex items-center justify-center h-36 relative">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 128 128">
                    <circle cx="64" cy="64" r="52" fill="transparent" stroke="#F5F0EA" strokeWidth="10" />
                    <circle cx="64" cy="64" r="52" fill="transparent" stroke="#1F7A63" strokeWidth="10"
                      strokeDasharray="326.7" strokeDashoffset="5.2" strokeLinecap="round" />
                  </svg>
                  <div className="absolute text-center">
                    <p className="text-xl font-black text-text">98.4%</p>
                    <p className="text-[9px] text-text-muted font-bold">ACCURACY</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                  <Trash2 size={16} className="text-primary" /> Distribution
                </h3>
                <div className="space-y-4 mt-4">
                  {[
                    { label: 'Dry Waste', val: '45%', color: 'bg-blue-500' },
                    { label: 'Wet Waste', val: '35%', color: 'bg-primary' },
                    { label: 'Hazardous', val: '20%', color: 'bg-red-500' },
                  ].map((w, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-text-muted">{w.label}</span>
                        <span className="font-bold text-text">{w.val}</span>
                      </div>
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: w.val }}
                          transition={{ duration: 1, delay: 0.5 + i * 0.2 }}
                          className={`h-full ${w.color} rounded-full`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Broadcast + Alerts */}
          <div className="xl:col-span-4 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm"
            >
              <h3 className="text-base font-bold font-heading mb-2">Broadcast</h3>
              <p className="text-xs text-text-muted mb-4">Send behavior feedback to citizens in this zone.</p>
              <textarea
                className="w-full bg-surface border-none rounded-xl p-4 text-sm focus:ring-1 focus:ring-primary outline-none mb-4 min-h-[100px] resize-none placeholder:text-text-muted/50"
                placeholder="Great job segregating wet waste this week! Maintain your streak for a 50pt bonus."
              />
              <button className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
                <Send size={16} /> Send to Zone A
              </button>
            </motion.div>

            <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-red-600">
                <AlertTriangle size={16} /> Active Alerts
              </h3>
              <div className="space-y-3">
                {[
                  { msg: 'Bin #42-A fill level > 90%', time: '2m ago', type: 'critical' },
                  { msg: 'Sensor offline: Bin #12-C', time: '15m ago', type: 'warning' },
                  { msg: 'Unusual activity: Bin #07-B', time: '1h ago', type: 'info' },
                ].map((a, i) => (
                  <div key={i} className={`p-3 rounded-xl ${
                    a.type === 'critical' ? 'bg-red-50 border border-red-100' :
                    a.type === 'warning' ? 'bg-amber-50 border border-amber-100' :
                    'bg-blue-50 border border-blue-100'
                  }`}>
                    <p className="text-sm font-semibold text-text">{a.msg}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{a.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
