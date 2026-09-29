import * as T from "three";
import { settings } from "./audio";

export function blocksLandmark(region: string, x: number, z: number) {
  const obstacles =
    region === "haven"
      ? [
          [-13, -6, 1.9],
          [11, -10, 1.9],
        ]
      : region === "canyon"
        ? [
            [-13, -4, 2.6],
            [13, -4, 2.6],
            [-4, -11, 1.15],
            [2, -11, 1.15],
          ]
        : region === "hollow"
          ? Array.from({ length: 9 }, (_, i) => [-11 + i * 2.4, -11, 0.8])
          : [];
  return obstacles.some(
    ([ox, oz, radius]) => Math.hypot(x - ox, z - oz) < radius,
  );
}

// Decorative landmarks sit outside the central interaction routes.
export function RegionScenery({ region }: { region: string }) {
  if (region === "canyon")
    return (
      <>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 13, 0, -4]}>
            {[0, 1, 2].map((i) => (
              <mesh
                key={i}
                position={[side * i * 0.35, 1.3 + i * 1.55, -i * 0.4]}
                rotation={[0, i * 0.3, 0]}
                castShadow
              >
                <cylinderGeometry
                  args={[2.2 - i * 0.3, 2.5 - i * 0.3, 1.7, 6]}
                />
                <meshStandardMaterial
                  color={i % 2 ? "#c79270" : "#976c61"}
                  flatShading
                />
              </mesh>
            ))}
          </group>
        ))}
        <group position={[-1, 0, -11]}>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[side * 3, 2.9, 0]}
              rotation={[0, 0, side * 0.12]}
              castShadow
            >
              <boxGeometry args={[1.6, 6.2, 2]} />
              <meshStandardMaterial color="#b78368" />
            </mesh>
          ))}
          <mesh position={[0, 5.5, 0]} castShadow>
            <boxGeometry args={[7.5, 1.5, 2.2]} />
            <meshStandardMaterial color="#cf9d78" />
          </mesh>
          <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4, 4]} />
            <meshStandardMaterial
              color="#ef9f60"
              emissive="#b75528"
              emissiveIntensity={0.7}
            />
          </mesh>
        </group>
      </>
    );
  if (region === "hollow")
    return (
      <>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, 0.045, 10]}>
          <circleGeometry args={[3.5, 48]} />
          <meshPhysicalMaterial
            color="#9ccbd5"
            metalness={0.5}
            roughness={0.1}
            clearcoat={1}
          />
        </mesh>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh
            key={i}
            position={[-11 + i * 2.4, 1.1 + (i % 3) * 0.25, -11]}
            rotation={[0.1, i, (i % 2 ? 1 : -1) * 0.2]}
            castShadow
          >
            <coneGeometry args={[0.8, 2.8 + (i % 3), 5]} />
            <meshStandardMaterial
              color={i % 2 ? "#d6eef0" : "#a3c7df"}
              metalness={0.25}
              roughness={0.2}
            />
          </mesh>
        ))}
        <mesh position={[0, 7, -13]} rotation={[0, 0, -0.12]}>
          <planeGeometry args={[19, 2.3]} />
          <meshBasicMaterial
            color="#9ce2d0"
            transparent
            opacity={0.16}
            side={T.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </>
    );
  if (region === "meadow")
    return (
      <>
        {Array.from(
          { length: settings.quality === "Low" ? 20 : 48 },
          (_, i) => (
            <group
              key={i}
              position={[
                Math.sin(i * 2.4) * (11 + (i % 4)),
                0.15,
                Math.cos(i * 2.4) * (11 + (i % 4)),
              ]}
            >
              <mesh>
                <cylinderGeometry args={[0.025, 0.025, 0.3, 4]} />
                <meshStandardMaterial color="#5e8261" />
              </mesh>
              <mesh position={[0, 0.2, 0]}>
                <icosahedronGeometry args={[0.17, 0]} />
                <meshStandardMaterial
                  color={["#eebaae", "#e6d7a0", "#acb2d8"][i % 3]}
                />
              </mesh>
            </group>
          ),
        )}
        <mesh position={[-9, -1.7, -13]}>
          <boxGeometry args={[2, 4.5, 0.12]} />
          <meshStandardMaterial
            color="#b1e8df"
            emissive="#92bfbf"
            emissiveIntensity={0.3}
            transparent
            opacity={0.75}
          />
        </mesh>
        <mesh position={[-9, 0.04, -9]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.3, 32]} />
          <meshStandardMaterial
            color="#80b8b4"
            metalness={0.35}
            roughness={0.2}
          />
        </mesh>
      </>
    );
  return (
    <>
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={side < 0 ? [-13, 0, -6] : [11, 0, -10]}
          rotation={[0, side * -0.35, 0]}
        >
          <mesh position={[0, 1, 0]} castShadow>
            <boxGeometry args={[2.8, 2, 2.5]} />
            <meshStandardMaterial color="#ded4b8" />
          </mesh>
          <mesh
            position={[0, 2.5, 0]}
            rotation={[0, Math.PI / 4, 0]}
            castShadow
          >
            <coneGeometry args={[2.4, 1.4, 4]} />
            <meshStandardMaterial color={side < 0 ? "#607f83" : "#9e7e6d"} />
          </mesh>
          {[-0.7, 0.7].map((x) => (
            <mesh key={x} position={[x, 1.2, 1.26]}>
              <planeGeometry args={[0.45, 0.6]} />
              <meshStandardMaterial
                color="#f6d8a0"
                emissive="#e5b46e"
                emissiveIntensity={0.7}
              />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}
