import { ref, get, set, onValue } from 'firebase/database'
import { rtdb } from '../firebase/config'

// ═══════════════════════════════════════════
// REALTIME DATABASE — User Points Bridge
// ═══════════════════════════════════════════

/**
 * Validate that a name exists in /users in RTDB.
 * Used during signup to confirm the hardware-registered name.
 */
export async function validateRtdbUser(name) {
  if (!name) return false
  const snap = await get(ref(rtdb, `users/${name}`))
  return snap.exists()
}

/**
 * Subscribe to the live leaderboard from RTDB.
 * Simple, reliable — shows ALL hardware users sorted by points.
 */
export function subscribeToLeaderboard(callback) {
  const usersRef = ref(rtdb, 'users')
  const unsub = onValue(usersRef, (snap) => {
    if (!snap.exists()) { callback([]); return }
    const data = snap.val()
    const leaderboard = Object.entries(data).map(([name, val]) => {
      const fill = val.fillPercent || val.fill_percent || 0
      const weight = ((fill / 100) * 15).toFixed(1)
      return {
        id: name,
        displayName: name,
        points: val.points || 0,
        wasteType: val.wasteType,
        impactKg: weight,
        rank: 0
      }
    })
    .sort((a, b) => b.points - a.points)
    .map((u, i) => ({ ...u, rank: i + 1 }))
    callback(leaderboard)
  })
  return unsub
}

/**
 * One-time sync: push all RTDB users to Firestore so they appear on the leaderboard.
 */
export async function syncAllRtdbUsers() {
  const snap = await get(ref(rtdb, 'users'))
  if (!snap.exists()) return
  const { syncRtdbUsersToFirestore } = await import('./firestore')
  await syncRtdbUsersToFirestore(snap.val())
}

/**
 * Subscribe to live points/data for a user by their RTDB name.
 */
export function subscribeToUserPoints(rtdbName, callback) {
  if (!rtdbName) return () => {}
  const userRef = ref(rtdb, `users/${rtdbName}`)
  const unsub = onValue(userRef, (snap) => {
    if (snap.exists()) callback(snap.val())
    else callback(null)
  })
  return unsub
}

// ═══════════════════════════════════════════
// REALTIME DATABASE — Bin Sensor Data
// ═══════════════════════════════════════════

function transformBinData(data, binsArray = []) {
  if (!data) return binsArray

  // 1. Handle "bins" (plural) collection
  if (data.bins) {
    const pluralBins = Object.entries(data.bins).map(([id, val]) => ({
      id,
      ...val,
      fillLevel: val.fillLevel ?? val.fill_percent ?? 0
    }))
    binsArray.push(...pluralBins)
  }

  // 2. Handle "bin" (singular) root node — THIS IS YOUR REAL SENSOR
  if (data.bin) {
    binsArray.push({
      id: 'REAL-SENSOR-01',
      name: 'Hardware Sensor — Live',
      location: 'Primary Site',
      status: 'online',
      wasteType: 'Dry Waste',
      lastUpdated: new Date().toISOString(),
      ...data.bin,
      fillLevel: data.bin.fill_percent ?? 0, // Map your real field
      distance: data.bin.distance
    })
  }

  // Handle case where data itself is the bins object (legacy support)
  if (!data.bin && !data.bins && typeof data === 'object') {
    const legacyBins = Object.entries(data)
      .filter(([key]) => key !== 'bin' && key !== 'bins')
      .map(([id, val]) => ({
        id,
        ...val,
        fillLevel: val.fillLevel ?? val.fill_percent ?? 0
      }))
    binsArray.push(...legacyBins)
  }

  return binsArray
}

/**
 * Update sensor data for a bin (temperature, status, etc.)
 */
export async function updateBinData(binId, updates) {
  // Handle the special 'REAL-SENSOR-01' ID which maps to the 'bin/' root
  const path = binId === 'REAL-SENSOR-01' ? 'bin' : `bins/${binId}`
  const binRef = ref(rtdb, path)
  
  // Get current data to merge updates
  const snap = await get(binRef)
  const current = snap.exists() ? snap.val() : {}
  
  await set(binRef, {
    ...current,
    ...updates,
    lastUpdated: new Date().toISOString()
  })
}

/**
 * Fetch all bins from Firebase Realtime Database.
 */
export async function getRTDBBins() {
  const rootRef = ref(rtdb)
  const snap = await get(rootRef)
  if (!snap.exists()) return []
  return transformBinData(snap.val())
}

