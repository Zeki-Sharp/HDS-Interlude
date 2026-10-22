import assert from 'node:assert/strict'
import test from 'node:test'
import { InterludeService } from '../src/service'
const proto=InterludeService.prototype as any
const now=new Date('2026-10-22T12:00:00Z')
function harness(path='preferences',allowed=['character.preferences']) {
  const rows=Array.from({length:4},(_,i)=>({id:i+1,kind:'script',actor:'narrator',participantId:'',occurredAt:new Date(now.getTime()-i*86400000),metadata:{frameId:'f'+i}}))
  const proposals:any[]=[]
  let rebuilt=0
  const host:any={memoryConfig:{autoApplyStatePatches:true,allowMajorStateChanges:false,autoApplyPaths:allowed,statePatchMinTurns:3,statePatchMinDays:2,statePatchConfidenceThreshold:.8,majorStatePatchConfidenceThreshold:.9,statePatchCooldownHours:72},
    dbGet:async(table:string,q:any)=>table==='interlude_state_patch'?proposals.filter(p=>(!q.status||p.status===q.status)&&(!q.storyId||p.storyId===q.storyId)&&(!q.id||q.id===p.id)):rows.filter(r=>q.id.$in.includes(r.id)),
    dbCreate:async(_t:string,v:any)=>{const p={...v,id:proposals.length+1};proposals.push(p);return p},
    dbSet:async(_t:string,q:any,v:any)=>Object.assign(proposals.find(p=>p.id===q.id),v),
    reportOperation:()=>{},rebuildLiveOverlayState:async()=>{rebuilt++},invalidateBufferedNarratives:()=>{},serial:async(_s:string,fn:any)=>fn(),getStory:async()=>({id:'s'})}
  const call=(ids:number[],impact='minor')=>proto.persistStatePatch.call(host,{id:'s',setting:{timezone:'Asia/Shanghai'}},{target:'character',path,proposedValue:'倾向慢慢阅读短篇故事',evidence:'multiple separate observations',sourceEntryIds:ids,confidence:.96,impact},rows,now)
  return {host,proposals,call,rebuilt:()=>rebuilt}
}
test('allowed preference accumulates evidence and can be revoked without losing evidence',async()=>{
 const h=harness();await h.call([1,2,3]);assert.equal(h.proposals[0].status,'proposed');await h.call([4]);assert.equal(h.proposals[0].status,'applied');
 const evidence=[...h.proposals[0].sourceEntryIds];assert.equal(await proto.revokeAdminStatePatch.call(h.host,{id:'other'},1),false);
 assert.equal(await proto.revokeAdminStatePatch.call(h.host,{id:'s'},1),true);assert.equal(h.proposals[0].status,'cleared');assert.deepEqual(h.proposals[0].sourceEntryIds,evidence);assert.equal(h.rebuilt(),2);
 assert.equal(await proto.revokeAdminStatePatch.call(h.host,{id:'s'},1),false);
})
test('core traits remain proposals despite enough evidence',async()=>{const h=harness('traits');await h.call([1,2,3]);await h.call([4]);assert.equal(h.proposals[0].status,'proposed')})
test('major proposal cannot be downgraded by a later minor draft',async()=>{const h=harness();await h.call([1,2,3],'major');await h.call([4],'minor');assert.equal(h.proposals[0].impact,'major');assert.equal(h.proposals[0].status,'proposed')})
test('empty allowlist retains upstream default behavior',async()=>{const h=harness('traits',[]);await h.call([1,2,3]);await h.call([4]);assert.equal(h.proposals[0].status,'applied')})
