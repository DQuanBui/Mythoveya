/** Small, bounded silhouettes for the western species' special skills. */
export const WILDWOOD_EFFECTS = [
  "reedlet",
  "lanternmoth",
  "coppershell",
  "bloomanta",
  "galehart",
  "auroroc", "cindervane", "thermala",
  "sunquill", "bramblebun", "kilnback", "frostmoth",
];
export function WildwoodEffect({ id }: { id: string }) {
  if (!WILDWOOD_EFFECTS.includes(id)) return null;
  const colors: Record<string, string[]> = {
    sunquill:["#f5cf75","#a2e6d5"],bramblebun:["#e6a9bd","#b9df97"],kilnback:["#ebae6c","#f5d395"],frostmoth:["#b3e5ed","#bca9ea"],
    cindervane: ["#efb160", "#c97eac"],
    thermala: ["#94e0cd", "#f2cca1"],
    reedlet: ["#9ae8d9", "#f6b9d3"],
    lanternmoth: ["#ffe6a0", "#fff5dd"],
    coppershell: ["#84c5a0", "#dba879"],
    bloomanta: ["#edb1d0", "#9cdbb2"],
    galehart: ["#8bcfdf", "#e6d9a6"],
    auroroc: ["#8be4d1", "#c0a3f0"],
  };
  return (
    <group name={`signature-${id}`}>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3,
          c = colors[id][i % 2];
        return (
          <group
            key={i}
            position={[
              Math.cos(a) * 0.62,
              0.1 + (i % 2) * 0.12,
              Math.sin(a) * 0.62,
            ]}
            rotation={[0, -a, 0]}
          >
            {(id === "reedlet" || id === "thermala" || id === "bramblebun") ? (
              <mesh>
                <sphereGeometry args={[0.16, 10, 8]} />
                <meshBasicMaterial color={c} transparent opacity={0.6} />
              </mesh>
            ) : (id === "coppershell" || id === "kilnback") ? (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.25, 0.25, 0.06, 6]} />
                <meshBasicMaterial color={c} transparent opacity={0.8} />
              </mesh>
            ) : (id === "galehart" || id === "sunquill") ? (
              <mesh rotation={[Math.PI / 2, 0, a]}>
                <torusGeometry args={[0.4, 0.03, 5, 20, Math.PI * 1.4]} />
                <meshBasicMaterial color={c} transparent opacity={0.8} />
              </mesh>
            ) : (id === "auroroc" || id === "cindervane" || id === "frostmoth") ? (
              <mesh rotation={[0.5, a, 0.5]}>
                <coneGeometry args={[0.085, 0.8, 5]} />
                <meshBasicMaterial color={c} transparent opacity={0.8} />
              </mesh>
            ) : (
              <mesh scale={[0.2, 0.04, 0.42]} rotation={[0, a, 0.25]}>
                <sphereGeometry args={[1, 10, 6]} />
                <meshBasicMaterial color={c} transparent opacity={0.8} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
