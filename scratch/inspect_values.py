import shapefile

shp_path = 'dist/107年花蓮光復/U花蓮縣_光復.shp'
sf = shapefile.Reader(shp_path, encoding='utf-8', encodingErrors='ignore')

fields = sf.fields
records = sf.records()

field_names = [f[0] for f in fields[1:]]
print("Total records:", len(records))

# Find records where field values have non-ascii characters
non_ascii_found = {}
for r_idx, rec in enumerate(records):
    for name, val in zip(field_names, rec):
        if isinstance(val, str) and any(ord(c) > 127 for c in val):
            if name not in non_ascii_found:
                non_ascii_found[name] = []
            if len(non_ascii_found[name]) < 5:
                non_ascii_found[name].append((r_idx, val))

print("Fields containing non-ascii values:")
for name, samples in non_ascii_found.items():
    print(f"Field {name!r}: samples: {samples}")
