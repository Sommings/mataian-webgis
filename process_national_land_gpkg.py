import geopandas as gpd
import json
import os
import time
import re

gpkg_path = r"C:\Users\sommi\Downloads\花蓮縣國有土地.gpkg"
out_dir = r"public"
os.makedirs(out_dir, exist_ok=True)
out_geojson = os.path.join(out_dir, "hualien_national_land.geojson")

print("Reading GPKG with GeoPandas...")
t0 = time.time()
gdf = gpd.read_file(gpkg_path)
print(f"Loaded {len(gdf)} features in {time.time()-t0:.2f}s")

if gdf.crs != "EPSG:4326":
    print("Reprojecting to EPSG:4326...")
    gdf = gdf.to_crs(epsg=4326)

print("Simplifying geometry...")
gdf.geometry = gdf.geometry.simplify(0.00004, preserve_topology=True)

# Keep relevant columns and rename to short keys for web optimization
cols = ['geometry', '縣市', '鄉鎮市區', '段代碼', '段小段', '地號原碼', '地號', '登記面積_m2', '登記面積_ha', '管理機關', '所有權人']
gdf = gdf[cols]
gdf = gdf.rename(columns={
    '縣市': 'c',
    '鄉鎮市區': 't',
    '段代碼': 'sc',
    '段小段': 'sn',
    '地號原碼': 'rn',
    '地號': 'n',
    '登記面積_m2': 'm2',
    '登記面積_ha': 'ha',
    '管理機關': 'm',
    '所有權人': 'o'
})

print("Exporting GeoJSON...")
t1 = time.time()
s = gdf.to_json(show_bbox=False, drop_id=True)
# Round coordinates to 5 decimal places (~1 meter precision)
s = re.sub(r'(\d+\.\d{5})\d+', r'\1', s)
geojson_bytes = s.encode('utf-8')
print(f"Generated GeoJSON in {time.time()-t1:.2f}s, size: {len(geojson_bytes)/1024/1024:.2f} MB")

print(f"Writing to {out_geojson}...")
with open(out_geojson, 'wb') as f:
    f.write(geojson_bytes)

size_mb = os.path.getsize(out_geojson) / 1024 / 1024
print(f"Finished! Output file size: {size_mb:.2f} MB")
