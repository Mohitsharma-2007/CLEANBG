# AntiGravity / AI Agent Instructions: WPR Generator Suite

> **Instructions for the AI Assistant (AntiGravity / Pair Programmer)**:
> When a user uploads or references this `WPR Generator/` folder inside any project repository and instructs you to *"read the MD file inside it and generate the WPR's"*, follow the standardized autonomous workflow outlined in this document.

---

## 1. Role & Objective

You are tasked with generating the official **6-Week Weekly Progress Reports (WPR-01 to WPR-06)** for academic internship submissions (formatted for **Amity Polytechnic, AUGN Campus [PTCHIN101]** or equivalent academic institutions).

Each WPR is a strictly formatted 2-page A4 document consisting of:
- **Page 1**: Institution header, Student & Faculty Guide metadata, Target of the Week, and a detailed 7-Day (or 5-Day) Task Completed Table.
- **Page 2**: Technical Learning Outcomes, Future Work Plan, Project/Repository URLs (for the final week), and Student Signature.

---

## 2. Autonomous Agent Workflow

Follow these steps sequentially:

### Step 1: Project Repository Analysis
Thoroughly inspect the host repository to understand the project deeply:
1. Examine `package.json`, `requirements.txt`, `pubspec.yaml`, or root dependency manifests.
2. Read `README.md`, architecture docs, and git commit history (`git log -n 25 --oneline`).
3. Identify the core architecture, libraries, APIs, frontend/backend stack, and deployment methods.

---

### Step 2: Cross-Questioning Protocol (Ask Clarifying Questions)
If the project does not explicitly provide the student's personal or academic details, the AI agent **must ask the user** the following cross-questions before generating the report:

```markdown
To generate your customized 6-Week WPR reports, please provide the following details (or confirm defaults):

1. **Student Full Name**: (e.g., Mohit Sharma)
2. **Enrollment Number**: (e.g., A41890824008)
3. **Academic Program**: (e.g., Diploma in Computer Engineering / B.Tech CSE)
4. **Faculty Guide's Name & Title**: (e.g., Prof. Krashnkant Gupta)
5. **Institution Name**: (Default: "AMITY POLYTECHNIC, AUGN Campus" - let me know if different)
6. **Course / Subject Code**: (Default: "INTERNSHIP -1 [PTCHIN101]" - let me know if different)
7. **Date Ranges**: (Default 6-week academic schedule):
   - Week 1: 31/08/2026 to 06/09/2026
   - Week 2: 07/09/2026 to 13/09/2026
   - Week 3: 14/09/2026 to 20/09/2026
   - Week 4: 21/09/2026 to 27/09/2026
   - Week 5: 28/09/2026 to 04/10/2026
   - Week 6: 05/10/2026 to 09/10/2026
   *(Confirm if these dates match your semester or specify your own)*
8. **Live Deployment URL & GitHub Repository**: (Optional links to include in the Week 6 report)
```

---

### Step 3: Formulate Technical Weekly Progress Content
Synthesize realistic, chronological, day-by-day engineering activities based on the project's actual features and codebase. Follow this progressive trajectory across the 6 weeks:

- **Week 1 (Scaffolding & Architecture)**:
  - Requirements analysis, tech stack selection, environment setup, initial boilerplate, directory structure, UI wireframing.
- **Week 2 (Core Logic & Data Layer)**:
  - Database schema / State management / Core algorithms / Model integration / API client setup.
- **Week 3 (Feature Implementation Part 1)**:
  - Primary user flows, main views, interactive UI controls, data processing pipelines.
- **Week 4 (Feature Implementation Part 2)**:
  - Secondary features, specialized tools, canvas / graphics / business logic, error handling.
- **Week 5 (Refinement & Polishing)**:
  - UI/UX enhancement, styling alignment, responsive design, performance profiling, bug fixing.
- **Week 6 (Testing, Optimization & Deployment)**:
  - End-to-end testing, memory leak profiling, cloud deployment (e.g. Vercel, Render, AWS), documentation, live URL presentation.

---

### Step 4: Write Custom `wpr_data.json` & Sync `default-data.js`

Write the formulated data into `wpr_data.json` adhering to the following JSON schema:

```json
{
  "institution": "AMITY POLYTECHNIC, AUGN Campus",
  "course": "INTERNSHIP -1 [PTCHIN101]",
  "student": {
    "name": "<Student Name>",
    "enrollNo": "<Enrollment Number>",
    "program": "<Academic Program>",
    "facultyGuide": "<Guide Name>"
  },
  "signatureUrl": "signature.png",
  "reports": [
    {
      "weekNumber": "01",
      "weekLabel": "WEEKLY PROGRESS REPORT – 01",
      "dateRange": "31/08/2026 - 06/09/2026",
      "targetOfTheWeek": "...",
      "tasks": [
        { "day": "Day 1 – 31/08/2026", "task": "..." },
        { "day": "Day 2 – 01/09/2026", "task": "..." }
      ],
      "learningOutcomes": "...",
      "futureWorkPlan": "..."
    }
    // ... Repeat for weeks 02, 03, 04, 05, 06
  ]
}
```

After updating `wpr_data.json`, sync `default-data.js` so offline direct-file access continues to work:
```bash
python -c "import json; data = open('wpr_data.json', encoding='utf-8').read(); open('default-data.js', 'w', encoding='utf-8').write('window.DEFAULT_WPR_DATA = ' + data + ';\n')"
```

---

### Step 5: Student Signature Handling
- If the student provides a signature image (e.g., `signature.png`), save it in `WPR Generator/signature.png`.
- Run the python base64 converter to update `signature-data.js`:
  ```bash
  python -c "import base64; b = open('signature.png', 'rb').read(); s = 'data:image/png;base64,' + base64.b64encode(b).decode(); open('signature-data.js', 'w').write('window.DEFAULT_SIGNATURE = ' + repr(s) + ';\n')"
  ```
- If no signature is provided, the student can either upload it interactively in the web UI or leave the checkbox unticked to sign physically after printing.

---

### Step 6: Preview & PDF Export Instructions for the User
Instruct the user:
1. Open `index.html` in any web browser (or serve with `npx serve .` or `python -m http.server 3000`).
2. Verify their details in the live preview. All fields can be edited directly on the A4 page or via the left sidebar form.
3. Click **Export Current WPR to PDF** to download the active week's report.
4. Click **Export All 6 WPRs (Single PDF)** to generate the complete 12-page compiled internship portfolio.
5. In the browser print dialog:
   - **Destination**: Save as PDF
   - **Paper size**: A4
   - **Margins**: None (or Default)
   - **Headers and footers**: Uncheck
   - **Background graphics**: Check
