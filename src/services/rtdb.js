import { ref, get, set, onValue } from 'firebase/database'
import { rtdb } from '../firebase/config'

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
 * Fetch all bins from Firebase Realtime Database.
 */
export async function getRTDBBins() {
  const rootRef = ref(rtdb)
  const snap = await get(rootRef)
  if (!snap.exists()) return []
  return transformBinData(snap.val())
}

/**
 * Subscribe to real-time bin updates from RTDB.
 */
export function subscribeToBins(callback) {
  const rootRef = ref(rtdb)
  const unsub = onValue(rootRef, (snap) => {
    if (!snap.exists()) { callback([]); return }
    callback(transformBinData(snap.val()))
  })
  return unsub
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
