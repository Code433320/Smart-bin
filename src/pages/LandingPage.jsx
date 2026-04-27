import React, { Suspense } from 'react'
import { Link } from 'react-router'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera, Environment, Float, ContactShadows } from '@react-three/drei'
import { motion } from 'framer-motion'
import SmartBinModel from '../components/canvas/SmartBinModel'
import { ArrowRight, Recycle, ShieldCheck, Zap, BarChart3, Leaf, Wifi, Award, ChevronDown, Cpu, Users, TrendingUp } from 'lucide-react'

const LandingPage = () => {
  return (
    <div className="w-full bg-background">
      {/* ========== NAVIGATION ========== */}
      <nav className="fixed top-0 left-0 w-full px-8 py-4 flex justify-between items-center z-50 bg-background/80 backdrop-blur-xl border-b border-black/5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <Recycle className="text-white" size={18} />
          </div>
          <span className="font-heading font-bold text-lg tracking-tight">SMARTBIN</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-muted">
          <a href="#how-it-works" className="hover:text-text transition-colors">How It Works</a>
          <a href="#impact" className="hover:text-text transition-colors">Impact</a>
          <a href="#rewards" className="hover:text-text transition-colors">Rewards</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-sm font-medium text-text-muted hover:text-text transition-colors hidden md:block">Admin</Link>
          <Link to="/dashboard" className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-primary-dark transition-all group shadow-lg shadow-primary/20">
            Get Started <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </nav>

      {/* ========== HERO SECTION ========== */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Animated gradient blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-amber-200/20 rounded-full blur-3xl animate-blob animation-delay-4000" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          {/* Left: Text Content */}
          <div className="max-w-xl">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
                <Leaf size={14} />
                Smart Waste Management
              </div>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading font-extrabold leading-[1.05] mb-6 animate-fade-in-up-delay-1">
              Waste Disposal,<br />
              <span className="text-primary">Reimagined.</span>
            </h1>

            <p className="text-lg text-text-muted mb-8 leading-relaxed animate-fade-in-up-delay-2 max-w-md">
              RFID identification, AI-powered classification, and government-backed rewards — all in one smart device.
            </p>

            <div className="flex flex-wrap gap-4 animate-fade-in-up-delay-3">
              <Link to="/dashboard" className="bg-primary text-white px-8 py-4 rounded-full font-semibold hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 transition-all">
                Start Earning Points
              </Link>
              <a href="#how-it-works" className="bg-white text-text px-8 py-4 rounded-full font-semibold hover:shadow-lg transition-all border border-black/5">
                See How It Works
              </a>
            </div>

            {/* Mini Stats */}
            <div className="flex gap-8 mt-12 animate-fade-in-up-delay-3">
              {[
                { val: '1,200+', label: 'Active Citizens' },
                { val: '2.4T', label: 'Waste Processed' },
                { val: '98.4%', label: 'Accuracy' },
              ].map((s, i) => (
                <div key={i}>
                  <p className="text-2xl font-heading font-black text-text">{s.val}</p>
                  <p className="text-xs text-text-muted font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: 3D Model */}
          <div className="relative h-[500px] lg:h-[600px] animate-fade-in-up-delay-2">
            {/* Glow behind the model */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 bg-primary/15 rounded-full blur-[80px]" />
            </div>

            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-32 h-32 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            }>
              <Canvas
                className="w-full h-full"
                gl={{ antialias: true, alpha: true }}
                style={{ background: 'transparent' }}
              >
                <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={45} />
                <ambientLight intensity={0.9} color="#FFF8F0" />
                <directionalLight position={[5, 8, 5]} intensity={1.5} color="#FFF5E8" castShadow />
                <pointLight position={[-5, -2, -5]} intensity={0.4} color="#1F7A63" />
                <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.5}>
                  <SmartBinModel scrollProgress={0} />
                </Float>
                <ContactShadows position={[0, -1.5, 0]} opacity={0.15} scale={10} blur={3} far={4.5} color="#8A847C" />
                <Environment preset="apartment" />
              </Canvas>
            </Suspense>

            {/* Floating labels around the model */}
            <div className="absolute top-16 right-8 bg-white px-4 py-2 rounded-xl shadow-lg border border-black/5 animate-float text-sm font-semibold flex items-center gap-2">
              <Wifi size={14} className="text-primary" /> IoT Connected
            </div>
            <div className="absolute bottom-24 left-4 bg-white px-4 py-2 rounded-xl shadow-lg border border-black/5 animate-float animation-delay-2000 text-sm font-semibold flex items-center gap-2">
              <Cpu size={14} className="text-primary" /> ESP32 Powered
            </div>
            <div className="absolute top-1/2 right-0 bg-primary text-white px-4 py-2 rounded-xl shadow-lg animate-float animation-delay-4000 text-sm font-bold flex items-center gap-2">
              <Award size={14} /> +20 pts
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-xs font-medium text-text-muted">Scroll to explore</span>
          <ChevronDown size={20} className="text-text-muted" />
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className="py-32 px-6 md:px-12 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-4 block">How It Works</span>
            <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-4">
              Four Steps to a<br />Cleaner Future
            </h2>
            <p className="text-text-muted max-w-lg mx-auto">
              From RFID tap to reward redemption — a seamless closed loop of accountability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: ShieldCheck,
                step: '01',
                title: 'Tap & Identify',
                desc: 'Tap your RFID card. The system identifies you instantly and opens a disposal session.',
                color: 'bg-primary',
              },
              {
                icon: Zap,
                step: '02',
                title: 'Smart Classification',
                desc: 'Moisture, temperature, and ultrasonic sensors automatically classify waste type.',
                color: 'bg-blue-600',
              },
              {
                icon: BarChart3,
                step: '03',
                title: 'Earn Points',
                desc: 'Get government-backed reward points for every correct disposal. Streaks earn bonuses.',
                color: 'bg-amber-500',
              },
              {
                icon: Award,
                step: '04',
                title: 'Redeem Benefits',
                desc: 'Use points to reduce electricity bills, waive traffic fines, or claim govt vouchers.',
                color: 'bg-red-500',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <item.icon size={22} className="text-white" />
                </div>
                <span className="text-xs font-bold text-text-muted tracking-widest">STEP {item.step}</span>
                <h3 className="text-xl font-bold mt-2 mb-3">{item.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== IMPACT SECTION ========== */}
      <section id="impact" className="py-32 px-6 md:px-12 bg-primary relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-10 right-10 w-96 h-96 border border-white/10 rounded-full" />
        <div className="absolute bottom-10 left-10 w-64 h-64 border border-white/10 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-white/60 uppercase tracking-[0.2em] mb-4 block">Real Impact</span>
            <h2 className="text-4xl md:text-5xl font-heading font-extrabold text-white mb-4">
              Numbers That Matter
            </h2>
            <p className="text-white/60 max-w-lg mx-auto">
              SmartBin isn't just technology — it's measurable change in communities.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { val: '2.4', unit: 'Tons', label: 'Waste Processed Monthly', icon: TrendingUp },
              { val: '1,284', unit: '', label: 'Active Citizens', icon: Users },
              { val: '450K', unit: 'pts', label: 'Rewards Distributed', icon: Award },
              { val: '98.4', unit: '%', label: 'Classification Accuracy', icon: Cpu },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-white/10 backdrop-blur-sm border border-white/10 p-8 rounded-3xl text-center hover:bg-white/15 transition-colors"
              >
                <stat.icon size={28} className="text-accent mx-auto mb-4" />
                <p className="text-4xl md:text-5xl font-heading font-black text-white">
                  {stat.val}<span className="text-xl text-white/60">{stat.unit}</span>
                </p>
                <p className="text-sm text-white/50 font-medium mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== REWARDS SECTION ========== */}
      <section id="rewards" className="py-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-4 block">Govt-Backed Rewards</span>
              <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-6">
                Your Points,<br />Real Benefits.
              </h2>
              <p className="text-text-muted mb-10 text-lg leading-relaxed max-w-md">
                Every point you earn is backed by the government. Redeem them for tangible benefits that save you real money.
              </p>
              <Link to="/dashboard" className="inline-flex bg-primary text-white px-8 py-4 rounded-full font-semibold hover:shadow-xl hover:shadow-primary/25 transition-all group">
                View Your Dashboard <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="space-y-4">
              {[
                { title: 'Electricity Bill Reduction', pts: '2,500 pts', desc: 'Get up to ₹500 off your monthly electricity bill', emoji: '⚡' },
                { title: 'Traffic Challan Waiver', pts: '5,000 pts', desc: 'Redeem to waive a pending traffic fine', emoji: '🚗' },
                { title: 'Public Transit Pass', pts: '1,200 pts', desc: 'Free monthly bus/metro pass for your city', emoji: '🚌' },
                { title: 'Government Store Voucher', pts: '800 pts', desc: 'Redeemable at fair price shops and govt stores', emoji: '🏪' },
              ].map((reward, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-start gap-5 group cursor-pointer"
                >
                  <div className="text-3xl shrink-0">{reward.emoji}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold">{reward.title}</h3>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full shrink-0">{reward.pts}</span>
                    </div>
                    <p className="text-sm text-text-muted mt-1">{reward.desc}</p>
                  </div>
                  <ArrowRight size={16} className="text-text-muted/30 group-hover:text-primary transition-colors mt-1 shrink-0" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="py-20 px-6 md:px-12">
        <div className="max-w-4xl mx-auto bg-primary p-16 md:p-20 rounded-[3rem] text-center relative overflow-hidden shadow-2xl shadow-primary/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-heading font-extrabold text-white mb-6">
              Be the Change Your<br />City Needs.
            </h2>
            <p className="text-white/60 mb-10 text-lg max-w-md mx-auto">
              Join thousands of responsible citizens already earning rewards through smarter waste disposal.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/dashboard" className="bg-white text-primary px-10 py-4 rounded-full font-bold text-lg hover:shadow-xl transition-all group">
                Start Earning Points <ArrowRight size={20} className="inline ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/admin" className="border-2 border-white/30 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-all">
                Admin Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="py-12 px-8 border-t border-black/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <Recycle className="text-white" size={14} />
            </div>
            <span className="font-heading font-bold text-sm">SMARTBIN</span>
          </div>
          <p className="text-text-muted text-sm">© 2026 SmartBin · Built with 💚 for a cleaner tomorrow.</p>
          <div className="flex gap-6 text-sm text-text-muted">
            <Link to="/dashboard" className="hover:text-text transition-colors">Dashboard</Link>
            <Link to="/admin" className="hover:text-text transition-colors">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
