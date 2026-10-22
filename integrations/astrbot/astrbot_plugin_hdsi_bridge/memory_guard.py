"""Derive literal recall exclusions only from actually deleted user records."""
import re

def exclusions(records,blocked):
    result={}
    for row in records:
        topic=row['kind']+':'+row['key']
        if topic not in blocked:continue
        texts=[row.get('text',''),row.get('origin_text','')]
        texts += [h.get('text','') for h in row.get('history',[]) if isinstance(h,dict)]
        values=set(t for t in texts if t)
        for text in texts:
            for found in re.findall(r'(?:改名为|改成|名字(?:叫|是|为)|名称(?:是|为)|叫|喜欢(?:喝|吃|用)?|偏好(?:是|为)?)\s*([^。！？，,;；\n]+)',text):
                value=found.strip(' “”。')
                if 2<=len(value)<=48 and value not in ('小路','四时小路','用户','自己'):values.add(value)
        result[topic]=sorted(values,key=len,reverse=True)
    return result
