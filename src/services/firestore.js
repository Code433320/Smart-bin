import {
  doc, getDoc, setDoc, updateDoc, addDoc,
  collection, query, where, orderBy, limit as firestoreLimit,
  getDocs, serverTimestamp, increment, Timestamp,
  onSnapshot
} from 'firebase/firestore'
import { db } from '../firebase/config'

// ═══════════════════════════════════════════
// USER PROFILES
// ═══════════════════════════════════════════

export async function createUserProfile(uid, data) {
  const userRef = doc(db, 'users', uid)
  const existing = await getDoc(userRef)
  if (!existing.exists()) {
    // Brand new user — write full profile
    await setDoc(userRef, {
      email: data.email,
      displayName: data.displayName || data.email.split('@')[0],
      role: data.role || 'user',
      points: 0,
      tier: 'BRONZE',
      streak: 0,
      rank: 0,
      monthlyImpactKg: 0,
      monthlyGoalKg: 5,
      totalDisposals: 0,
      photoURL: data.photoURL || null,
      createdAt: serverTimestamp(),
      // Merge any extra fields (e.g. rtdbName)
      ...Object.fromEntries(
        Object.entries(data).filter(([k]) =>
          !['email','displayName','role','photoURL'].includes(k)
        )
      ),
    })
  } else {
    // Existing user — only merge fields that are explicitly passed and not already set
    const current = existing.data()
    const updates = {}
    if (data.rtdbName && !current.rtdbName) updates.rtdbName = data.rtdbName
    if (data.photoURL && !current.photoURL) updates.photoURL = data.photoURL
    if (Object.keys(updates).length > 0) await updateDoc(userRef, updates)
  }
  return (await getDoc(userRef)).data()
}

