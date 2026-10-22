"""Exercise the production receive method after wake-prefix normalization, without transport."""
import ast,asyncio,importlib.util,re,unittest
from pathlib import Path
from types import SimpleNamespace
root=Path(__file__).parent
spec=importlib.util.spec_from_file_location('command_text',root/'command_text.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
tree=ast.parse((root/'main.py').read_text('utf-8'))
receive=next(n for cls in tree.body if isinstance(cls,ast.ClassDef) for n in cls.body if isinstance(n,ast.AsyncFunctionDef) and n.name=='receive')
receive.decorator_list=[]
module=ast.Module(body=[receive],type_ignores=[]);ast.fix_missing_locations(module)
ns={'AstrMessageEvent':object,'restore_command_prefix':mod.restore_command_prefix,'re':re}
exec(compile(module,str(root/'main.py'),'exec'),ns)

class Commands(unittest.IsolatedAsyncioTestCase):
    async def run_command(self,normalized,raw,selected=True):
        calls=[];sent=[];stopped=[]
        async def select(_):return selected
        async def host(route,data=None):
            calls.append((route,data))
            if route=='/evolution':return {'patches':[],'emotion':None}
            if route=='/revoke':return {'revoked':True}
            raise AssertionError('Management command entered narration')
        async def send(message):sent.append(message)
        event=SimpleNamespace(message_str=normalized,message_obj=SimpleNamespace(message_str=raw),stop_event=lambda:stopped.append(True),plain_result=lambda s:s,send=send)
        await ns['receive'](SimpleNamespace(selected=select,host=host),event)
        return calls,sent,stopped
    async def test_qq_stripped_slash_routes_to_status_without_model(self):
        calls,sent,stopped=await self.run_command('幕间 状态','/幕间 状态')
        self.assertEqual(calls,[('/evolution',None)]);self.assertTrue(stopped);self.assertIn('演化记录：',sent[0])
    async def test_unstripped_command_still_works(self):
        calls,sent,_=await self.run_command('/幕间 演化','/幕间 演化')
        self.assertEqual(calls,[('/evolution',None)]);self.assertIn('暂无持续偏移',sent[0])
    async def test_revoke_after_normalization(self):
        calls,sent,_=await self.run_command('幕间 撤销 7','/幕间 撤销 7')
        self.assertEqual(calls,[('/revoke',{'id':7})]);self.assertIn('已撤销',sent[0])
    async def test_unselected_conversation_has_no_effect(self):
        self.assertEqual(await self.run_command('幕间 状态','/幕间 状态',False),([],[],[]))
    def test_no_invented_command_prefix(self):
        self.assertEqual(mod.restore_command_prefix('幕间是什么','幕间是什么'),'幕间是什么')
        self.assertEqual(mod.restore_command_prefix('different','/幕间 状态'),'different')
        self.assertEqual(mod.restore_command_prefix('个人记忆 查看','/个人记忆 查看'),'/个人记忆 查看')

if __name__=='__main__':unittest.main()
