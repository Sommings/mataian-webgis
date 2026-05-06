import csv
import json
import pyproj

def main():
    transformer = pyproj.Transformer.from_crs("EPSG:3826", "EPSG:4326", always_xy=True)
    
    addresses = []
    
    with open('public/三鄉 門牌點位.csv', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            address = row.get("完整地址", "").strip()
            x_str = row.get("橫座標", "").strip()
            y_str = row.get("縱座標", "").strip()
            
            if not address or not x_str or not y_str:
                continue
                
            try:
                x = float(x_str)
                y = float(y_str)
                lon, lat = transformer.transform(x, y)
                # Keep 5 decimal places for coordinates (~1 meter accuracy)
                addresses.append({
                    "a": address,
                    "x": round(lon, 5),
                    "y": round(lat, 5)
                })
            except ValueError:
                pass
                
    with open('public/address_db.json', 'w', encoding='utf-8') as out:
        json.dump(addresses, out, ensure_ascii=False, separators=(',', ':'))

    print(f"Processed {len(addresses)} addresses.")

if __name__ == "__main__":
    main()
