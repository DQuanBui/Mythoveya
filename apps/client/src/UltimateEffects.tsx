import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import {byId} from '../../../packages/shared/content';
import {settings} from './audio';
// Bounded, reusable geometry recipes. Each mythic has a distinct silhouette and cadence.
export function UltimateEffect({id,at,duration}:{id:string;at:number;duration:number}){
 const ref=useRef<T.Group>(null);const color=byId[id].color;
 useFrame(()=>{if(!ref.current)return;const p=Math.min(1,Math.max(0,(Date.now()-at)/duration));ref.current.children.forEach((child,i)=>{if(id==='pelagryth'){const wave=Math.max(0,p-i*.12);child.scale.setScalar(.4+wave*2.5);child.visible=wave>0&&p<.97;}else if(id==='everbloom'){child.scale.y=Math.max(.01,Math.min(1,p*2-i*.03));}else if(id==='nyxavorn'){child.rotation.z=(i%2?1:-1)*p*.4;}else if(id==='vortalyx'||id==='zephyreon'){child.rotation.y=p*(settings.reduced?.1:6)+i*.7;}else child.scale.setScalar(.65+Math.sin(p*Math.PI)*.4);});});
 const ring=(r:number,y:number,key:number,c=color,rotation:[number,number,number]=[Math.PI/2,0,0])=><mesh key={key} position={[0,y,0]} rotation={rotation}><torusGeometry args={[r,.055,5,40]}/><meshBasicMaterial color={c} transparent opacity={.75}/></mesh>;
 return <group ref={ref}>
 {id==='solkarath'&&<><mesh position={[0,1.4,0]}><icosahedronGeometry args={[.45,1]}/><meshBasicMaterial color="#ffe7a0"/></mesh>{Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return <mesh key={i} position={[Math.cos(a),1.3,Math.sin(a)]} rotation={[0,-a,Math.PI/2]}><coneGeometry args={[.15,1,5]}/><meshBasicMaterial color="#ff9b57"/></mesh>;})}{ring(1.2,.15,7)}</>}
 {id==='thaloryx'&&<>{ring(1.5,.7,0)}{ring(1.8,.1,1)}{Array.from({length:8},(_,i)=><mesh key={i+2} position={[Math.sin(i*.78)*1.5,.7,Math.cos(i*.78)*1.5]}><sphereGeometry args={[.13,8,6]}/><meshBasicMaterial color="#d4fffb" transparent opacity={.65}/></mesh>)}</>}
 {id==='everbloom'&&Array.from({length:12},(_,i)=><group key={i} rotation={[0,i*Math.PI/6,0]}><mesh position={[.6,.3,0]} rotation={[0,0,-.8]}><cylinderGeometry args={[.025,.07,1.6,5]}/><meshBasicMaterial color={i%2?'#e0f3b2':'#82c884'}/></mesh><mesh position={[1.1,.8,0]} rotation={[0,0,-.7]}><octahedronGeometry args={[.19,0]}/><meshBasicMaterial color="#b8e996"/></mesh></group>)}
 {id==='orogantis'&&Array.from({length:6},(_,i)=><mesh key={i} position={[Math.sin(i*Math.PI/3)*1.3,.65,Math.cos(i*Math.PI/3)*1.3]} rotation={[0,i*Math.PI/3,0]}><boxGeometry args={[.8,1.8,.14]}/><meshStandardMaterial color="#d6cfac" emissive="#bfba8f" emissiveIntensity={.6} transparent opacity={.7}/></mesh>)}
 {id==='zephyreon'&&<>{[0,1,2,3,4].map(i=>ring(1.2-i*.15,i*.28,i,i%2?'#f3efd2':color))}<mesh position={[0,1.5,0]}><octahedronGeometry args={[.35,0]}/><meshBasicMaterial color="#f1f8ff"/></mesh></>}
 {id==='iskavelle'&&Array.from({length:9},(_,i)=>{const a=i*Math.PI*2/9;return <mesh key={i} position={[Math.cos(a)*1.2,.5,Math.sin(a)*1.2]} rotation={[.3,0,a]}><coneGeometry args={[.18,1.4,4]}/><meshBasicMaterial color={i%2?'#e6fbff':'#9fd5f3'} transparent opacity={.75}/></mesh>;})}
 {id==='aurelith'&&<>{ring(.85,1.5,0,'#fff1bd',[0,0,0])}{[-1,1].flatMap(side=>Array.from({length:5},(_,i)=><mesh key={`${side}:${i}`} position={[side*(.4+i*.2),1.1-i*.10,0]} rotation={[0,0,side*-.5]}><coneGeometry args={[.1,.85-i*.08,5]}/><meshBasicMaterial color="#f4dd9a" transparent opacity={.8}/></mesh>))}</>}
 {id==='nyxavorn'&&<><mesh position={[0,1,0]}><torusGeometry args={[1,.13,6,32]}/><meshBasicMaterial color="#795d9e"/></mesh><mesh position={[0,1,0]}><circleGeometry args={[.9,32]}/><meshBasicMaterial color="#293148" transparent opacity={.65} side={T.DoubleSide}/></mesh>{Array.from({length:8},(_,i)=><mesh key={i} position={[Math.cos(i*.78)*1.25,1+Math.sin(i*.78)*1.25,0]} rotation={[0,0,i*.78]}><coneGeometry args={[.11,.55,4]}/><meshBasicMaterial color="#d1b7e9"/></mesh>)}</>}
 {id==='pelagryth'&&[0,1,2].map(i=>ring(.65,i*.22,i,i===1?'#e0ffef':'#8ddbd9'))}
 {id==='vortalyx'&&Array.from({length:7},(_,i)=><mesh key={i} position={[Math.sin(i)*.2,i*.19,Math.cos(i)*.2]} rotation={[Math.PI/2,.2,i*.4]}><torusGeometry args={[.4+i*.1,.045,5,28,Math.PI*1.6]}/><meshBasicMaterial color={i%2?'#dacfea':'#b7d4ff'} transparent opacity={.7}/></mesh>)}
 </group>;
}
