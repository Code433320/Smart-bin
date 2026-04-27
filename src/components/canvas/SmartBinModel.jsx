import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Text } from '@react-three/drei'
import * as THREE from 'three'

const SmartBinModel = ({ scrollProgress = 0 }) => {
  const group = useRef()
  const lid = useRef()
  const glow = useRef()

  useFrame((state) => {
    const t = state.clock.getElapsedTime()

    if (group.current) {
      // Gentle auto-rotation + mouse tilt
      group.current.rotation.y = t * 0.3
      group.current.rotation.x = THREE.MathUtils.lerp(
        group.current.rotation.x,
        state.pointer.y * 0.15,
        0.05
      )
      group.current.rotation.z = THREE.MathUtils.lerp(
        group.current.rotation.z,
        -state.pointer.x * 0.1,
        0.05
      )
    }

    if (lid.current) {
      const open = scrollProgress > 0.3 && scrollProgress < 0.6
      const target = open ? -Math.PI / 3 : 0
      lid.current.rotation.x = THREE.MathUtils.lerp(lid.current.rotation.x, target, 0.08)
    }

    // Pulsing glow
    if (glow.current) {
      glow.current.material.emissiveIntensity = 1 + Math.sin(t * 2) * 0.5
    }
  })

  return (
    <group ref={group} scale={1.1}>
      {/* Main Body */}
      <RoundedBox args={[1.4, 2.2, 1.1]} radius={0.12} smoothness={4} castShadow>
        <meshStandardMaterial color="#1F7A63" metalness={0.15} roughness={0.65} />
      </RoundedBox>

      {/* Front Screen Panel */}
      <mesh position={[0, 0.3, 0.56]}>
        <planeGeometry args={[1.0, 0.7]} />
        <meshStandardMaterial color="#F5F0EA" metalness={0} roughness={0.95} />
      </mesh>

      {/* Screen Label */}
      <mesh position={[0, 0.3, 0.565]}>
        <planeGeometry args={[0.85, 0.08]} />
        <meshStandardMaterial color="#1F7A63" metalness={0} roughness={1} />
      </mesh>

      {/* Glowing accent strip */}
      <mesh ref={glow} position={[0, -1.05, 0.56]}>
        <boxGeometry args={[0.7, 0.04, 0.01]} />
        <meshStandardMaterial color="#2ECC71" emissive="#2ECC71" emissiveIntensity={1.5} />
      </mesh>

      {/* Side indicator lights */}
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={i} position={[x, -0.8, 0.56]}>
          <circleGeometry args={[0.03, 16]} />
          <meshStandardMaterial color="#2ECC71" emissive="#2ECC71" emissiveIntensity={2} />
        </mesh>
      ))}

      {/* Lid */}
      <group ref={lid} position={[0, 1.1, 0]}>
        <RoundedBox args={[1.5, 0.08, 1.2]} radius={0.04} position={[0, 0.04, 0]} castShadow>
          <meshStandardMaterial color="#166B55" metalness={0.2} roughness={0.55} />
        </RoundedBox>
        {/* Lid handle */}
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.4, 0.03, 0.08]} />
          <meshStandardMaterial color="#E8E2DA" metalness={0.1} roughness={0.7} />
        </mesh>
      </group>

      {/* Base platform */}
      <mesh position={[0, -1.15, 0]}>
        <cylinderGeometry args={[0.75, 0.85, 0.15, 32]} />
        <meshStandardMaterial color="#E8E2DA" metalness={0} roughness={0.85} />
      </mesh>

      {/* Recycle symbol on front (simple triangle) */}
      <mesh position={[0, -0.4, 0.565]}>
        <ringGeometry args={[0.12, 0.15, 3]} />
        <meshStandardMaterial color="#2ECC71" emissive="#2ECC71" emissiveIntensity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export default SmartBinModel
