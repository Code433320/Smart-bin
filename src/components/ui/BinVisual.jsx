import React, { useMemo } from 'react'
import { motion } from 'framer-motion'

/**
 * 3D Industrial Smart Bin
 * Design: Metallic frame with a cutout front panel. 
 * Fill is placed BEHIND the frame so it never "bleeds" or overflows.
 */
const BinVisual = ({ fillLevel = 0, size = 120, id = 'bin' }) => {
  const fill = Math.max(0, Math.min(100, fillLevel))
  
  // Use a strictly stable ID derived from the bin's unique database ID
  const safeId = id.toString().replace(/[^a-zA-Z0-9]/g, '-')

  const colors = {
    Wet: '#10b981',
    Dry: '#3b82f6',
    Hazardous: '#ef4444',
    Default: '#1F7A63'
  }

  const currentColor = fill >= 80 ? colors.Hazardous : fill >= 50 ? colors.Dry : colors.Default

  // Front panel coordinates: y from 30 to 85. Height = 55.
  const panelTop = 30
  const panelBottom = 85
  const panelHeight = 55
  const currentFillHeight = (fill / 100) * panelHeight
  const currentFillY = panelBottom - currentFillHeight

  return (
    <div className="relative group flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        <defs>
          {/* A mask is much more reliable than a clipPath for this */}
          <mask id={`mask-${safeId}`}>
            <rect x="30" y="28" width="40" height="58" rx="4" fill="white" />
          </mask>
          
          <linearGradient id={`frameGrad-${safeId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>

        {/* 1. Back Structure (The shadow inside) */}
        <path d="M28 22 L72 22 L75 88 L25 88 Z" fill="#0f172a" />

        {/* 2. The Trash Fill (Strictly Masked) */}
        <g mask={`url(#mask-${safeId})`}>
          <motion.rect
            x="20" // Wider than panel to ensure no gaps
            width="60"
            fill={currentColor}
            initial={{ y: panelBottom, height: 0 }}
            animate={{ y: currentFillY, height: currentFillHeight + 5 }}
            transition={{ duration: 1.5, type: 'spring', damping: 15 }}
            style={{ opacity: 0.8 }}
          />
          {/* Subtle ripple/wave at the top of the trash */}
          {fill > 5 && fill < 100 && (
            <motion.path
              d={`M20 ${currentFillY} Q35 ${currentFillY - 3} 50 ${currentFillY} Q65 ${currentFillY + 3} 85 ${currentFillY}`}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="2"
              fill="none"
              animate={{ d: [
                `M20 ${currentFillY} Q35 ${currentFillY - 2} 50 ${currentFillY} Q65 ${currentFillY + 2} 85 ${currentFillY}`,
                `M20 ${currentFillY} Q35 ${currentFillY + 2} 50 ${currentFillY} Q65 ${currentFillY - 2} 85 ${currentFillY}`,
                `M20 ${currentFillY} Q35 ${currentFillY - 2} 50 ${currentFillY} Q65 ${currentFillY + 2} 85 ${currentFillY}`
              ]}}
              transition={{ duration: 4, repeat: Infinity }}
            />
          )}
        </g>

        {/* 3. Metallic Front Frame (The Cutout) */}
        <path 
          fillRule="evenodd"
          d="M28 22 L72 22 L75 88 L25 88 Z M30 28 H70 V86 H30 Z" 
          fill={`url(#frameGrad-${safeId})`}
          stroke="#0f172a"
          strokeWidth="0.5"
        />

        {/* 4. Details: Lid, Sensor, Wheels */}
        <rect x="24" y="16" width="52" height="6" rx="2" fill="#334155" />
        <rect x="42" y="10" width="16" height="5" rx="2" fill="#334155" />
        
        <circle cx="50" cy="23" r="1.5" fill={fill >= 80 ? "#ef4444" : "#10b981"} />
        
        <circle cx="30" cy="92" r="3" fill="#0f172a" />
        <circle cx="70" cy="92" r="3" fill="#0f172a" />

        {/* 5. Floating Percentage */}
        <text
          x="50"
          y="58"
          textAnchor="middle"
          fontSize="9"
          fontWeight="900"
          fill="white"
          fontFamily="monospace"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)', opacity: fill > 15 ? 1 : 0 }}
        >
          {fill}%
        </text>
      </svg>
      
      {/* Real 3D floor shadow */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-black/30 blur-sm rounded-full -z-10" />
    </div>
  )
}

export default BinVisual
