import { useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import { type Group } from 'three';
import { type Dimensions } from '../store/useProjectStore';

interface Table3DProps {
  dimensions: Dimensions;
  autoRotate?: boolean;
  scale?: number;
}

const TABLETOP_COLOR = '#8B5E3C';
const LEG_COLOR = '#6B4226';
const EDGE_COLOR = '#A0714F';

export default function Table3D({ dimensions, autoRotate = false, scale = 1 }: Table3DProps) {
  const groupRef = useRef<Group>(null);

  const lengthM = dimensions.length_cm / 100;
  const widthM = dimensions.width_cm / 100;
  const heightM = dimensions.height_cm / 100;
  const topThicknessM = dimensions.top_thickness_cm / 100;
  const legThicknessM = dimensions.leg_thickness_cm / 100;

  const legHeight = Math.max(heightM - topThicknessM, 0.01);
  const topY = legHeight + topThicknessM / 2;
  const legY = legHeight / 2;

  const legX = Math.max(lengthM / 2 - legThicknessM / 2 - 0.01, 0);
  const legZ = Math.max(widthM / 2 - legThicknessM / 2 - 0.01, 0);
  const legPositions: [number, number, number][] = [
    [legX, legY, legZ],
    [-legX, legY, legZ],
    [legX, legY, -legZ],
    [-legX, legY, -legZ],
  ];

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      <mesh position={[0, topY, 0]} castShadow receiveShadow>
        <boxGeometry args={[lengthM, topThicknessM, widthM]} />
        <meshStandardMaterial color={TABLETOP_COLOR} roughness={0.6} metalness={0.05} />
      </mesh>

      <mesh position={[0, topY, 0]}>
        <boxGeometry args={[lengthM + 0.005, topThicknessM + 0.002, widthM + 0.005]} />
        <meshStandardMaterial color={EDGE_COLOR} roughness={0.8} transparent opacity={0.25} />
      </mesh>

      {legPositions.map((position, index) =>
        dimensions.leg_style === 'round' ? (
          <mesh key={index} position={position} castShadow>
            <cylinderGeometry args={[legThicknessM / 2, legThicknessM / 2, legHeight, 24]} />
            <meshStandardMaterial color={LEG_COLOR} roughness={0.7} metalness={0.05} />
          </mesh>
        ) : (
          <mesh key={index} position={position} castShadow>
            <boxGeometry args={[legThicknessM, legHeight, legThicknessM]} />
            <meshStandardMaterial color={LEG_COLOR} roughness={0.7} metalness={0.05} />
          </mesh>
        )
      )}

      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[Math.max(lengthM, widthM) * 0.6, 32]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}
