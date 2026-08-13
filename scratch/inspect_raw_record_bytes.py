import shapefile

shp_path = 'dist/107年花蓮光復/U花蓮縣_光復.shp'
# Open without decoding (raw bytes) by not passing encoding or using 'latin1'
sf = shapefile.Reader(shp_path, encoding='latin1')

fields = sf.fields
records = sf.records()

field_names = [f[0] for f in fields[1:]]

# Let's inspect the second record (index 1) which had non-ascii values in field 6 (the 7th field, '資料來')
rec = records[1]
for i, (name, val) in enumerate(zip(field_names, rec)):
    name_bytes = name.encode('latin1')
    print(f"Field {i} (name bytes: {name_bytes.hex()}):")
    if isinstance(val, str):
        # Convert back to bytes from latin1
        b_val = val.encode('latin1')
        print(f"  raw bytes: {b_val.hex()}")
        # Try decoding as cp950
        try:
            print(f"  as cp950: {b_val.decode('cp950')}")
        except Exception as e:
            print(f"  cp950 failed: {e}")
            
        # Try decoding as utf-8
        try:
            print(f"  as utf-8: {b_val.decode('utf-8')}")
        except Exception as e:
            print(f"  utf-8 failed: {e}")
            
        # Try decoding as big5
        try:
            print(f"  as big5: {b_val.decode('big5')}")
        except Exception as e:
            print(f"  big5 failed: {e}")
