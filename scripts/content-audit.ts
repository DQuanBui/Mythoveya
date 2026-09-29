import { writeFileSync, mkdirSync } from "node:fs";
import { SPECIES, TIERS } from "../packages/shared/content";
import {MUSIC,CUES} from '../packages/shared/audio-content';
mkdirSync("docs", { recursive: true });
writeFileSync('docs/AUDIO_MANIFEST.json',JSON.stringify({source:'Original Web Audio synthesis; no external audio files',music:Object.fromEntries(Object.entries(MUSIC).map(([id,song])=>[id,{...song,seconds:song.steps*60/song.bpm/2}])),cues:CUES,voices:SPECIES.map(s=>({species:s.id,family:s.family,profile:s.voice,variants:['call','attack','hurt']}))},null,2)+'\n');
if (
  SPECIES.length !== 60 ||
  TIERS.some((t) => SPECIES.filter((s) => s.tier === t).length !== 10)
)
  throw Error("Invalid roster distribution");
const ids = new Set(SPECIES.flatMap((s) => s.actions.map((a) => a.id)));
if (ids.size !== 180 || new Set(SPECIES.map((s) => s.passive.id)).size !== 60)
  throw Error("Duplicate actions or passives");
const columns = [
  "ID",
  "Tier",
  "Element",
  "Role",
  "Model recipe",
  "Portrait mapping",
  "Basic action",
  "Active action",
  "Ultimate action",
  "Passive",
  "Animation",
  "Voice",
  "VFX",
  "Verification",
];
const rows = SPECIES.map((s) => [
  s.id,
  s.tier,
  s.element,
  s.role,
  `${s.family}; variant ${s.variant}; ${s.appearance}`,
  `model-render:${s.id}`,
  ...s.actions.map((a) => a.id),
  s.passive.id,
  `${s.animation}:idle/walk/attack/cast/ultimate/hit/defeat/entrance/victory/guard/stunned`,
  `${s.voice}:call/attack/hurt`,
  s.actions.map((a) => a.presentation).join(";"),
  "definitions tested; model renders audited; individual art polish pending",
]);
const quote = (s: string) => `"${s.replaceAll('"', '""')}"`;
writeFileSync(
  "docs/CONTENT_MATRIX.csv",
  [columns, ...rows].map((row) => row.map(quote).join(",")).join("\n") + "\n",
);
console.log(
  `Audited ${SPECIES.length} species, ${ids.size} actions, 60 passives, ${new Set(SPECIES.map((s) => s.family)).size} model families.`,
);
