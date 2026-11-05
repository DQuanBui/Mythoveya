import { RegionMotes } from "./RegionMotes";
import { MorningMist } from "./MorningMist";
import { WaterGlints } from "./WaterGlints";
import { Puddles } from "./Puddles";
import { GroundBirds } from "./GroundBirds";
import { mistAt } from "./mist";
import { islandHour } from "./daytime";
import { settings } from "./audio";

const dawnDew = () => (settings.daynight ? mistAt(islandHour()) : 0);

/** A region's purely ambient life (motes, dawn mist, snow sparkle, puddles,
 * sparrows), loaded as its own chunk after the world appears. */
export function Ambience({ region, ground }: { region: string; ground: (x: number, z: number) => number }) {
  return (
    <>
      <RegionMotes region={region} />
      {(region === "haven" || region === "meadow") && <MorningMist ground={ground} />}
      {/* Fresh snow sparkles in the sun around the keeper. */}
      {region === "hollow" && <WaterGlints x={0} z={0} rx={9} rz={9} y={0.04} max={36} color="#f4fbff" follow={ground} />}
      {region === "haven" && (
        <>
          <Puddles />
          <GroundBirds />
          {/* Dew glitters on the grass while the morning mist lies. */}
          <WaterGlints x={0} z={0} rx={10} rz={10} y={0.06} max={30} color="#f2fff6" follow={ground} amount={dawnDew} />
        </>
      )}
    </>
  );
}