/**
 * Subscribe to the physical bin state by aggregating data from all users.
 * Since multiple users share one bin, we take the max fill% and average temp.
 */
export function subscribeToSharedBin(callback) {
  const usersRef = ref(rtdb, 'users')
  return onValue(usersRef, (snap) => {
    if (!snap.exists()) {
      callback(null)
      return
    }
    const users = snap.val()
    let maxFill = 0
    let totalTemp = 0
    let tempCount = 0
    let lastUpdated = null
    let moisture = 0

    Object.values(users).forEach(u => {
      const fill = u.fillPercent || u.fill_percent || 0
      if (fill > maxFill) maxFill = fill
      
      if (u.temperature) {
        totalTemp += u.temperature
        tempCount++
      }
      if (u.moisture) moisture = u.moisture
      if (u.timestamp && (!lastUpdated || u.timestamp > lastUpdated)) {
        lastUpdated = u.timestamp
      }
    })

    callback({
      id: 'SHARED-BIN-01',
      name: 'Smart City Bin — Shared',
      location: 'Central Plaza',
      status: maxFill >= 90 ? 'critical' : 'online',
      fillLevel: maxFill,
      temperature: tempCount > 0 ? totalTemp / tempCount : null,
      moisture: moisture,
      lastUpdated: lastUpdated || new Date().toISOString()
    })
  })
}

/**
 * Subscribe to real-time bin updates from RTDB.
 * Combines the hardware-aggregated 'Shared Bin' with any other registered bins.
 */
export function subscribeToBins(callback) {
  const rootRef = ref(rtdb)
  
  // Create a combined subscription
  const unsub = onValue(rootRef, (snap) => {
    if (!snap.exists()) { callback([]); return }
    const data = snap.val()
    
    // 1. Get the shared bin (hardware aggregated from /users)
    const users = data.users || {}
    let maxFill = 0
    let totalTemp = 0
    let tempCount = 0
    let lastUpdated = null
    let moisture = 0
    let latestUser = null

    Object.entries(users).forEach(([name, u]) => {
      const fill = u.fillPercent || u.fill_percent || 0
      if (fill > maxFill) {
        maxFill = fill
        latestUser = name
      }
      if (u.temperature) {
        totalTemp += u.temperature
        tempCount++
      }
      if (u.moisture) moisture = u.moisture
      if (u.timestamp && (!lastUpdated || u.timestamp > lastUpdated)) {
        lastUpdated = u.timestamp
      }
    })

    const sharedBin = {
      id: 'SHARED-BIN-01',
      name: 'Hardware Sensor — Shared',
      location: 'Primary Site',
      status: maxFill >= 90 ? 'critical' : 'online',
      fillLevel: maxFill,
      temperature: tempCount > 0 ? totalTemp / tempCount : null,
      moisture: moisture,
      lastUpdated: lastUpdated || new Date().toISOString(),
      latestUser: latestUser
    }

    // 2. Get other bins from 'bins' or 'bin' nodes
    const otherBins = transformBinData(data)
    
    // Filter out the internal shared bin if it's already in otherBins (unlikely with IDs)
    const filteredOther = otherBins.filter(b => b.id !== 'SHARED-BIN-01' && b.id !== 'REAL-SENSOR-01')

    // Combine: Shared hardware bin ALWAYS first
    callback([sharedBin, ...filteredOther])
  })
  return unsub
}

// ═══════════════════════════════════════════
// REALTIME DATABASE — Disposal Event Logs (binData)
// ═══════════════════════════════════════════

/**
 * Transforms raw binData entries from RTDB into structured disposal events.
 * Filters out empty sensor triggers (entries where no waste was actually dumped).
 */
function transformDisposalEvents(data) {
  if (!data || typeof data !== 'object') return []

  return Object.entries(data)
    .map(([pushId, entry]) => ({
      id: pushId,
      fillPercent: entry.fillPercent ?? entry.fill_percent ?? 0,
      humidity: entry.humidity ?? null,
      moisture: entry.moisture ?? null,
      pointsAwarded: entry.pointsAwarded ?? 0,
      totalPoints: entry.totalPoints ?? 0,
      servoPosition: entry.servoPosition ?? null,
      temperature: entry.temperature ?? null,
      timestamp: entry.timestamp ?? null, // seconds since device boot
      wasteType: entry.wasteType || null,
      qrId: entry.qrId || null, // Reserved for future QR integration
    }))
    // Filter out empty sensor triggers — only show events where trash was actually dumped
    // (pointsAwarded > 0 means the system confirmed a real disposal, not just a sensor ping)
    .filter(e => e.wasteType !== null && e.wasteType !== '' && e.pointsAwarded > 0)
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)) // newest first
}

