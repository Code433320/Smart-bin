import { doc, setDoc, addDoc, collection, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../firebase/config'

/**
 * Seeds Firestore with demo data for the SmartBin hackathon.
 * Call this once from the admin dashboard or browser console.
 */
export async function seedDatabase() {
  console.log('🌱 Seeding SmartBin database...')

  // ── Check if already seeded ──
  const binsSnap = await getDocs(collection(db, 'bins'))
  if (binsSnap.size > 0) {
    console.log('⚠️ Database already has data. Skipping seed.')
    return false
  }

  // ── Demo Users ──
  const demoUsers = [
    { id: 'demo-user-1', email: 'priya.verma@smartbin.in', displayName: 'Priya Verma', role: 'user', isDemo: true, points: 14200, tier: 'GOLD', streak: 12, totalDisposals: 89, monthlyImpactKg: 3.2, monthlyGoalKg: 5 },
    { id: 'demo-user-2', email: 'rahul.singh@smartbin.in', displayName: 'Rahul Singh', role: 'user', isDemo: true, points: 11800, tier: 'GOLD', streak: 7, totalDisposals: 72, monthlyImpactKg: 2.8, monthlyGoalKg: 5 },
    { id: 'demo-user-3', email: 'ananya.rao@smartbin.in', displayName: 'Ananya Rao', role: 'user', isDemo: true, points: 9400, tier: 'SILVER', streak: 4, totalDisposals: 58, monthlyImpactKg: 2.1, monthlyGoalKg: 5 },
    { id: 'demo-user-4', email: 'sameer.khan@smartbin.in', displayName: 'Sameer Khan', role: 'user', isDemo: true, points: 8900, tier: 'SILVER', streak: 3, totalDisposals: 54, monthlyImpactKg: 1.9, monthlyGoalKg: 5 },
    { id: 'demo-user-5', email: 'meera.joshi@smartbin.in', displayName: 'Meera Joshi', role: 'user', isDemo: true, points: 7300, tier: 'SILVER', streak: 2, totalDisposals: 41, monthlyImpactKg: 1.5, monthlyGoalKg: 5 },
    { id: 'demo-user-6', email: 'vikram.patel@smartbin.in', displayName: 'Vikram Patel', role: 'user', isDemo: true, points: 6100, tier: 'SILVER', streak: 1, totalDisposals: 35, monthlyImpactKg: 1.2, monthlyGoalKg: 5 },
  ]

  for (const user of demoUsers) {
    const { id, ...data } = user
    await setDoc(doc(db, 'users', id), {
      ...data,
      photoURL: null,
      rank: 0,
      createdAt: serverTimestamp(),
    })
  }
  console.log('✅ Users seeded')

  // ── Bins ──
  const bins = [
    { binId: 'BIN-42A', location: 'Sector 42, Block A', sector: 'Sector 42', fillLevel: 92, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-42B', location: 'Sector 42, Block B', sector: 'Sector 42', fillLevel: 45, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-12C', location: 'Sector 12, Block C', sector: 'Sector 12', fillLevel: 30, status: 'offline', sensorHealth: 'fault' },
    { binId: 'BIN-07B', location: 'Sector 7, Block B', sector: 'Sector 7', fillLevel: 67, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-21A', location: 'Sector 21, Block A', sector: 'Sector 21', fillLevel: 15, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-21B', location: 'Sector 21, Block B', sector: 'Sector 21', fillLevel: 55, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-33A', location: 'Sector 33, Block A', sector: 'Sector 33', fillLevel: 78, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-33B', location: 'Sector 33, Block B', sector: 'Sector 33', fillLevel: 20, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-05A', location: 'Sector 5, Block A', sector: 'Sector 5', fillLevel: 88, status: 'online', sensorHealth: 'warning' },
    { binId: 'BIN-05B', location: 'Sector 5, Block B', sector: 'Sector 5', fillLevel: 10, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-18A', location: 'Sector 18, Block A', sector: 'Sector 18', fillLevel: 42, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-18B', location: 'Sector 18, Block B', sector: 'Sector 18', fillLevel: 63, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-44A', location: 'Sector 44, Block A', sector: 'Sector 44', fillLevel: 51, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-44B', location: 'Sector 44, Block B', sector: 'Sector 44', fillLevel: 37, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-09A', location: 'Sector 9, Block A', sector: 'Sector 9', fillLevel: 71, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-09B', location: 'Sector 9, Block B', sector: 'Sector 9', fillLevel: 25, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-27A', location: 'Sector 27, Block A', sector: 'Sector 27', fillLevel: 60, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-27B', location: 'Sector 27, Block B', sector: 'Sector 27', fillLevel: 33, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-15A', location: 'Sector 15, Block A', sector: 'Sector 15', fillLevel: 84, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-15B', location: 'Sector 15, Block B', sector: 'Sector 15', fillLevel: 19, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-38A', location: 'Sector 38, Block A', sector: 'Sector 38', fillLevel: 47, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-38B', location: 'Sector 38, Block B', sector: 'Sector 38', fillLevel: 73, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-02A', location: 'Sector 2, Block A', sector: 'Sector 2', fillLevel: 56, status: 'online', sensorHealth: 'good' },
    { binId: 'BIN-02B', location: 'Sector 2, Block B', sector: 'Sector 2', fillLevel: 29, status: 'online', sensorHealth: 'good' },
  ]

  for (const bin of bins) {
    await setDoc(doc(db, 'bins', bin.binId), {
      ...bin,
      lastUpdated: serverTimestamp(),
    })
  }
  console.log('✅ Bins seeded (24 bins)')

  // ── Rewards ──
  const rewards = [
    { title: 'Electricity Bill Reduction', pointsCost: 2500, description: 'Get up to ₹500 off your monthly electricity bill', category: 'utilities', emoji: '⚡', color: 'bg-blue-500' },
    { title: 'Public Transit Pass', pointsCost: 1200, description: 'Free monthly bus/metro pass for your city', category: 'transport', emoji: '🚌', color: 'bg-primary' },
    { title: 'Traffic Challan Waiver', pointsCost: 5000, description: 'Redeem to waive a pending traffic fine', category: 'transport', emoji: '🚗', color: 'bg-red-500' },
    { title: 'Govt. Store Voucher', pointsCost: 800, description: 'Redeemable at fair price shops and govt stores', category: 'shopping', emoji: '🏪', color: 'bg-amber-500' },
  ]

  for (const reward of rewards) {
    await addDoc(collection(db, 'rewards'), reward)
  }
  console.log('✅ Rewards seeded')

  // ── Alerts ──
  const alerts = [
    { message: 'Bin #42-A fill level > 90%', type: 'critical', binId: 'BIN-42A', resolved: false, timestamp: serverTimestamp() },
    { message: 'Sensor offline: Bin #12-C', type: 'warning', binId: 'BIN-12C', resolved: false, timestamp: serverTimestamp() },
    { message: 'Unusual activity: Bin #07-B', type: 'info', binId: 'BIN-07B', resolved: false, timestamp: serverTimestamp() },
  ]

  for (const alert of alerts) {
    await addDoc(collection(db, 'alerts'), alert)
  }
  console.log('✅ Alerts seeded')

  // ── Sample Waste Logs ──
  const wasteTypes = ['Wet Waste', 'Dry Waste', 'Hazardous', 'Dry Waste', 'Wet Waste']
  const binIds = ['BIN-42A', 'BIN-42B', 'BIN-07B', 'BIN-21A', 'BIN-33A']
  const userIds = demoUsers.map(u => u.id)

  for (let i = 0; i < 30; i++) {
    const userId = userIds[i % userIds.length]
    const wasteType = wasteTypes[i % wasteTypes.length]
    const binId = binIds[i % binIds.length]
    const pointsEarned = wasteType === 'Wet Waste' ? 20 : wasteType === 'Hazardous' ? 30 : 10

    await addDoc(collection(db, 'wasteLogs'), {
      userId,
      binId,
      wasteType,
      pointsEarned,
      correct: true,
      timestamp: Timestamp.fromDate(new Date(Date.now() - i * 3600000)), // stagger by hours
    })
  }
  console.log('✅ Waste logs seeded (30 entries)')

  console.log('🎉 Database seeding complete!')
  return true
}

/**
 * Retroactively patches existing demo users to add isDemo: true.
 * Run this once if demo users were already seeded without the flag.
 */
export async function patchDemoUsers() {
  const demoIds = ['demo-user-1','demo-user-2','demo-user-3','demo-user-4','demo-user-5','demo-user-6']
  const { doc, updateDoc } = await import('firebase/firestore')
  const { db } = await import('../firebase/config')
  for (const id of demoIds) {
    try {
      await updateDoc(doc(db, 'users', id), { isDemo: true })
    } catch (e) { /* doc may not exist */ }
  }
  console.log('✅ Demo users patched with isDemo: true')
  return true
}
