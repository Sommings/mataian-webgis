import json
import re

def norm(s):
    s = re.sub(r'[０-９]', lambda m: chr(ord(m.group(0)) - 0xFEE0), s)
    s = s.replace('台', '臺').replace(' ', '')
    return s

def main():
    db = json.load(open('public/address_db.json', encoding='utf-8'))
    
    matches_all = [norm(d['a']) for d in db if '光復鄉' in d['a'] and '中山路' in d['a']]
    
    # Filter only those that start with 中山路三段
    seg3 = [a for a in matches_all if '中山路三段' in a]
    
    with open('zhongshan.txt', 'w', encoding='utf-8') as f:
        f.write("All 中山路三段:\n")
        f.write("\n".join(seg3))
    
if __name__ == "__main__":
    main()
