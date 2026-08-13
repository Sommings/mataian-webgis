import sqlite3
import geopandas as gpd
import json
import os

gpkg_path = r"C:\Users\sommi\Downloads\taisugar_to_gpkg_bundle\taisugar_花蓮縣.gpkg"
output_geojson = r"public\taisugar_hualien.geojson"

print("Reading GPKG with GeoPandas...")
gdf = gpd.read_file(gpkg_path)

# Reproject to WGS84 EPSG:4326
if gdf.crs != "EPSG:4326":
    print("Reprojecting to EPSG:4326...")
    gdf = gdf.to_crs(epsg=4326)

# Direct SQLite fetch for raw UTF-8 string decoding to prevent any Fiona locale misdecoding
conn = sqlite3.connect(gpkg_path)
conn.text_factory = bytes
cursor = conn.cursor()
cursor.execute("SELECT fid, LandUsageZoneName, RevitalizationMethodName FROM taisugar_land_revitalization")
raw_attrs = cursor.fetchall()
attr_map = {}
for fid, zb, mb in raw_attrs:
    z_str = zb.decode('utf-8', errors='ignore') if zb else ""
    m_str = mb.decode('utf-8', errors='ignore') if mb else ""
    attr_map[fid] = (z_str, m_str)

# Convert GeoDataFrame to GeoJSON dict structure manually for complete UTF-8 precision
geojson_dict = {
    "type": "FeatureCollection",
    "name": "taisugar_hualien",
    "crs": {
        "type": "name",
        "properties": {
            "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
        }
    },
    "features": []
}

# Dump geometries to json
gdf_geojson = json.loads(gdf.to_json())

for idx, feature in enumerate(gdf_geojson["features"]):
    fid = feature["id"] if "id" in feature else idx + 1
    # Try fid lookup or fallback
    if fid in attr_map:
        z_val, m_val = attr_map[fid]
    else:
        # Match by index
        z_val, m_val = raw_attrs[idx][1].decode('utf-8', errors='ignore'), raw_attrs[idx][2].decode('utf-8', errors='ignore')
    
    feature["properties"] = {
        "LandUsageZoneName": z_val,
        "RevitalizationMethodName": m_val,
        "RevitalizartionMethodName": m_val # Keep alternative spelling requested by prompt
    }
    geojson_dict["features"].append(feature)

os.makedirs("public", exist_ok=True)
with open(output_geojson, "w", encoding="utf-8") as f:
    json.dump(geojson_dict, f, ensure_ascii=False, indent=2)

print(f"Successfully generated {output_geojson} with {len(geojson_dict['features'])} features.")
