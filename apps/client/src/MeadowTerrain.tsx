import { RaisedTerrain } from "./RaisedTerrain";
import {
  MEADOW_PATHS,
  meadowEdge,
  meadowHeight,
} from "../../../packages/shared/meadow";
const spec = {
  name: "whisperleaf-terrain",
  paths: MEADOW_PATHS,
  edge: meadowEdge,
  height: meadowHeight,
  low: "#8fa879",
  high: "#a4b786",
  side: "#536e60",
  trail: "#d9c59c",
};
export function MeadowTerrain() {
  return <RaisedTerrain spec={spec} />;
}