export async function getUserProfile(uid) {
  const userRef = doc(db, 'users', uid)
  const snap = await getDoc(userRef)
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function updateUserProfile(uid, data) {
  const userRef = doc(db, 'users', uid)
  await updateDoc(userRef, data)
}

/**
 * Sync RTDB hardware users to Firestore so they appear on the leaderboard.
 * Creates a minimal Firestore doc for each RTDB user who doesn't already have one.
 */
export async function syncRtdbUsersToFirestore(rtdbUsers) {
  if (!rtdbUsers || typeof rtdbUsers !== 'object') return
  
  for (const [name, data] of Object.entries(rtdbUsers)) {
    const rtdbPoints = data.points || 0
    
    // 1. Find the definitive account for this rtdbName
    // We prioritize registered users over 'hw_...' placeholder docs
    const q = query(collection(db, 'users'), where('rtdbName', '==', name))
    const snap = await getDocs(q)
    
    if (!snap.empty) {
      // 2. We found accounts linked to this name.
      // If there are multiple (e.g. a 'hw_...' doc and a real user doc), 
      // we prioritize the real user (id doesn't start with 'hw_').
      let targetDoc = snap.docs.find(d => !d.id.startsWith('hw_')) || snap.docs[0]
      const hwDoc = snap.docs.find(d => d.id.startsWith('hw_'))

      const current = targetDoc.data()
      let saved = current.savedPoints || 0

      // MIGRATION: If we have a separate 'hw_...' doc with points, move them to the real user
      if (hwDoc && targetDoc.id !== hwDoc.id) {
        const hwData = hwDoc.data()
        if (hwData.points > 0) {
          saved += hwData.points
          console.log(`Migrating ${hwData.points} from ${hwDoc.id} to ${targetDoc.id}`)
          // Clear the hw doc so we don't migrate again
          await updateDoc(hwDoc.ref, { points: 0, savedPoints: 0, rtdbName: `migrated_${name}_${Date.now()}` })
        }
      }

      const totalPoints = saved + rtdbPoints
      await updateDoc(targetDoc.ref, {
        points: totalPoints,
        savedPoints: saved,
        monthlyImpactKg: parseFloat((totalPoints * 0.15).toFixed(1)),
        lastRtdbSnapshot: rtdbPoints,
      })
    } else {
      // 3. No one linked? Create a hardware-only user
      const docId = `hw_${name.toLowerCase()}`
      const userRef = doc(db, 'users', docId)
      await setDoc(userRef, {
        displayName: name,
        rtdbName: name,
        role: 'user',
        points: rtdbPoints,
        savedPoints: 0,
        lastRtdbSnapshot: rtdbPoints,
        tier: 'BRONZE',
        streak: 0,
        monthlyImpactKg: parseFloat((rtdbPoints * 0.15).toFixed(1)),
        isHardwareOnly: true,
        createdAt: serverTimestamp(),
      }, { merge: true })
    }
  }
}

/**
 * Atomically add points to a user's Firestore total.
 * Used to accumulate RTDB hardware points that get overwritten.
 */
/**
 * Atomically add points to a user's Firestore total.
 * Also increments impact weight based on hardware stats (1 point = 0.15kg).
 */
export async function accumulatePoints(uid, pointsToAdd) {
  if (!uid || !pointsToAdd || pointsToAdd <= 0) return
  const userRef = doc(db, 'users', uid)
  const weightAdded = parseFloat((pointsToAdd * 0.15).toFixed(2))
  
  await updateDoc(userRef, {
    savedPoints: increment(pointsToAdd),
    points: increment(pointsToAdd),
    totalDisposals: increment(1),
    monthlyImpactKg: increment(weightAdded),
  })
}

function computeTier(points) {
  if (points >= 10000) return 'GOLD'
  if (points >= 5000) return 'SILVER'
  return 'BRONZE'
}

// ═══════════════════════════════════════════
// LEADERBOARD
// ═══════════════════════════════════════════

export async function getLeaderboard(count = 10) {
  const q = query(
    collection(db, 'users'),
    orderBy('points', 'desc'),
    firestoreLimit(count * 2) // Fetch more to account for filtering
  )
  const snap = await getDocs(q)
  const lb = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(u => u.role === 'user')

  const unique = {}
  lb.forEach(u => {
    const key = (u.rtdbName || u.displayName || u.id).toLowerCase().trim()
    const existing = unique[key]
    const isNewHw = u.id.startsWith('hw_')
    const isExistingHw = existing?.id.startsWith('hw_')

    if (!existing || (isExistingHw && !isNewHw) || (isNewHw === isExistingHw && u.points > existing.points)) {
      unique[key] = u
    }
  })

  return Object.values(unique)
    .sort((a, b) => b.points - a.points)
    .slice(0, count)
    .map((u, i) => ({ ...u, rank: i + 1 }))
}

/**
 * Real-time leaderboard from Firestore (persistent, not overwritten).
 */
export function subscribeToFirestoreLeaderboard(count, callback) {
  const q = query(
    collection(db, 'users'),
    orderBy('points', 'desc'),
    firestoreLimit(count ? count * 2 : 20)
  )
  const unsub = onSnapshot(q, (snap) => {
    const lb = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(u => u.role === 'user' && (u.points > 0 || !u.id.startsWith('hw_')))
      
    // Deduplicate by rtdbName or displayName (case-insensitive)
    const unique = {}
    lb.forEach(u => {
      const key = (u.rtdbName || u.displayName || u.id).toLowerCase().trim()
      const existing = unique[key]
      
      const isNewHw = u.id.startsWith('hw_')
      const isExistingHw = existing?.id.startsWith('hw_')

      // Logic: 
      // - If no entry yet, take it.
      // - If existing is hardware-only but new one is a REAL user, take the real user (MANDATORY).
      // - If both are the same type, take the one with more points.
      if (!existing || (isExistingHw && !isNewHw) || (isNewHw === isExistingHw && u.points > existing.points)) {
        unique[key] = u
      }
    })

    const finalLb = Object.values(unique)
      .sort((a, b) => b.points - a.points)
      .slice(0, count || 10)
      .map((data, i) => {
        return {
          ...data,
          rank: i + 1,
          displayName: data.displayName || data.rtdbName || 'Citizen',
          points: data.points || 0,
          rtdbName: data.rtdbName || null,
          impactKg: (data.monthlyImpactKg || (data.points || 0) * 0.15).toFixed(1),
        }
      })
    callback(finalLb)
  })
  return unsub
}

// ═══════════════════════════════════════════
// WASTE LOGS
// ═══════════════════════════════════════════

const POINTS_MAP = {
  'Wet Waste': 20,
  'Dry Waste': 10,
  'Hazardous': 30,
}

export async function addWasteLog(uid, wasteType, binId = 'BIN-001') {
  const pointsEarned = POINTS_MAP[wasteType] || 10

  // Add the log
  const logRef = await addDoc(collection(db, 'wasteLogs'), {
    userId: uid,
    binId,
    wasteType,
    pointsEarned,
    correct: true,
    timestamp: serverTimestamp(),
  })

  // Update user points, streak, impact
  const userRef = doc(db, 'users', uid)
  const userSnap = await getDoc(userRef)
  const userData = userSnap.data()
  const newPoints = (userData.points || 0) + pointsEarned

  await updateDoc(userRef, {
    points: increment(pointsEarned),
    totalDisposals: increment(1),
    monthlyImpactKg: increment(0.3),
    streak: increment(1),
    tier: computeTier(newPoints),
  })

  return { logId: logRef.id, pointsEarned }
}

export async function getUserWasteLogs(uid, count = 10) {
  const q = query(
    collection(db, 'wasteLogs'),
    where('userId', '==', uid),
    orderBy('timestamp', 'desc'),
    firestoreLimit(count)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ═══════════════════════════════════════════
// BINS
// ═══════════════════════════════════════════

export async function getBins() {
  const snap = await getDocs(collection(db, 'bins'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function updateBinStatus(binId, data) {
  const binRef = doc(db, 'bins', binId)
  await updateDoc(binRef, { ...data, lastUpdated: serverTimestamp() })
}

// ═══════════════════════════════════════════
// REWARDS
// ═══════════════════════════════════════════

export async function getRewards() {
  const snap = await getDocs(collection(db, 'rewards'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function redeemReward(uid, reward) {
  const userRef = doc(db, 'users', uid)
  const userSnap = await getDoc(userRef)
  const userData = userSnap.data()

  if (userData.points < reward.pointsCost) {
    throw new Error('Not enough points')
  }

  await updateDoc(userRef, {
    points: increment(-reward.pointsCost),
    tier: computeTier(userData.points - reward.pointsCost),
  })

  await addDoc(collection(db, 'redemptions'), {
    userId: uid,
    rewardId: reward.id,
    rewardTitle: reward.title,
    pointsSpent: reward.pointsCost,
    timestamp: serverTimestamp(),
  })

  return true
}

// ═══════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════

export async function getAlerts(count = 10) {
  const q = query(
    collection(db, 'alerts'),
    orderBy('timestamp', 'desc'),
    firestoreLimit(count * 2)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(a => a.resolved === false)
    .slice(0, count)
}

export function subscribeToAlerts(callback) {
  const q = query(
    collection(db, 'alerts'),
    orderBy('timestamp', 'desc'),
    firestoreLimit(20)
  )
  return onSnapshot(q, (snap) => {
    const active = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(a => a.resolved === false)
    callback(active)
  })
}

// ═══════════════════════════════════════════
// BROADCASTS
// ═══════════════════════════════════════════

export async function addBroadcast(data) {
  return await addDoc(collection(db, 'broadcasts'), {
    message: data.message,
    zone: data.zone || 'Zone A',
    sentBy: data.sentBy,
    timestamp: serverTimestamp(),
  })
}

// ═══════════════════════════════════════════
// ADMIN DASHBOARD STATS
// ═══════════════════════════════════════════

export async function getDashboardStats() {
  // Total REAL users only (exclude demo/seeded users)
  const usersSnap = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'user'))
  )
  // Filter out demo users client-side (isDemo !== true)
  const realUsers = usersSnap.docs.filter(d => !d.data().isDemo)
  const totalCitizens = realUsers.length

  // Total waste logs
  const logsSnap = await getDocs(collection(db, 'wasteLogs'))
  const totalLogs = logsSnap.size
  // Total points issued (real users only)
  let totalPoints = 0
  realUsers.forEach(d => {
    totalPoints += d.data().points || 0
  })

  const totalWeightKg = totalPoints * 0.15
  const totalWeightDisplay = totalWeightKg >= 1000 
    ? `${(totalWeightKg / 1000).toFixed(1)} Tons`
    : `${totalWeightKg.toFixed(0)} KG`

  // Active alerts
  const alertsSnap = await getDocs(
    query(collection(db, 'alerts'), where('resolved', '==', false))
  )

  // Bins online
  const binsSnap = await getDocs(
    query(collection(db, 'bins'), where('status', '==', 'online'))
  )

  // Waste type distribution
  let wetCount = 0, dryCount = 0, hazCount = 0
  logsSnap.docs.forEach(d => {
    const type = d.data().wasteType
    if (type === 'Wet Waste') wetCount++
    else if (type === 'Dry Waste') dryCount++
    else if (type === 'Hazardous') hazCount++
  })
  const total = wetCount + dryCount + hazCount || 1

  return {
    totalCitizens,
    wasteProcessed: totalWeightDisplay,
    pointsIssued: totalPoints >= 1000 ? `${(totalPoints / 1000).toFixed(0)}K` : totalPoints.toString(),
    activeAlerts: alertsSnap.size,
    binsOnline: binsSnap.size,
    distribution: {
      dry: Math.round((dryCount / total) * 100),
      wet: Math.round((wetCount / total) * 100),
      hazardous: Math.round((hazCount / total) * 100),
    },
    accuracy: 98.4,
  }
}

// ═══════════════════════════════════════════
// BROADCAST SUBSCRIPTION (Real-time for Users)
// ═══════════════════════════════════════════

/**
 * Subscribe to broadcast messages in real-time.
 * Users will receive notifications as they arrive.
 */
export function subscribeToBroadcasts(callback) {
  const q = query(
    collection(db, 'broadcasts'),
    orderBy('timestamp', 'desc'),
    firestoreLimit(20)
  )
  const unsub = onSnapshot(q, (snap) => {
    const broadcasts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(broadcasts)
  })
  return unsub
}

// ═══════════════════════════════════════════
// TEMPERATURE ALERT SYSTEM
// ═══════════════════════════════════════════

/**
 * Log a high-temperature alert when a bin exceeds 50°C.
 */
export async function addTemperatureAlert(binId, binName, temperature) {
  return await addDoc(collection(db, 'alerts'), {
    type: 'critical',
    category: 'temperature',
    binId,
    binName: binName || binId,
    temperature,
    message: `🔥 FIRE RISK: ${binName || binId} recorded ${temperature}°C`,
    resolved: false,
    crewDispatched: false,
    timestamp: serverTimestamp(),
  })
}

/**
 * Mark a temperature alert as resolved with action details.
 */
export async function resolveTemperatureAlert(alertId, action = 'crew_dispatched') {
  const alertRef = doc(db, 'alerts', alertId)
  await updateDoc(alertRef, {
    resolved: true,
    crewDispatched: action === 'crew_dispatched',
    resolvedAt: serverTimestamp(),
    actionTaken: action,
  })
}
