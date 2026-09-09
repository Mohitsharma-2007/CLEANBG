# Amity Polytechnic WPR Generator Studio

A complete, interactive Weekly Progress Report (WPR) generator tool built for **Amity Polytechnic, AUGN Campus (Internship -1 [PTCHIN101])**.

Generates all 6 official weekly progress reports conforming strictly to institutional guidelines, featuring live in-browser preview, instant two-way editing, JSON import/export, and single-click A4 PDF export.

---

## 📁 What's Included

| File | Purpose |
| :--- | :--- |
| `index.html` | Interactive Studio Web Application & Live A4 Preview |
| `style.css` | Modern UI styling & pixel-perfect `@media print` A4 pagination rules |
| `app.js` | Controller for tab navigation, editing, signature handling, and PDF export |
| `wpr_data.json` | Pre-filled complete 6-week technical progress data for CleanBG |
| `default-data.js` | Embedded offline data fallback for direct `file:///` opening |
| `signature.png` | Extracted high-resolution transparent student signature |
| `signature-data.js`| Embedded base64 signature for offline use |
| `WPR_AGENT_INSTRUCTIONS.md` | Autonomous workflow guide for AntiGravity / AI pair programmers |

---

## 🚀 How to Run

### Option 1: Direct File Opening
Simply double-click `index.html` in your file explorer to open it in Chrome, Edge, Brave, or Firefox.

### Option 2: Local HTTP Server (Recommended)
From this directory, run:
```bash
npx serve .
# or
python -m http.server 8080
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 🖨️ Exporting to PDF

1. **Current Week Report (2 Pages)**:
   - Click **Export Current WPR to PDF**.
2. **Complete 6-Week Report (12 Pages)**:
   - Click **Export All 6 WPRs (Single PDF)**.
3. **Print Dialog Settings**:
   - **Destination**: Save as PDF
   - **Paper size**: A4
   - **Margins**: None (or Default)
   - **Options**: Uncheck *Headers and footers*, check *Background graphics*.

---

## 🤝 Sharing with Friends for Other Projects

To generate WPRs for another project:
1. Copy this entire `WPR Generator/` folder into your friend's project directory.
2. Open AntiGravity and prompt:
   > *"Read `WPR Generator/WPR_AGENT_INSTRUCTIONS.md` and generate the 6 WPR reports for my project."*
3. AntiGravity will automatically inspect the repository, ask necessary cross-questions (Name, Enroll No, Faculty Guide), formulate the 6-week technical logs, and populate the generator!
