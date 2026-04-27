import { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Icosahedron, MeshDistortMaterial, Stars, Sparkles } from '@react-three/drei'
import * as THREE from 'three'

function Core({ mouseRef }) {
  const meshRef = useRef()
  const wireRef = useRef()

  useFrame((state, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * 0.18
    meshRef.current.rotation.x += delta * 0.07
    if (mouseRef?.current) {
      const { x, y } = mouseRef.current
      meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, x * 0.3, 0.05)
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, -y * 0.3, 0.05)
    }
    if (wireRef.current) {
      wireRef.current.rotation.y -= delta * 0.25
      wireRef.current.rotation.z += delta * 0.08
    }
  })

  return (
    <group>
      <Float speed={1.4} rotationIntensity={0.6} floatIntensity={1.1}>
        <Icosahedron ref={meshRef} args={[1.15, 5]}>
          <MeshDistortMaterial
            color="#22d3ee"
            emissive="#0ea5e9"
            emissiveIntensity={0.45}
            roughness={0.15}
            metalness={0.9}
            distort={0.36}
            speed={1.7}
          />
        </Icosahedron>
      </Float>
      <Icosahedron ref={wireRef} args={[1.55, 1]}>
        <meshBasicMaterial color="#fbbf24" wireframe transparent opacity={0.24} />
      </Icosahedron>
      <Icosahedron args={[1.85, 0]}>
        <meshBasicMaterial color="#8b5cf6" wireframe transparent opacity={0.1} />
      </Icosahedron>
    </group>
  )
}

export default function ShieldOrb({ height = 320, mouseRef }) {
  return (
    <div style={{ width: '100%', height, position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.35} />
          <pointLight position={[4, 4, 5]} intensity={1.6} color="#22d3ee" />
          <pointLight position={[-4, -3, 3]} intensity={1.2} color="#fbbf24" />
          <pointLight position={[0, 4, -2]} intensity={0.9} color="#8b5cf6" />
          <Core mouseRef={mouseRef} />
          <Sparkles count={60} scale={6} size={2.2} speed={0.3} color="#67e8f9" opacity={0.75} />
          <Stars radius={40} depth={60} count={800} factor={2.5} saturation={0.6} fade speed={0.6} />
        </Suspense>
      </Canvas>
    </div>
  )
}
