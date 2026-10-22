import unittest,importlib.util
import asyncio
from unittest.mock import patch
from pathlib import Path
spec=importlib.util.spec_from_file_location('music_share',Path(__file__).with_name('music_share.py'))
music=importlib.util.module_from_spec(spec);spec.loader.exec_module(music)

class ShareTests(unittest.TestCase):
    def test_metadata_is_not_audio(self):
        r=music.parse_share('分享 https://music.163.com/#/song?id=123')
        self.assertEqual(r['song_id'],'123');self.assertFalse(r['audio_analyzed']);self.assertEqual(r['status'],'shared')
    def test_untrusted_host_does_not_get_fetched(self):
        for url in ['http://127.0.0.1/song?id=1','https://music.163.com.evil.test/song?id=1','https://music.163.com@evil.test/song?id=1']:
            self.assertIsNone(music.parse_share(url))
    def test_title_only_and_unrelated_titles(self):
        self.assertEqual(music.parse_share('分享歌曲《晚风》')['titles'],['晚风'])
        self.assertIsNone(music.parse_share('今天读《一本书》'))
    def test_qq_title_is_shared_without_claimed_metadata(self):
        r=music.parse_share('https://y.qq.com/n/ryqq/songDetail/example')
        self.assertIsNone(r['song_id']);self.assertEqual(r['status'],'shared')
    def test_metadata_title_conflict_and_no_audio(self):
        class Response:
            content=b'{}'
            def raise_for_status(self):pass
            def json(self):return {'songs':[{'id':123,'name':'Link title','artists':[{'name':'Artist'}]}]}
        class Client:
            def __init__(self,**kwargs):pass
            async def __aenter__(self):return self
            async def __aexit__(self,*args):pass
            async def get(self,url,params):
                assert url=='https://music.163.com/api/song/detail/'
                assert params=={'ids':'[123]'}
                return Response()
        with patch.object(music.httpx,'AsyncClient',Client):
            item=asyncio.run(music.describe_share('歌曲《User title》 https://music.163.com/song?id=123'))
        self.assertEqual(item['status'],'metadata_read');self.assertTrue(item['title_conflict']);self.assertFalse(item['audio_analyzed'])
        self.assertEqual(item['titles'],['User title']);self.assertEqual(item['metadata']['title'],'Link title')

if __name__=='__main__':unittest.main()
