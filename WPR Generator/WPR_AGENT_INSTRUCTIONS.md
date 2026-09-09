# AntiGravity / AI Agent Instructions: Centralized WPR Generator Suite

> **Instructions for AntiGravity and AI Pair Programmers**:
> This document defines the protocol for maintaining the **Centralized Weekly Progress Report (WPR)** repository (`wpr`) across all 6 weeks of the **Amity Polytechnic, AUGN Campus [PTCHIN101]** internship semester.

---

## 1. Multi-Project Architecture Overview

Instead of mixing reports across scattered repositories, all 6 Weekly Progress Reports are centrally maintained in the dedicated `wpr` repository (`d:\wpr` and `https://github.com/Mohitsharma-2007/wpr.git`).

### Current Weekly Allocation:
- **Week 1 (`31/08/2026 - 06/09/2026`)**: **CleanBG (AI Background Remover & Studio)**
  - Entire project built, tested, and released under Week 1.
  - Live Web App: `https://cleanbg-ai-studio.vercel.app`
  - GitHub Repo: `https://github.com/Mohitsharma-2007/CLEANBG.git`
- **Week 2 (`07/09/2026 - 13/09/2026`)**: *Reserved for Week 2 Project* (Blank / Pending)
- **Week 3 (`14/09/2026 - 20/09/2026`)**: *Reserved for Week 3 Project* (Blank / Pending)
- **Week 4 (`21/09/2026 - 27/09/2026`)**: *Reserved for Week 4 Project* (Blank / Pending)
- **Week 5 (`28/09/2026 - 04/10/2026`)**: *Reserved for Week 5 Project* (Blank / Pending)
- **Week 6 (`05/10/2026 - 09/10/2026`)**: *Reserved for Week 6 Final Project & Dissertation* (Blank / Pending)

---

## 2. Cross-Project Update Protocol (How to Update from Any Project)

When the user is working on another project in another folder (e.g., `d:\ATTENDX`, `d:\AegisChain`, etc.) and instructs the agent:
> *"Read the WPR git repo and push the project report for this week about this project with final links and all"*,
follow this standardized autonomous procedure:

### Step 1: Analyze the Current Working Project
1. Read the host project's `README.md`, `package.json`, source files, and recent git commits (`git log -n 15 --oneline`).
2. Identify the project name, core functionality, architecture, tech stack, and deployed URLs (e.g. Vercel, Render, GitHub).

### Step 2: Determine Target Week
- Identify which week this project corresponds to (e.g., Week 2: `07/09/2026 - 13/09/2026`).
- If unspecified, ask the user or confirm the date range.

### Step 3: Formulate Realistic Daily Engineering Tasks
Generate 7 technical, chronological daily task descriptions (or 5 for Week 6) matching the calendar dates of that week.
Example for Week 2:
- Day 1 – 07/09/2026: ...
- Day 2 – 08/09/2026: ...
- Day 3 – 09/09/2026: ...
- Day 4 – 10/09/2026: ...
- Day 5 – 11/09/2026: ...
- Day 6 – 12/09/2026: ...
- Day 7 – 13/09/2026: ...

### Step 4: Update `wpr_data.json` in the Central `wpr` Repository
Access `d:\wpr\wpr_data.json` (or use `d:\wpr\update_week.py`):
```bash
python "d:\wpr\update_week.py" --week 2 \
  --target "Development of <Project Name>..." \
  --tasks-json '[{"day":"Day 1 – 07/09/2026","task":"..."}, ...]' \
  --learning "..." \
  --future-plan "..." \
  --live-url "<Live Deployment URL>" \
  --github-url "<GitHub Repo URL>"
```
*Note: `update_week.py` automatically keeps `wpr_data.json` and `default-data.js` synchronized.*

### Step 5: Commit & Push to the `wpr` Git Repository
Navigate to `d:\wpr` and execute:
```powershell
cd d:\wpr
git add .
git commit -m "feat(wpr): update Week <N> report for <Project Name> with live links"
git push origin main
```

---

## 3. Student Profile Reference (Defaults)

```json
{
  "institution": "AMITY POLYTECHNIC, AUGN Campus",
  "course": "INTERNSHIP -1 [PTCHIN101]",
  "student": {
    "name": "Mohit Sharma",
    "enrollNo": "A41890824008",
    "program": "Diploma in Computer Engineering",
    "facultyGuide": "Prof. Krashnkant Gupta"
  }
}
```

---

## 4. PDF Generation & Verification
1. Open the local tool: `http://localhost:8080` (or the live Vercel URL).
2. Verify that Week 1 retains the CleanBG report with live URLs, and the newly updated week contains its full data.
3. Click **Export Current WPR to PDF** or **Export All 6 WPRs (Single PDF)** to produce academic-compliant A4 documents.
