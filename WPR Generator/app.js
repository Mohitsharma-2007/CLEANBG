// WPR Generator Studio Controller
(function () {
  'use strict';

  // Global State
  let wprData = null;
  let currentWeekIndex = 0; // 0 to 5, or 'all'
  let showSignature = true;
  let customSignatureUrl = null;

  // DOM Elements
  const weekTabsContainer = document.getElementById('week-tabs');
  const previewPane = document.getElementById('preview-sheet-container');
  const previewStatus = document.getElementById('preview-status-text');
  const toastElement = document.getElementById('toast-notification');

  // Form Inputs
  const inputStudentName = document.getElementById('input-student-name');
  const inputEnrollNo = document.getElementById('input-enroll-no');
  const inputProgram = document.getElementById('input-program');
  const inputFacultyGuide = document.getElementById('input-faculty-guide');
  const inputInstitution = document.getElementById('input-institution');
  const inputCourse = document.getElementById('input-course');
  const inputDateRange = document.getElementById('input-date-range');
  const inputTarget = document.getElementById('input-target');
  const inputLearning = document.getElementById('input-learning');
  const inputFuturePlan = document.getElementById('input-future-plan');
  const inputProjectUrl = document.getElementById('input-project-url');
  const inputGithubUrl = document.getElementById('input-github-url');
  const projectUrlsSection = document.getElementById('project-urls-section');
  const taskListEditor = document.getElementById('task-list-editor');
  const addTaskBtn = document.getElementById('btn-add-task');
  const signatureThumb = document.getElementById('signature-thumbnail');
  const signatureFileInput = document.getElementById('signature-file-input');
  const resetSignatureBtn = document.getElementById('btn-reset-signature');
  const toggleSignatureCheckbox = document.getElementById('toggle-signature');

  // Action Buttons
  const btnExportCurrent = document.getElementById('btn-export-current');
  const btnExportAll = document.getElementById('btn-export-all');
  const btnSaveJson = document.getElementById('btn-save-json');
  const btnLoadJson = document.getElementById('btn-load-json');
  const jsonFileInput = document.getElementById('json-file-input');
  const btnResetDefaults = document.getElementById('btn-reset-defaults');

  // Initialize
  async function init() {
    try {
      const response = await fetch('wpr_data.json');
      if (response.ok) {
        wprData = await response.json();
      } else {
        throw new Error('Fetch failed');
      }
    } catch (e) {
      console.warn('Loading fallback embedded WPR data:', e);
      if (window.DEFAULT_WPR_DATA) {
        wprData = JSON.parse(JSON.stringify(window.DEFAULT_WPR_DATA));
      }
    }

    if (!wprData) {
      console.error('No WPR data available!');
      return;
    }

    // Initialize signature
    if (window.DEFAULT_SIGNATURE) {
      customSignatureUrl = window.DEFAULT_SIGNATURE;
    } else {
      customSignatureUrl = wprData.signatureUrl || 'signature.png';
    }

    if (signatureThumb) {
      signatureThumb.src = customSignatureUrl;
    }

    buildWeekTabs();
    populateProfileInputs();
    loadWeekDataIntoEditor();
    renderPreview();
    attachEventListeners();
  }

  // Toast notifier
  function showToast(message) {
    if (!toastElement) return;
    toastElement.textContent = message;
    toastElement.classList.add('show');
    setTimeout(() => {
      toastElement.classList.remove('show');
    }, 3000);
  }

  // Build Week Navigation Tabs
  function buildWeekTabs() {
    weekTabsContainer.innerHTML = '';
    wprData.reports.forEach((rep, idx) => {
      const btn = document.createElement('button');
      btn.className = `week-tab-btn ${currentWeekIndex === idx ? 'active' : ''}`;
      btn.textContent = `Week ${rep.weekNumber}`;
      btn.addEventListener('click', () => {
        currentWeekIndex = idx;
        updateTabActiveClasses();
        loadWeekDataIntoEditor();
        renderPreview();
      });
      weekTabsContainer.appendChild(btn);
    });

    // "All Weeks" Tab
    const allBtn = document.createElement('button');
    allBtn.className = `week-tab-btn ${currentWeekIndex === 'all' ? 'active' : ''}`;
    allBtn.textContent = 'All 6 Weeks';
    allBtn.title = 'View and print all 6 weeks sequentially';
    allBtn.addEventListener('click', () => {
      currentWeekIndex = 'all';
      updateTabActiveClasses();
      renderPreview();
    });
    weekTabsContainer.appendChild(allBtn);
  }

  function updateTabActiveClasses() {
    const btns = weekTabsContainer.querySelectorAll('.week-tab-btn');
    btns.forEach((btn, idx) => {
      if (currentWeekIndex === 'all') {
        btn.classList.toggle('active', idx === btns.length - 1);
      } else {
        btn.classList.toggle('active', idx === currentWeekIndex);
      }
    });
  }

  // Populate Student & Faculty inputs
  function populateProfileInputs() {
    inputInstitution.value = wprData.institution || 'AMITY POLYTECHNIC, AUGN Campus';
    inputCourse.value = wprData.course || 'INTERNSHIP -1 [PTCHIN101]';
    inputStudentName.value = wprData.student.name || '';
    inputEnrollNo.value = wprData.student.enrollNo || '';
    inputProgram.value = wprData.student.program || '';
    inputFacultyGuide.value = wprData.student.facultyGuide || '';
  }

  // Load Current Week Data into Editor Form
  function loadWeekDataIntoEditor() {
    if (currentWeekIndex === 'all') {
      previewStatus.textContent = 'Combined Preview: All 6 Weeks (12 A4 Pages)';
      return;
    }

    const report = wprData.reports[currentWeekIndex];
    if (!report) return;

    previewStatus.textContent = `Live Preview: Week ${report.weekNumber} (${report.dateRange})`;

    inputDateRange.value = report.dateRange || '';
    inputTarget.value = report.targetOfTheWeek || '';
    inputLearning.value = report.learningOutcomes || '';
    inputFuturePlan.value = report.futureWorkPlan || '';

    // Show Project URLs section for all weeks so user/agent can add URLs for any project
    projectUrlsSection.style.display = 'block';
    inputProjectUrl.value = report.projectUrl || '';
    inputGithubUrl.value = report.githubUrl || '';

    renderTasksEditor(report.tasks);
  }

  // Render Daily Tasks List in Sidebar
  function renderTasksEditor(tasks) {
    taskListEditor.innerHTML = '';
    tasks.forEach((item, tIdx) => {
      const row = document.createElement('div');
      row.className = 'task-row-editor';

      const dayInput = document.createElement('input');
      dayInput.type = 'text';
      dayInput.className = 'form-input task-day-input';
      dayInput.value = item.day;
      dayInput.addEventListener('input', (e) => {
        item.day = e.target.value;
        renderPreview();
      });

      const descInput = document.createElement('textarea');
      descInput.className = 'form-textarea task-desc-input';
      descInput.value = item.task;
      descInput.rows = 2;
      descInput.addEventListener('input', (e) => {
        item.task = e.target.value;
        renderPreview();
      });

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-remove-task';
      removeBtn.innerHTML = '✕';
      removeBtn.title = 'Remove this day';
      removeBtn.addEventListener('click', () => {
        tasks.splice(tIdx, 1);
        renderTasksEditor(tasks);
        renderPreview();
      });

      row.appendChild(dayInput);
      row.appendChild(descInput);
      row.appendChild(removeBtn);
      taskListEditor.appendChild(row);
    });
  }

  // Generate HTML for a single WPR (2 Pages)
  function createWprReportHtml(report, reportIndex) {
    const student = wprData.student;
    const isWeek6 = report.weekNumber === '06' || reportIndex === 5;

    // Build Table Rows
    const tableRowsHtml = report.tasks
      .map(
        (t) => `
      <tr>
        <td contenteditable="true" data-field="task-day">${escapeHtml(t.day)}</td>
        <td contenteditable="true" data-field="task-desc">${escapeHtml(t.task)}</td>
      </tr>
    `
      )
      .join('');

    // Project URLs section (rendered whenever a week has URLs configured)
    let urlSectionHtml = '';
    if (report.projectUrl || report.githubUrl) {
      urlSectionHtml = `
        <div class="url-box">
          <div style="font-weight: bold; margin-bottom: 3pt;">PROJECT DEPLOYMENT & REPOSITORY URL:</div>
          ${report.projectUrl ? `<div><span style="font-weight: bold;">Live Web Application:</span> <a href="${escapeHtml(report.projectUrl)}" target="_blank">${escapeHtml(report.projectUrl)}</a></div>` : ''}
          ${report.githubUrl ? `<div style="margin-top: 2pt;"><span style="font-weight: bold;">GitHub Source Code:</span> <a href="${escapeHtml(report.githubUrl)}" target="_blank">${escapeHtml(report.githubUrl)}</a></div>` : ''}
        </div>
      `;
    }

    const signatureImgTag =
      showSignature && customSignatureUrl
        ? `<img class="signature-img" src="${customSignatureUrl}" alt="Student Signature" />`
        : '';

    return `
      <!-- PAGE 1: Target and Daily Tasks -->
      <section class="a4-sheet" data-week-idx="${reportIndex}">
        <div class="report-header">
          <div class="inst-title" contenteditable="true" data-field="institution">${escapeHtml(wprData.institution)}</div>
          <div class="internship-title" contenteditable="true" data-field="course">${escapeHtml(wprData.course)}</div>
          <div class="wpr-title">${escapeHtml(report.weekLabel || `WEEKLY PROGRESS REPORT – ${report.weekNumber}`)}</div>
        </div>

        <div class="meta-row">
          <div><span class="meta-label">DATE: </span><span class="meta-val" contenteditable="true" data-field="dateRange">${escapeHtml(report.dateRange)}</span></div>
        </div>

        <div class="meta-row">
          <div><span class="meta-label">NAME: </span><span class="meta-val" contenteditable="true" data-field="studentName">${escapeHtml(student.name)}</span></div>
          <div><span class="meta-label">ENROLL NO: </span><span class="meta-val" contenteditable="true" data-field="enrollNo">${escapeHtml(student.enrollNo)}</span></div>
        </div>

        <div class="meta-item">
          <span class="meta-label">PROGRAM: </span><span class="meta-val" contenteditable="true" data-field="program">${escapeHtml(student.program)}</span>
        </div>

        <hr class="divider-line" />

        <div class="faculty-guide-row">
          <span class="meta-label">FACULTY GUIDE’S NAME: </span><span class="meta-val" contenteditable="true" data-field="facultyGuide">${escapeHtml(student.facultyGuide)}</span>
        </div>

        <div class="section-heading">TARGET OF THE WEEK:</div>
        <div class="target-content" contenteditable="true" data-field="target">${escapeHtml(report.targetOfTheWeek)}</div>

        <hr class="divider-line" />

        <div class="wpr-table-title">TASK COMPLETED THIS WEEK</div>
        <table class="wpr-table">
          <thead>
            <tr>
              <th>DAY / DATE</th>
              <th>TASK COMPLETED</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="page-footer-note">WPR ${report.weekNumber} &bull; Page 1 of 2</div>
      </section>

      <!-- PAGE 2: Learning Outcomes, Future Plan, Signature -->
      <section class="a4-sheet" data-week-idx="${reportIndex}">
        <div class="section-heading">LEARNING OUTCOMES:</div>
        <div class="learning-outcomes-content" contenteditable="true" data-field="learning">${escapeHtml(report.learningOutcomes)}</div>

        <hr class="divider-line" />

        <div class="section-heading">FUTURE WORK PLAN:</div>
        <div class="future-plan-content" contenteditable="true" data-field="futurePlan">${escapeHtml(report.futureWorkPlan)}</div>

        ${urlSectionHtml}

        <div class="signature-container">
          <div class="signature-img-wrapper">
            ${signatureImgTag}
          </div>
          <div class="signature-line-text">Student Signature |</div>
        </div>

        <div class="page-footer-note">WPR ${report.weekNumber} &bull; Page 2 of 2</div>
      </section>
    `;
  }

  // Render Preview Pane
  function renderPreview() {
    previewPane.innerHTML = '';

    if (currentWeekIndex === 'all') {
      wprData.reports.forEach((report, idx) => {
        previewPane.innerHTML += createWprReportHtml(report, idx);
      });
    } else {
      const activeReport = wprData.reports[currentWeekIndex];
      if (activeReport) {
        previewPane.innerHTML = createWprReportHtml(activeReport, currentWeekIndex);
      }
    }

    bindContentEditableEvents();
  }

  // Two-way synchronization from contenteditable preview back to state & form
  function bindContentEditableEvents() {
    const editables = previewPane.querySelectorAll('[contenteditable="true"]');
    editables.forEach((el) => {
      el.addEventListener('input', (e) => {
        const field = el.getAttribute('data-field');
        const text = el.innerText.trim();
        const sheet = el.closest('.a4-sheet');
        const weekIdx = parseInt(sheet.getAttribute('data-week-idx'), 10);
        const report = wprData.reports[weekIdx];

        if (field === 'institution') {
          wprData.institution = text;
          inputInstitution.value = text;
        } else if (field === 'course') {
          wprData.course = text;
          inputCourse.value = text;
        } else if (field === 'studentName') {
          wprData.student.name = text;
          inputStudentName.value = text;
        } else if (field === 'enrollNo') {
          wprData.student.enrollNo = text;
          inputEnrollNo.value = text;
        } else if (field === 'program') {
          wprData.student.program = text;
          inputProgram.value = text;
        } else if (field === 'facultyGuide') {
          wprData.student.facultyGuide = text;
          inputFacultyGuide.value = text;
        } else if (field === 'dateRange' && report) {
          report.dateRange = text;
          if (weekIdx === currentWeekIndex) inputDateRange.value = text;
        } else if (field === 'target' && report) {
          report.targetOfTheWeek = text;
          if (weekIdx === currentWeekIndex) inputTarget.value = text;
        } else if (field === 'learning' && report) {
          report.learningOutcomes = text;
          if (weekIdx === currentWeekIndex) inputLearning.value = text;
        } else if (field === 'futurePlan' && report) {
          report.futureWorkPlan = text;
          if (weekIdx === currentWeekIndex) inputFuturePlan.value = text;
        }
      });
    });
  }

  // Attach Event Listeners to Inputs & Actions
  function attachEventListeners() {
    // Profile inputs
    inputInstitution.addEventListener('input', (e) => {
      wprData.institution = e.target.value;
      renderPreview();
    });
    inputCourse.addEventListener('input', (e) => {
      wprData.course = e.target.value;
      renderPreview();
    });
    inputStudentName.addEventListener('input', (e) => {
      wprData.student.name = e.target.value;
      renderPreview();
    });
    inputEnrollNo.addEventListener('input', (e) => {
      wprData.student.enrollNo = e.target.value;
      renderPreview();
    });
    inputProgram.addEventListener('input', (e) => {
      wprData.student.program = e.target.value;
      renderPreview();
    });
    inputFacultyGuide.addEventListener('input', (e) => {
      wprData.student.facultyGuide = e.target.value;
      renderPreview();
    });

    // Report content inputs
    inputDateRange.addEventListener('input', (e) => {
      if (currentWeekIndex !== 'all') {
        wprData.reports[currentWeekIndex].dateRange = e.target.value;
        renderPreview();
      }
    });
    inputTarget.addEventListener('input', (e) => {
      if (currentWeekIndex !== 'all') {
        wprData.reports[currentWeekIndex].targetOfTheWeek = e.target.value;
        renderPreview();
      }
    });
    inputLearning.addEventListener('input', (e) => {
      if (currentWeekIndex !== 'all') {
        wprData.reports[currentWeekIndex].learningOutcomes = e.target.value;
        renderPreview();
      }
    });
    inputFuturePlan.addEventListener('input', (e) => {
      if (currentWeekIndex !== 'all') {
        wprData.reports[currentWeekIndex].futureWorkPlan = e.target.value;
        renderPreview();
      }
    });
    inputProjectUrl.addEventListener('input', (e) => {
      if (currentWeekIndex !== 'all') {
        wprData.reports[currentWeekIndex].projectUrl = e.target.value;
        renderPreview();
      }
    });
    inputGithubUrl.addEventListener('input', (e) => {
      if (currentWeekIndex !== 'all') {
        wprData.reports[currentWeekIndex].githubUrl = e.target.value;
        renderPreview();
      }
    });

    // Add Task Button
    addTaskBtn.addEventListener('click', () => {
      if (currentWeekIndex === 'all') {
        showToast('Please select a specific week tab to add a daily task.');
        return;
      }
      const report = wprData.reports[currentWeekIndex];
      const nextDayNum = report.tasks.length + 1;
      report.tasks.push({
        day: `Day ${nextDayNum}`,
        task: 'Engineering implementation and testing task.'
      });
      renderTasksEditor(report.tasks);
      renderPreview();
    });

    // Signature Toggle
    toggleSignatureCheckbox.addEventListener('change', (e) => {
      showSignature = e.target.checked;
      renderPreview();
    });

    // Custom Signature Upload
    signatureFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        customSignatureUrl = evt.target.result;
        signatureThumb.src = customSignatureUrl;
        renderPreview();
        showToast('Custom signature uploaded successfully!');
      };
      reader.readAsDataURL(file);
    });

    // Reset Signature
    resetSignatureBtn.addEventListener('click', () => {
      customSignatureUrl = window.DEFAULT_SIGNATURE || wprData.signatureUrl || 'signature.png';
      signatureThumb.src = customSignatureUrl;
      renderPreview();
      showToast('Signature reset to default.');
    });

    // Export Current WPR to PDF
    btnExportCurrent.addEventListener('click', () => {
      if (currentWeekIndex === 'all') {
        currentWeekIndex = 0;
        updateTabActiveClasses();
        loadWeekDataIntoEditor();
        renderPreview();
      }
      showToast('Opening PDF Print Dialog for Current WPR...');
      setTimeout(() => {
        window.print();
      }, 300);
    });

    // Export All 6 WPRs as PDF
    btnExportAll.addEventListener('click', () => {
      const previousIndex = currentWeekIndex;
      currentWeekIndex = 'all';
      updateTabActiveClasses();
      renderPreview();
      showToast('Opening PDF Print Dialog for All 6 WPRs (12 Pages)...');
      setTimeout(() => {
        window.print();
        // Restore view after print dialog closes
        setTimeout(() => {
          currentWeekIndex = previousIndex;
          updateTabActiveClasses();
          loadWeekDataIntoEditor();
          renderPreview();
        }, 1000);
      }, 300);
    });

    // Save JSON to local file
    btnSaveJson.addEventListener('click', () => {
      const jsonStr = JSON.stringify(wprData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WPR_Data_${wprData.student.name.replace(/\s+/g, '_')}_A41890824008.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('WPR data downloaded as JSON.');
    });

    // Load JSON from local file
    btnLoadJson.addEventListener('click', () => {
      jsonFileInput.click();
    });

    jsonFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (parsed && parsed.reports && parsed.student) {
            wprData = parsed;
            populateProfileInputs();
            loadWeekDataIntoEditor();
            renderPreview();
            showToast('Custom JSON data loaded successfully!');
          } else {
            alert('Invalid WPR JSON format. Must contain "reports" and "student".');
          }
        } catch (err) {
          alert('Failed to parse JSON file: ' + err.message);
        }
      };
      reader.readAsText(file);
      jsonFileInput.value = '';
    });

    // Reset Defaults
    btnResetDefaults.addEventListener('click', () => {
      if (confirm('Reset all fields back to default CleanBG data?')) {
        if (window.DEFAULT_WPR_DATA) {
          wprData = JSON.parse(JSON.stringify(window.DEFAULT_WPR_DATA));
          populateProfileInputs();
          loadWeekDataIntoEditor();
          renderPreview();
          showToast('Reset to default CleanBG data.');
        }
      }
    });
  }

  // HTML sanitization helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
