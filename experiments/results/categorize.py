import json
import os

categorized = {"TUNA9": [], "IBM": [], "IQM": [], "EMULATOR": [], "OTHER": []}

for filename in sorted(os.listdir('.')):
    if not filename.endswith('.json'):
        continue
    
    try:
        with open(filename, 'r') as f:
            data = json.load(f)
        
        backend_val = None
        if isinstance(data, dict):
            # Try common backend field names
            backend_val = data.get('backend') or data.get('backend_type') or data.get('backend_name')
        
        if backend_val:
            backend_str = str(backend_val).lower()
            if 'tuna' in backend_str:
                categorized["TUNA9"].append(filename)
            elif 'ibm' in backend_str:
                categorized["IBM"].append(filename)
            elif 'iqm' in backend_str:
                categorized["IQM"].append(filename)
            elif 'emulator' in backend_str or 'qxelarator' in backend_str or 'statevector' in backend_str:
                categorized["EMULATOR"].append(filename)
            else:
                categorized["OTHER"].append((filename, backend_str))
        else:
            # Check filename patterns if no backend field
            if 'tuna' in filename.lower():
                categorized["TUNA9"].append(filename)
            elif 'ibm' in filename.lower():
                categorized["IBM"].append(filename)
            elif 'iqm' in filename.lower():
                categorized["IQM"].append(filename)
            elif 'emulator' in filename.lower():
                categorized["EMULATOR"].append(filename)
            else:
                categorized["OTHER"].append((filename, "no-backend-field"))
    except Exception as e:
        print(f"ERROR reading {filename}: {e}")

for category in ["TUNA9", "IBM", "IQM", "EMULATOR", "OTHER"]:
    items = categorized[category]
    print(f"\n=== {category} ({len(items)} files) ===")
    if category == "OTHER":
        for item in items:
            print(f"  {item}")
    else:
        for item in items:
            print(f"  {item}")
