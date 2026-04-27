import { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Torus, Sphere, Float } from '@react-three/drei'

function Rings({ value }) {
  const g = useRef()
  const outer = useRef()
  const inner = useRef()
  const core = useRef()

  useFrame((state, delta) => {
    if (g.current) g.current.rotation.z += delta * 0.12
    if (outer.current) {
      outer.current.rotation.x += delta * 0.25
      outer.current.rotation.y += delta * 0.35
    }
    if (inner.current) {
      inner.current.rotation.x -= delta * 0.4
      inner.current.rotation.z += delta * 0.3
    }
    if (core.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05
      core.current.scale.setScalar(s)
    }
  })

  // color shifts from cyan (safe) -> amber (moderate) -> rose (high risk)
  const color = value > 0.7 ? '#f43f5e' : value > 0.4 ? '#fbbf24' : '#10b981'
  const accent = value > 0.7 ? '#f472b6' : value > 0.4 ? '#f59e0b' : '#22d3ee'

  return (
    <group ref={g}>
      <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5}>
        <Torus ref={outer} args={[1.35, 0.04, 16, 100]}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} metalness={0.8} roughness={0.2} />
        </Torus>
        <Torus ref={inner} args={[1.0, 0.03, 16, 80]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} metalness={0.9} roughness={0.15} />
        </Torus>
        <Sphere ref={core} args={[0.45, 48, 48]}>
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6 + value * 0.8}
            metalness={0.9}
            roughness={0.1}
          />
        </Sphere>
      </Float>
    </group>
  )
}

export default function AIGauge3D({ value = 0, height = 220 }) {
  return (
    <div style={{ width: '100%', height, position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 3.6], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <pointLight position={[3, 3, 4]} intensity={1.4} color="#fff" />
          <pointLight position={[-3, -2, 3]} intensity={0.9} color="#22d3ee" />
          <Rings value={value} />
        </Suspense>
      </Canvas>
    </div>
  )
}
