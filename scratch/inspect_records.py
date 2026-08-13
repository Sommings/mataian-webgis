import shapefile
import os

shp_path = 'dist/107年花蓮光復/U花蓮縣_光復.shp'
print(f"File exists: {os.path.exists(shp_path)}")

# Read shapefile
sf = shapefile.Reader(shp_path, encoding='utf-8', encodingErrors='ignore')
print("Shapefile loaded with utf-8 encoding.")

fields = sf.fields
records = sf.records()
print(f"Total records: {len(records)}")

if records:
    rec = records[0]
    field_names = [f[0] for f in fields[1:]]
    for name, val in zip(field_names, rec):
        print(f"Field: {name!r} -> Value: {val!r}")
