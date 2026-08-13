import os

dbf_path = 'dist/107年花蓮光復/U花蓮縣_光復.dbf'
print(f"File exists: {os.path.exists(dbf_path)}")

# Read using dbfread without decoding, or open raw
with open(dbf_path, 'rb') as f:
    header = f.read(32)
    print("Header:", header)
    
    # Read field descriptors
    fields = []
    while True:
        b = f.read(1)
        if b == b'\r':
            break
        field_desc = b + f.read(31)
        name_bytes = field_desc[:11].rstrip(b'\x00')
        print(f"Raw field name: {name_bytes}")
        try:
            print(f"  as cp950: {name_bytes.decode('cp950')}")
        except Exception as e:
            print(f"  cp950 failed: {e}")
            
        try:
            print(f"  as utf-8: {name_bytes.decode('utf-8')}")
        except Exception as e:
            print(f"  utf-8 failed: {e}")
            
        try:
            # Maybe big5?
            print(f"  as big5: {name_bytes.decode('big5')}")
        except Exception as e:
            print(f"  big5 failed: {e}")
