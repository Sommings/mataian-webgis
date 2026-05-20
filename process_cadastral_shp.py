import shapefile
import json
import pyproj
import os

def transform_coords(coords, transformer):
    if not coords:
        return coords
    
    if isinstance(coords[0], (int, float)):
        # It's a point [x, y]
        lon, lat = transformer.transform(coords[0], coords[1])
        return [lon, lat]
    else:
        # It's a list of points/rings/polygons
        return [transform_coords(c, transformer) for c in coords]

def main():
    shp_path = 'c:/Users/sommi/Downloads/Fata-an-WebGIS-main/Fata-an-WebGIS-main/dist/107年花蓮光復/U花蓮縣_光復.shp'
    if not os.path.exists(shp_path):
        shp_path = 'dist/107年花蓮光復/U花蓮縣_光復.shp'
        
    print(f"Checking if file exists: {os.path.exists(shp_path)}")
    
    # Try UTF-8 first, as we verified the DBF headers/records are UTF-8.
    encodings = ['utf-8', 'cp950']
    sf = None
    used_encoding = None
    for enc in encodings:
        try:
            sf = shapefile.Reader(shp_path, encoding=enc, encodingErrors='ignore')
            # Test read a record
            fields = sf.fields
            records = sf.records()
            if records:
                print(f"Successfully loaded using encoding: {enc}")
                used_encoding = enc
                break
        except Exception as e:
            print(f"Failed load with {enc}: {e}")
            sf = None
            
    if not sf:
        print("Error: Could not read Shapefile with any encoding.")
        return

    print("Shapefile fields:")
    print(sf.fields)

    # Standard clean name mapping
    name_map = {
        'PMNO': '母號',
        'PCNO': '子號',
        'SCNO': '段號_SCNO',
        'SCNOEXT': '段號擴展',
        '段號': '段號',
        '匯出日': '匯出日',
        '資料來': '資料來源',
        'AA48': '地段代碼',
        'AA49': '地號',
        '標示部': '標示部',
        'AA05': '地段名_AA05',
        'AA06': '等則',
        'AA08': '編定使用類別',
        'AA09': '使用分區代碼',
        'AA10': '面積',
        'AA11': '登記日期代碼',
        'AA12': '登記原因代碼',
        'AA16': '公告土地現值',
        'AA17': '公告地價',
        'AA45': '縣市名代碼',
        'AA46': '鄉鎮市區代碼',
        'CTY': '縣市名代碼_CTY',
        'UNIT': '地政事務所代碼'
    }

    # Match fields to values and sample
    if sf.records():
        print("First record properties sample:")
        first_rec = sf.records()[0]
        field_names = [f[0] for f in sf.fields[1:]]
        sample_dict = {}
        for name, val in zip(field_names, first_rec):
            clean_name = name_map.get(name, name)
            sample_dict[clean_name] = val
        print(sample_dict)

    # EPSG:3826 is TWD97 TM2. EPSG:4326 is WGS84.
    transformer = pyproj.Transformer.from_crs("EPSG:3826", "EPSG:4326", always_xy=True)
    
    features = []
    
    for sr in sf.shapeRecords():
        d = {}
        for field, value in zip(sf.fields[1:], sr.record):
            name = field[0]
            clean_name = name_map.get(name, name)
            
            if isinstance(value, bytes):
                try:
                    value = value.decode(used_encoding, errors='ignore').strip()
                except:
                    value = value.decode('utf-8', errors='ignore').strip()
            elif isinstance(value, str):
                value = value.strip()
            
            d[clean_name] = value
            
        geom = sr.shape.__geo_interface__
        geom['coordinates'] = transform_coords(geom['coordinates'], transformer)
        
        feature = {
            "type": "Feature",
            "geometry": geom,
            "properties": d
        }
        features.append(feature)
            
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    out_path = 'public/hualien_guangfu_107.geojson'
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False)
        
    print(f"Saved {len(features)} features with WGS84 coordinates to {out_path}")

if __name__ == "__main__":
    main()
