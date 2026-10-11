import { RaisedTerrain } from "./RaisedTerrain";
import { CANYON_PATHS, canyonEdge, canyonHeight } from "../../../packages/shared/canyon";
const spec = {name:"emberglass-terrain",paths:CANYON_PATHS,edge:canyonEdge,height:canyonHeight,low:"#bc8b6c",high:"#987b79",side:"#735c5a",trail:"#e0b991"};
export function CanyonTerrain(){return <RaisedTerrain spec={spec}/>;}
