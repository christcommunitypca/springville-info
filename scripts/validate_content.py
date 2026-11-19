#!/usr/bin/env python3
"""Validate content.json before committing to GitHub or deploying to Pages."""
import json, datetime, pathlib, urllib.parse
p=pathlib.Path(__file__).resolve().parents[1]/'data'/'content.json'
data=json.loads(p.read_text(encoding='utf-8'))
for section in ('news','events','directory'):
  seen=set()
  for item in data[section]:
    assert item['id'] not in seen,(section,'duplicate id',item['id'])
    seen.add(item['id'])
    for key in ('sourceUrl',) if section!='directory' else ('website',):
      assert urllib.parse.urlparse(item[key]).scheme=='https',(section,key,item)
    if section=='news':
      assert item['title'] and item['slug'] and item['sourceName'] and item['body']
      datetime.date.fromisoformat(item['date'])
    elif section=='events':
      start=datetime.date.fromisoformat(item['startDate']);end=datetime.date.fromisoformat(item['endDate'])
      assert end>=start,(section,item['id'])
assert data['site']['timezone']=='America/Chicago'
print(f"OK: {len(data['news'])} news, {len(data['events'])} events, {len(data['directory'])} directory items")
