import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.DB_PATH=join(mkdtempSync(join(tmpdir(),'mythoveya-test-')),'save.sqlite');
const store=await import('../apps/server/store');
const game=await import('../apps/server/game');
const {gainXp,resetDaily,formation}=await import('../packages/shared/economy');
const {createProfile,operation,authenticate,db,getProfile,save}=store;
const op=(token:string,kind:string,data:any={},requestId=crypto.randomUUID())=>operation(token,requestId,p=>game.mutate(p,kind,data));
afterAll(()=>db.close());
describe('durable economy',()=>{
it('uses opaque tokens and grants the first six once',()=>{const {token,profile}=createProfile('Keeper',0);expect(()=>authenticate(profile.id)).toThrow();op(token,'starter',{species:'emberfox'});op(token,'guide');op(token,'guide');const p=authenticate(token);expect(p.team).toHaveLength(6);expect(p.owned).toHaveLength(6);expect(()=>op(token,'starter',{species:'thornhare'})).toThrow();});
it('atomically deduplicates recruitment and rolls back insufficient funds',async()=>{const {token,profile}=createProfile('Recruiter',1);const p=getProfile(profile.id);p.diamonds=1000;save(p);const requestId=crypto.randomUUID();const results=await Promise.all(Array.from({length:8},()=>Promise.resolve(op(token,'recruit',{count:10},requestId))));expect(results.every(r=>JSON.stringify(r)===JSON.stringify(results[0]))).toBe(true);expect(authenticate(token).diamonds).toBe(0);const before=authenticate(token);expect(()=>op(token,'recruit',{count:1})).toThrow('Not enough');expect(authenticate(token)).toEqual(before);});
it('claims quests once and validates formation ownership',()=>{const {token,profile}=createProfile('Explorer',2);const p=getProfile(profile.id);p.wins=1;save(p);op(token,'claim',{quest:'tutorial'});expect(authenticate(token).diamonds).toBe(600);expect(()=>op(token,'claim',{quest:'tutorial'})).toThrow();expect(()=>formation(p,Array(6).fill('forged'))).toThrow();});
it('keeps excess creature XP and resets daily state by server UTC date',()=>{const {token}=createProfile('Trainer',3);op(token,'starter',{species:'ripplefin'});op(token,'guide');const p=authenticate(token);p.owned[0].xp=500;gainXp(p,0);expect(p.owned[0].xp).toBe(500);expect(p.owned[0].level).toBe(1);gainXp(p,100);expect(p.level).toBe(2);expect(p.owned[0].level).toBe(2);expect(p.owned[0].xp).toBeGreaterThan(0);p.daily.date='2000-01-01';p.daily.wins=3;resetDaily(p);expect(p.daily.wins).toBe(0);expect(p.daily.date).toBe(new Date().toISOString().slice(0,10));});
it('persists completed PvE rewards only once',()=>{const {token,profile}=createProfile('Battler',0);op(token,'starter',{species:'emberfox'});op(token,'guide');const b=game.startPve(authenticate(token),false);b.winner=0;game.finishPve(profile.id,b);const after=authenticate(token);game.finishPve(profile.id,b);expect(authenticate(token)).toEqual(after);expect(after.wins).toBe(1);expect(after.bond?.used).toBe(false);op(token,'bond');expect(()=>op(token,'bond')).toThrow('No wild bond');});
});
