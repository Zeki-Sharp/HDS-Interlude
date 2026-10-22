const test=require('node:test');const assert=require('node:assert/strict');
const {deliveryAllowed,contactAllowed,validReceipt}=require('./policy.cjs');
const {scrub}=require('./policy.cjs');
const cfg={instance:'qq-test',owner:'user-a'};const p={kind:'private',platform:'qq_official',selfId:'qq-test',channelId:'private:user-a'};
test('exact private identity only',()=>{assert(deliveryAllowed(p,cfg));for(const change of [{kind:'group'},{selfId:'other'},{platform:'onebot'},{channelId:'private:user-b'},{channelId:'group:user-a'}])assert(!deliveryAllowed({...p,...change},cfg));});
test('quiet hours and proactive caps',()=>{const x={reactive:false,enabled:true,hour:12,count:0,last:0,now:20000000};assert(contactAllowed(x));for(const c of [{hour:8},{hour:22},{enabled:false},{count:2},{last:19999999}])assert(!contactAllowed({...x,...c}));assert(contactAllowed({...x,hour:23,reactive:true}));});
test('receipt requires accepted message id',()=>{assert(!validReceipt('sent',[]));assert(validReceipt('sent',['platform-id']));assert(validReceipt('unknown',[]));assert(!validReceipt('delivered',[]));});
test('configured contact limits and overnight windows',()=>{
 const x={reactive:false,enabled:true,hour:9,count:3,last:1,now:3600001,policy:{dailyCap:4,minIntervalMinutes:60,startHour:9,endHour:22}};
 assert(contactAllowed(x));assert(!contactAllowed({...x,count:4}));assert(!contactAllowed({...x,now:3600000}));assert(!contactAllowed({...x,hour:22}));
 assert(contactAllowed({...x,hour:1,policy:{...x.policy,startHour:22,endHour:7}}));
 assert(!contactAllowed({...x,hour:12,policy:{...x.policy,startHour:22,endHour:7}}));
});
test('deleted literals are removed across every old occurrence',()=>{const s='过去叫橘色彗星，回复：橘色彗星。';assert(!scrub(s,{name:['橘色彗星']}).includes('橘色彗星'));assert.equal(scrub(s,{}),s);});
