import re

path = 'C:\\Users\\anton\\.gemini\\antigravity\\scratch\\wash3.0\\src\\pages\\HomePage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
print(f"Total lines: {len(lines)}")

print("\n--- SEARCHING FOR TABS OR SECTIONS ---")
for idx, line in enumerate(lines):
    line_lower = line.lower()
    if 'tab' in line_lower or 'section' in line_lower or 'view' in line_lower:
        if len(line.strip()) < 120 and any(keyword in line_lower for keyword in ['state', 'const', 'let', 'function', 'class', '<button', '<div']):
            print(f"{idx + 1}: {line.strip()}")
