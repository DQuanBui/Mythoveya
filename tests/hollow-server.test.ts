import { afterAll, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HOLLOW_GATHER, hollowOf, HOLLOW_LANTERNS } from "../packages/shared/hollow";
import { byId } from "../packages/shared/content";
import type { Profile } from "../packages/shared/types";
process.env.DB_PATH=join(mkdtempSync(join(tmpdir(),"mythoveya-hollow-")),"save.sqlite");
const {createProfile,operation,authenticate,save,db}=await import("../apps/server/store");
const {mutate}=await import("../apps/server/game");
afterAll(()=>db.close());
function keeper(){const {token}=createProfile("Lantern Keeper",0);operation(token,crypto.randomUUID(),p=>{mutate(p,"starter",{species:"emberfox"});mutate(p,"guide",{});p.region="hollow";});return token;}
const op=(token:string,kind:string,v={},id=crypto.randomUUID())=>operation(token,id,p=>mutate(p,kind,v));
function gather(token:string){for(const n of HOLLOW_GATHER){const o=authenticate(token).owned.find(o=>byId[o.species].element===n.element)!;op(token,"hol-gather",{quest:n.id,id:o.id});}}
it("keeps legacy saves unchanged and makes fresh material inventories independent",()=>{
 const old={} as Profile,a=hollowOf(old),b=hollowOf(old);a.materials.glass=10;
 expect(b.materials.glass).toBe(0);expect(old.hollow).toBeUndefined();
});
it("validates companions and region, gathers once, and crafts atomically without a material softlock",()=>{
 const t=keeper();expect(()=>op(t,"hol-craft")).toThrow("Meet Mira");
 expect(authenticate(t).hollow).toBeUndefined();op(t,"hol-start");
 expect(()=>op(t,"hol-gather",{quest:"glass",id:"forged"})).toThrow("owned Flame");
 expect(()=>op(t,"hol-gather",{quest:"forged"})).toThrow("gathering site");
 expect(()=>op(t,"hol-craft")).toThrow("2 Frostglass");gather(t);
 expect(()=>op(t,"hol-gather",{quest:"glass"})).toThrow("already");
 expect(authenticate(t).hollow!.materials).toEqual({glass:6,reed:3,ember:3});
 const id=crypto.randomUUID();op(t,"hol-craft",{},id);op(t,"hol-craft",{},id);
 expect(authenticate(t).hollow!.lanterns).toBe(1);
 op(t,"hol-craft");op(t,"hol-craft");
 expect(authenticate(t).hollow!.materials).toEqual({glass:0,reed:0,ember:0});
 expect(()=>op(t,"hol-craft")).toThrow("already");
 const p=authenticate(t);p.region="haven";save(p);
 expect(()=>op(t,"hol-craft")).toThrow("Travel to Moonfrost");
});