/**
 * Subscribe to global activity by watching all users.
 * Whenever any user's node changes, it counts as a disposal event.
 */
export function subscribeToGlobalActivity(callback) {
  const usersRef = ref(rtdb, 'users')
  return onValue(usersRef, (snap) => {
    if (!snap.exists()) { callback([]); return }
    const users = snap.val()
    const events = Object.entries(users)
      .filter(([_, u]) => (u.fillPercent || u.fill_percent) > 0)
      .map(([name, u]) => ({
        id: `${name}-${u.timestamp || Date.now()}`,
        userName: name,
        wasteType: u.wasteType || 'General',
        fillPercent: u.fillPercent || u.fill_percent || 0,
        pointsAwarded: u.points || 0,
        temperature: u.temperature,
        timestamp: u.timestamp || Date.now()
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
    
    callback(events)
  })
}

/**
 * Subscribe to real-time disposal event updates.
 * Checks binData first — if empty, falls back to /users activity.
 */
export function subscribeToBinData(callback) {
  // First check if binData exists
  const binDataRef = ref(rtdb, 'binData')
  let activeUnsub = null
  
  get(binDataRef).then(snap => {
    if (snap.exists()) {
      // binData exists — subscribe to it
      activeUnsub = onValue(binDataRef, (s) => {
        callback(transformDisposalEvents(s.val()))
      })
    } else {
      // No binData — use /users as activity source
      activeUnsub = subscribeToGlobalActivity(callback)
    }
  }).catch(() => {
    // Fallback on error
    activeUnsub = subscribeToGlobalActivity(callback)
  })
  
  return () => { if (activeUnsub) activeUnsub() }
}

/**
 * Compute summary stats from disposal events.
 */
export function computeDisposalStats(events) {
  const total = events.length
  const byType = { Dry: 0, Wet: 0, Hazardous: 0, Other: 0 }
  let totalPoints = 0
  let totalTemp = 0
  let tempCount = 0

  events.forEach(e => {
    const type = e.wasteType || 'Other'
    if (byType[type] !== undefined) byType[type]++
    else byType.Other++

    totalPoints += e.pointsAwarded || 0

    if (e.temperature !== null) {
      totalTemp += e.temperature
      tempCount++
    }
  })

  return {
    total,
    byType,
    totalPoints,
    totalWeight: parseFloat((totalPoints * 0.15).toFixed(1)),
    avgTemp: tempCount > 0 ? (totalTemp / tempCount).toFixed(1) : '--',
  }
}

// ═══════════════════════════════════════════
// SEED 4 BINS INTO RTDB
// ═══════════════════════════════════════════

export async function seedBinsInRTDB() {
  const binsRef = ref(rtdb, 'bins')
  
  const bins = {
    'BIN-001': {
      name: 'Bin 1 — MG Road',
      location: 'MG Road, Zone A',
      fillLevel: 72,
      temperature: 24.5,
      humidity: 45,
      moisture: 12,
      status: 'online',
      wasteType: 'Wet Waste',
      lastUpdated: new Date().toISOString(),
      latitude: 12.9716,
      longitude: 77.5946,
    },
    'BIN-002': {
      name: 'Bin 2 — Koramangala',
      location: 'Koramangala, Zone B',
      fillLevel: 45,
      temperature: 26.2,
      humidity: 42,
      moisture: 8,
      status: 'online',
      wasteType: 'Dry Waste',
      lastUpdated: new Date().toISOString(),
      latitude: 12.9352,
      longitude: 77.6245,
    },
    'BIN-003': {
      name: 'Bin 3 — Indiranagar',
      location: 'Indiranagar, Zone C',
      fillLevel: 88,
      temperature: 28.1,
      humidity: 50,
      moisture: 15,
      status: 'critical',
      wasteType: 'Hazardous',
      lastUpdated: new Date().toISOString(),
      latitude: 12.9784,
      longitude: 77.6408,
    },
    'BIN-004': {
      name: 'Bin 4 — Whitefield',
      location: 'Whitefield, Zone D',
      fillLevel: 30,
      temperature: 25.5,
      humidity: 38,
      moisture: 5,
      status: 'online',
      wasteType: 'Dry Waste',
      lastUpdated: new Date().toISOString(),
      latitude: 12.9698,
      longitude: 77.7499,
    },
  }

  await set(binsRef, bins)
  return getRTDBBins()
}
