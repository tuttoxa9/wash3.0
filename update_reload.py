import re

file_path = "src/pages/SettingsPage.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Replace conditional reload with unconditional reload
content = re.sub(
    r"// Optionally, reload the page to ensure fresh state if current day is cleared\s*if \(dateToClear === format\(new Date\(\), \"yyyy-MM-dd\"\)\) \{\s*setTimeout\(\(\) => \{\s*window\.location\.reload\(\);\s*\}, 1000\);\s*\}",
    "setTimeout(() => {\n            window.location.reload();\n          }, 1000);",
    content
)

with open(file_path, "w") as f:
    f.write(content)
print("Updated page reload logic to be unconditional.")
