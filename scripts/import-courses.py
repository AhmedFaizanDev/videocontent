"""Course master (xlsx) -> a project's source of truth, one file per course.

    .venv/bin/python scripts/import-courses.py <workbook.xlsx> <project>

Writes projects/<p>/source/<CODE>.md (every column of the row, verbatim: the grounding corpus
and the writer's only facts) and projects/<p>/courses.json (code, name, hours, …) for the batch.
"""
import json, os, sys
import openpyxl

wb_path, project = sys.argv[1], sys.argv[2]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pd = os.path.join(root, 'projects', project)
os.makedirs(os.path.join(pd, 'source'), exist_ok=True)
ws = openpyxl.load_workbook(wb_path, data_only=True)['Course Master']
head = [c.value for c in ws[1]]
courses = []
for row in ws.iter_rows(min_row=2, values_only=True):
    if not row[0]:
        continue
    r = dict(zip(head, row))
    keep = ['Course Code', 'Course Name', 'Category', 'Course Type', 'Learning Hours', 'Short Description', 'Full Description', 'Course Objectives', 'Course Learning Outcomes', 'Who Can Take This Course', 'Delivery Mode', 'Assessment', 'Certificate']
    with open(os.path.join(pd, 'source', f"{r['Course Code']}.md"), 'w') as f:
        f.write(f"# {r['Course Name']} ({r['Course Code']})\n\n" + '\n\n'.join(f"## {k}\n{r[k]}" for k in keep if r.get(k) is not None) + '\n')
    courses.append({'code': r['Course Code'], 'name': r['Course Name'], 'category': r['Category'], 'hours': r['Learning Hours'], 'type': r['Course Type']})
with open(os.path.join(pd, 'courses.json'), 'w') as f:
    json.dump(courses, f, indent=1)
print(f"{len(courses)} courses -> projects/{project}/source/*.md")
