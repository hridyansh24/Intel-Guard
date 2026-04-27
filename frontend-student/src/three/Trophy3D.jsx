import { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Cone, Sparkles, Torus } from '@react-three/drei'

function Trophy({ celebrate }) {
  const g = useRef()
  useFrame((state, delta) => {
    if (g.current) g.current.rotation.y += delta * 0.6
  })
  const color = celebrate ? '#fbbf24' : '#22d3ee'
  const emissive = celebrate ? '#f59e0b' : '#06b6d4'

  return (
    <group ref={g}>
      <Float speed={1.8} rotationIntensity={0.3} floatIntensity={0.8}>
        {/* cup body */}
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.55, 0.4, 1.1, 32]} />
          <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.5} metalness={0.9} roughness={0.15} />
        </mesh>
        {/* handles */}
        <Torus args={[0.3, 0.08, 12, 32, Math.PI]} position={[0.72, 0.5, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.5} metalness={0.9} roughness={0.15} />
        </Torus>
        <Torus args={[0.3, 0.08, 12, 32, Math.PI]} position={[-0.72, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.5} metalness={0.9} roughness={0.15} />
        </Torus>
        {/* stem */}
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.1, 0.14, 0.4, 16]} />
          <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.4} metalness={0.9} roughness={0.2} />
        </mesh>
        {/* base */}
        <mesh position={[0, -0.62, 0]}>
          <cylinderGeometry args={[0.5, 0.55, 0.18, 32]} />
          <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.3} metalness={0.9} roughness={0.25} />
        </mesh>
        {/* star top */}
        <Cone args={[0.18, 0.35, 5]} position={[0, 1.2, 0]}>
          <meshStandardMaterial color="#fff" emissive="#fbbf24" emissiveIntensity={1} metalness={0.95} roughness={0.1} />
        </Cone>
      </Float>
      <Sparkles count={celebrate ? 60 : 20} scale={4} size={3} speed={0.6} color={celebrate ? '#fbbf24' : '#a855f7'} />
    </group>
  )
}

export default function Trophy3D({ celebrate = false, height = 260 }) {
  return (
    <div style={{ width: '100%', height }}>
      <Canvas camera={{ position: [0, 0.3, 3.5], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <pointLight position={[3, 4, 4]} intensity={1.8} color="#fff" />
          <pointLight position={[-3, -2, 2]} intensity={1} color="#a855f7" />
          <pointLight position={[0, -3, 3]} intensity={0.8} color="#ec4899" />
          <Trophy celebrate={celebrate} />
        </Suspense>
      </Canvas>
    </div>
  )
}
