// Runs the pinned upstream bundle inside an isolated Koishi process.
const fs = require('node:fs');
const path = require('node:path');
const {Context} = require('koishi');
const {SQLiteDriver} = require('@minatojs/driver-sqlite');
const Http = require('@cordisjs/plugin-http').default;
const cfg = JSON.parse(fs.readFileSync(process.env.HDSI_CONFIG, 'utf8'));
const upstream = require(path.join(cfg.upstream, 'lib/index.js'));
const app = new Context(); app.baseDir = cfg.dataDir;
app.plugin(Http); app.plugin(SQLiteDriver, {path:path.join(cfg.dataDir, 'story.sqlite')});
const options = upstream.Config(cfg.hdsi);
if(cfg.mode==='test')options.runtime.minimumAdvanceMinutes=1;
app.plugin(upstream, options);
let service;
app.inject(['interlude'], async ctx => {
  service=ctx.interlude;
  try {
    const session={platform:'qq_official',selfId:cfg.instance,userId:cfg.owner,username:'泥',channelId:'private:'+cfg.owner,isDirect:true};
    await service.createStory(session);
    process.send({type:'local-ready', version:upstream.version});
  } catch(e) {process.send({type:'local-error',error:String(e)});}
});
process.on('message',async msg=>{
  if(msg.type!=='local-command'||!service)return;
  try {
    let result;
    if(msg.action==='state') {
      const session={platform:'qq_official',selfId:cfg.instance,userId:cfg.owner,isDirect:true};
      const story=await service.findStory(session);
      result={snapshot:await service.desktopRuntimeSnapshot(),story,entries:story?await service.recentEntries(story.id,30):[]};
    } else if(msg.action==='external') {
      const story=await service.findStory({platform:'qq_official',selfId:cfg.instance,userId:cfg.owner,isDirect:true});
      result=await service.addAdminScriptNote(story,msg.text);
    } else if(msg.action==='evolution') {
      const story=await service.findStory({platform:'qq_official',selfId:cfg.instance,userId:cfg.owner,isDirect:true});
      result={overlay:await service.adminOverlayStatus(story.id),patches:await service.adminStatePatches(story.id,50),
        emotion:story.state.alterSystem??null,longHorizon:service.longHorizonPromptProjection(story.id)??null,
        policy:{memory:service.config.memory,alter:service.config.alterSystem,longHorizon:service.config.longHorizon,agency:service.config.agency,worldSeeder:service.config.worldSeeder,schedulePreplan:service.config.schedulePreplan}};
    } else if(msg.action==='revoke') {
      const story=await service.findStory({platform:'qq_official',selfId:cfg.instance,userId:cfg.owner,isDirect:true});
      result={revoked:await service.revokeAdminStatePatch(story,msg.patchId)};
    } else if(msg.action==='setting') {
      const story=await service.findStory({platform:'qq_official',selfId:cfg.instance,userId:cfg.owner,isDirect:true});
      await service.updateSetting(story,msg.setting);result={updated:true};
    } else if(msg.action==='background') {
      service.config.runtime.autoAdvanceEnabled=Boolean(msg.enabled);
      service.config.runtime.allowProactiveMessages=Boolean(msg.enabled);
      result={enabled:Boolean(msg.enabled)};
    } else if(msg.action==='advance') {
      const story=await service.findStory({platform:'qq_official',selfId:cfg.instance,userId:cfg.owner,isDirect:true});
      const messages=await service.advanceStory(story,true);
      const delivered=messages.length?await service.deliverMessages(story,messages):[];
      result={drafts:messages.length,delivered:delivered.length};
    } else if(msg.action==='stop') {await app.stop();process.exit(0);}
    else throw Error('Unknown local command');
    process.send({type:'local-result',id:msg.id,result});
  } catch(e){process.send({type:'local-result',id:msg.id,error:String(e)});}
});
app.start().catch(e=>{process.send({type:'local-error',error:String(e)});process.exitCode=1;});
