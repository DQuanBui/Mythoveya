import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import type {Profile} from '../../packages/shared/types';
import {day,resetDaily} from '../../packages/shared/economy';
const path=process.env.DB_PATH||'data/mythoveya.sqlite';mkdirSync(dirname(path),{recursive:true});
export const db=new DatabaseSync(path);db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY, token TEXT UNIQUE NOT NULL, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS operations(profile TEXT, id TEXT, result TEXT, PRIMARY KEY(profile,id)); CREATE TABLE IF NOT EXISTS matches(id TEXT PRIMARY KEY, result TEXT NOT NULL); PRAGMA user_version=1;');
const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
export function createProfile(name:string,avatar:number){const id=randomUUID(),token=randomBytes(32).toString('hex');const p:Profile={id,name,avatar,version:1,level:1,xp:0,gold:200,diamonds:0,tokens:3,owned:[],team:[],pity:{as:0,s:0},quests:{},claims:[],daily:{date:day(),wins:0,train:0,resources:0,claimed:false},ratings:{power:1000,tactical:1000},ranked:{power:0,tactical:0},wins:0,region:'haven',resources:[],bosses:[]};db.prepare('INSERT INTO profiles VALUES(?,?,?)').run(id,hash(token),JSON.stringify(p));return {token,profile:p};}
export function authenticate(token:string){const row=db.prepare('SELECT data FROM profiles WHERE token=?').get(hash(token)) as {data:string}|undefined;if(!row)throw Error('Session expired. Create a new guest or restore your original browser token.');const p=JSON.parse(row.data) as Profile;resetDaily(p);return p;}
export function getProfile(id:string){const row=db.prepare('SELECT data FROM profiles WHERE id=?').get(id) as {data:string}|undefined;if(!row)throw Error('Profile not found');const p=JSON.parse(row.data) as Profile;resetDaily(p);return p;}
export function save(p:Profile){db.prepare('UPDATE profiles SET data=? WHERE id=?').run(JSON.stringify(p),p.id);}
export function atomic<T>(work:()=>T):T{db.exec('BEGIN IMMEDIATE');try{const result=work();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
export function operation(token:string,id:string,work:(p:Profile)=>unknown){return atomic(()=>{const p=authenticate(token);const previous=db.prepare('SELECT result FROM operations WHERE profile=? AND id=?').get(p.id,id) as {result:string}|undefined;if(previous)return JSON.parse(previous.result);const value=work(p);save(p);const result={profile:p,value};db.prepare('INSERT INTO operations VALUES(?,?,?)').run(p.id,id,JSON.stringify(result));return result;});}
export function allProfiles(){return (db.prepare('SELECT data FROM profiles').all() as {data:string}[]).map(r=>JSON.parse(r.data) as Profile);}
