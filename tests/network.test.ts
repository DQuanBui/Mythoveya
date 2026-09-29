import {beforeAll,afterAll,it,expect} from 'vitest';
import {spawn,type ChildProcess} from 'node:child_process';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Client,type Room} from '@colyseus/sdk';
import {autoAction} from '../packages/shared/combat';
import type {Battle} from '../packages/shared/types';
const port=27861,base=`http://127.0.0.1:${port}`,file=join(mkdtempSync(join(tmpdir(),'mythoveya-network-')),'save.sqlite');let server:ChildProcess;const rooms:Room[]=[];let output='';
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function start(){server=spawn(process.execPath,['--import','tsx','apps/server/index.ts'],{env:{...process.env,SERVER_PORT:String(port),DB_PATH:file},stdio:['ignore','pipe','pipe'],windowsHide:true});server.stdout!.on('data',d=>output+=d.toString());server.stderr!.on('data',d=>output+=d.toString());for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)return;}catch{}await delay(100);}throw Error(output);}
async function stop(){if(server.exitCode!==null)return;await new Promise<void>(resolve=>{server.once('exit',()=>resolve());server.kill();});}
beforeAll(start,20000);afterAll(async()=>{for(const r of rooms)if(r.connection.isOpen)await r.leave();await stop();});
async function post(path:string,body:any,token=''){const r=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)});const v=await r.json();if(!r.ok)throw Error(v.error);return v;}
const profile=(token:string)=>fetch(base+'/api/profile',{headers:{Authorization:'Bearer '+token}}).then(r=>r.json());
async function guest(name:string){const g=await post('guest',{name,avatar:0});for(const data of [{kind:'starter',species:'emberfox'},{kind:'guide'}])await post('mutate',{...data,requestId:crypto.randomUUID()},g.token);return g;}
it('completes ranked human play with legal server windows, reconnect and exactly-once ratings',async()=>{
 const p=await guest('Network One'),q=await guest('Network Two');const c=new Client(base);let a=await c.joinOrCreate('arena',{token:p.token,mode:'tactical',ranked:true});const b=await new Client(base).joinOrCreate('arena',{token:q.token,mode:'tactical',ranked:true});rooms.push(a,b);expect(a.roomId).toBe(b.roomId);let one:any,two:any;const errors:string[]=[];a.onMessage('snapshot',s=>one=s);b.onMessage('snapshot',s=>two=s);a.onMessage('error',e=>errors.push(e));b.onMessage('error',e=>errors.push(e));a.send('ready');b.send('ready');
 for(let i=0;i<50&&!one?.battle;i++)await delay(50);expect(one.battle).toBeTruthy();const starting=structuredClone(one.battle.units);
 const actor=one.battle.units.find((u:any)=>u.id===one.battle.queue[0]);const wrong=actor.side===0?b:a;wrong.send('action',{action:0,target:'0:0',sequence:0});await delay(100);expect(errors.length).toBeGreaterThan(0);expect(one.battle.sequence).toBe(0);
 // A roster edit after ready cannot alter the snapshot used by this battle.
 const saved=await profile(p.token);await post('mutate',{kind:'formation',team:[...saved.team].reverse(),requestId:crypto.randomUUID()},p.token);expect(one.battle.units).toEqual(starting);
 const reconnectToken=a.reconnectionToken;a.reconnection.enabled=false;a.connection.close();await delay(150);a=await new Client(base).reconnect(reconnectToken);rooms.push(a);a.onMessage('snapshot',s=>one=s);a.onMessage('error',e=>errors.push(e));a.send('sync');await delay(150);expect(one.battle.sequence).toBe(0);
 let turns=0;while(one.battle.winner===null&&turns++<310){const state=one.battle as Battle;await delay(Math.max(20,state.readyAt-Date.now()+25));const choice=autoAction(state);const side=state.units.find(u=>u.id===state.queue[0])!.side;const sequence=state.sequence;(side===0?a:b).send('action',{...choice,sequence});for(let i=0;i<100&&one.battle.sequence===sequence&&one.battle.winner===null;i++)await delay(20);expect(one.battle.sequence).toBeGreaterThan(sequence);}
 expect(one.battle.winner).not.toBeNull();await delay(100);expect(two.battle).toEqual(one.battle);const pp=await profile(p.token),qq=await profile(q.token);expect(pp.ranked.tactical).toBe(1);expect(qq.ranked.tactical).toBe(1);expect(pp.ratings.tactical+qq.ratings.tactical).toBe(2000);expect(pp.ranked.power).toBe(0);a.send('forfeit');b.send('forfeit');await delay(100);expect((await profile(p.token)).ratings).toEqual(pp.ratings);await a.leave();await b.leave();
 await stop();await start();expect(await profile(p.token)).toEqual(pp);
},240000);
