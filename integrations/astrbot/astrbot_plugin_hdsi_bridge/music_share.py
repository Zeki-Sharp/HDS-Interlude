"""Read-only music metadata. Never treats a URL or playback receipt as listening."""
import re
from urllib.parse import urlparse
import httpx

def parse_share(text):
    urls=re.findall(r'https?://[^\s<>"，。]+',text)
    links=[];song_id=None
    for url in urls:
        p=urlparse(url)
        if p.scheme not in ('https','http') or p.hostname not in ('music.163.com','y.music.163.com','c6.y.qq.com','y.qq.com'):continue
        links.append(url)
        if p.hostname in ('music.163.com','y.music.163.com'):
            match=re.search(r'(?:[?&]id=|/song/)(\d+)',url)
            if match:song_id=match.group(1)
    titles=re.findall(r'《([^》]{1,100})》',text)
    if not links and not (titles and re.search('歌|音乐|听|专辑',text)):return None
    return {'status':'shared','titles':titles,'links':links,'song_id':song_id,
            'source':'user_message','audio_analyzed':False}

async def describe_share(text):
    item=parse_share(text)
    if not item:return None
    if item['song_id']:
        try:
            async with httpx.AsyncClient(timeout=8,trust_env=False,follow_redirects=False) as client:
                r=await client.get('https://music.163.com/api/song/detail/',params={'ids':'['+item['song_id']+']'})
                if len(r.content)>1000000:raise ValueError('Metadata too large')
                r.raise_for_status();songs=r.json().get('songs',[])
                song=next((s for s in songs if str(s.get('id'))==item['song_id']),None)
                if song:
                    item['metadata']={'title':str(song.get('name',''))[:200],
                      'artists':[str(a.get('name',''))[:100] for a in song.get('artists',[])[:8]]}
                    item['status']='metadata_read'
                    item['title_conflict']=bool(item['titles'] and item['metadata']['title'] not in item['titles'])
        except Exception:item['metadata_unavailable']=True
    item['rule']='仅确认用户分享和已读取的歌曲元信息；title_conflict 为真时，用户所称歌名与链接查询歌名不一致，应说明差异，不能合并为同一首歌。没有分析音频，不得声称实际听过旋律、音色或编曲。可形成待了解兴趣和虚拟计划，不能伪造现实听感或承诺稍后实际分析音频。歌词需用户提供或工具实际读到，歌名和元信息不证明已读歌词。'
    return item
