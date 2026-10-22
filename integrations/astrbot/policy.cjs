function deliveryAllowed(p,cfg){return p.kind==='private'&&p.selfId===cfg.instance&&p.platform==='qq_official'&&p.channelId==='private:'+cfg.owner;}
function contactAllowed({reactive,enabled,hour,count,last,now,policy={}}){
 const start=policy.startHour??9,end=policy.endHour??22,cap=policy.dailyCap??2,gap=policy.minIntervalMinutes??180;
 const inWindow=start<=end?(hour>=start&&hour<end):(hour>=start||hour<end);
 return reactive||(enabled&&inWindow&&count<cap&&now-last>=gap*60000);
}
function validReceipt(status,ids){return ['sent','unknown','permanent-failed','retryable-failed'].includes(status)&&(status!=='sent'||Array.isArray(ids)&&ids.length>0);}
function scrub(text,redactions){for(const terms of Object.values(redactions||{}))for(const term of terms)if(term)text=text.split(term).join('[已删除的用户资料]');return text;}
module.exports={deliveryAllowed,contactAllowed,validReceipt,scrub};
