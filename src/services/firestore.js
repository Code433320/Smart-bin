import {
  doc, getDoc, setDoc, updateDoc, addDoc,
  collection, query, where, orderBy, limit as firestoreLimit,
  getDocs, serverTimestamp, increment, Timestamp
} from 'firebase/firestore'
import { db } from '../firebase/config'

// ═══════════════════════════════════════════
// USER PROFILES
// ═══════════════════════════════════════════

export async function createUserProfile(uid, data) {
  const userRef = doc(db, 'users', uid)
  const existing = await getDoc(userRef)
  if (!existing.exists()) {
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
    })
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
    where('role', '==', 'user'),
    orderBy('points', 'desc'),
    firestoreLimit(count)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d, i) => ({
    id: d.id,
    rank: i + 1,
    ...d.data(),
  }))
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
    firestoreLimit(count)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
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
  const totalWeightTons = (totalLogs * 0.3) / 1000 // rough estimate

  // Total points issued (real users only)
  let totalPoints = 0
  realUsers.forEach(d => {
    totalPoints += d.data().points || 0
  })

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
    wasteProcessed: `${totalWeightTons.toFixed(1)} Tons`,
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
