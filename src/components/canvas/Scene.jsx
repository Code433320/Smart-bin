import React from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera, Environment, Float, ContactShadows } from '@react-three/drei'
import SmartBinModel from './SmartBinModel'

const Scene = ({ scrollProgress = 0 }) => {
  return (
    <Canvas
      shadows
      className="fixed inset-0 -z-10"
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true, stencil: false, depth: true }}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />

      {/* Soft warm lighting */}
      <ambientLight intensity={0.8} color="#FFF8F0" />
      <directionalLight position={[5, 8, 5]} intensity={1.2} color="#FFF5E8" castShadow />
      <pointLight position={[-5, -2, -5]} intensity={0.3} color="#1F7A63" />

      <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.4}>
        <SmartBinModel scrollProgress={scrollProgress} />
      </Float>

      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.15}
        scale={10}
        blur={3}
        far={4.5}
        color="#8A847C"
      />

      <Environment preset="apartment" />
    </Canvas>
  )
}

export default Scene
