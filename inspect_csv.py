import csv
import json

def main():
    with open('public/三鄉 門牌點位.csv', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        sample = [next(reader) for _ in range(3)]
        
    with open('test_headers.json', 'w', encoding='utf-8') as out:
        json.dump(sample, out, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
