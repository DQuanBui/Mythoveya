import { RaisedTerrain } from "./RaisedTerrain";
import { HOLLOW_PATHS, hollowEdge, hollowHeight } from "../../../packages/shared/hollow";
const spec = {name:"moonfrost-terrain",paths:HOLLOW_PATHS,edge:hollowEdge,height:hollowHeight,low:"#b6ccd5",high:"#e0e9e9",side:"#63768f",trail:"#e8d7b5"};
export function HollowTerrain(){return <RaisedTerrain spec={spec}/>;}
