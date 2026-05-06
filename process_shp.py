import shapefile
import json
import pyproj

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
    shp_path = 'public/113年原住民保留地範圍圖/113年原住民保留地範圍圖.shp'
    sf = shapefile.Reader(shp_path, encoding='utf-8')
    
    # EPSG:3826 is TWD97 TM2. EPSG:4326 is WGS84.
    transformer = pyproj.Transformer.from_crs("EPSG:3826", "EPSG:4326", always_xy=True)
    
    features = []
    
    for sr in sf.shapeRecords():
        d = sr.record.as_dict()
        if d.get('縣市名') == '花蓮縣' and d.get('鄉鎮名') in ['光復鄉', '萬榮鄉', '鳳林鎮']:
            geom = sr.shape.__geo_interface__
            
            # Transform coordinates
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
    
    out_path = 'public/fataan_reserve.geojson'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False)
        
    print(f"Saved {len(features)} features with WGS84 coordinates to {out_path}")

if __name__ == "__main__":
    main()
