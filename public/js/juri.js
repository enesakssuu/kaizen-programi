// ==================== JURI.JS ====================
(function () {
    'use strict';

    let currentJuror = null;
    let projects = [];
    let jurorScores = {};
    let criteria = [];
    let currentScoringProject = null;

    const IMPACT_LABELS = ['', 'Çok Düşük', 'Düşük', 'Orta', 'İyi', 'Çok İyi'];
    const IMPACT_CLASSES = ['', 'impact-very-low', 'impact-low', 'impact-mid', 'impact-good', 'impact-great'];

    const $loginScreen = document.getElementById('login-screen');
    const $dashboard = document.getElementById('dashboard');
    const $loginForm = document.getElementById('login-form');
    const $loginName = document.getElementById('login-name');
    const $loginPin = document.getElementById('login-pin');
    const $loginError = document.getElementById('login-error');
    const $loginErrorText = document.getElementById('login-error-text');
    const $jurorNameDisplay = document.getElementById('juror-name-display');
    const $logoutBtn = document.getElementById('logout-btn');
    const $scoredCount = document.getElementById('scored-count');
    const $totalCount = document.getElementById('total-count');
    const $progressFill = document.getElementById('progress-fill');
    const $projectsGrid = document.getElementById('projects-grid');
    const $emptyState = document.getElementById('empty-state');
    const $scoringModal = document.getElementById('scoring-modal');
    const $scoringClose = document.getElementById('scoring-close');
    const $scoringCancel = document.getElementById('scoring-cancel');
    const $scoringForm = document.getElementById('scoring-form');
    const $scoringProjectName = document.getElementById('scoring-project-name');
    const $scoringProjectTeam = document.getElementById('scoring-project-team');
    const $scoringQuestions = document.getElementById('scoring-questions');
    const $scoringTotal = document.getElementById('scoring-total');
    const $scoringTotalMax = document.getElementById('scoring-total-max');
    const $toastContainer = document.getElementById('toast-container');

    // ==================== INIT ====================
    function init() {
        checkSession();
        bindEvents();
    }

    function checkSession() {
        const saved = localStorage.getItem('kaizen_juror');
        if (saved) {
            try {
                currentJuror = JSON.parse(saved);
                showDashboard();
            } catch (e) {
                localStorage.removeItem('kaizen_juror');
            }
        }
    }

    function saveSession(juror) {
        localStorage.setItem('kaizen_juror', JSON.stringify(juror));
    }

    function clearSession() {
        localStorage.removeItem('kaizen_juror');
        currentJuror = null;
    }

    function bindEvents() {
        $loginForm.addEventListener('submit', handleLogin);
        $logoutBtn.addEventListener('click', handleLogout);
        $scoringClose.addEventListener('click', closeScoring);
        $scoringCancel.addEventListener('click', closeScoring);
        $scoringForm.addEventListener('submit', handleSaveScore);
        $scoringModal.addEventListener('click', function (e) {
            if (e.target === $scoringModal) closeScoring();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeScoring();
        });
    }

    // ==================== LOGIN ====================
    async function handleLogin(e) {
        e.preventDefault();
        const name = $loginName.value.trim();
        const pin = $loginPin.value.trim();
        if (!name || !pin) return;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, pin })
            });
            const data = await res.json();
            if (data.success) {
                currentJuror = data.juror;
                saveSession(currentJuror);
                $loginError.classList.remove('show');
                showDashboard();
            } else {
                $loginErrorText.textContent = data.message || 'Geçersiz ad veya PIN kodu';
                $loginError.classList.add('show');
                $loginPin.value = '';
                $loginPin.focus();
            }
        } catch (err) {
            $loginErrorText.textContent = 'Bağlantı hatası. Lütfen tekrar deneyin.';
            $loginError.classList.add('show');
        }
    }

    function handleLogout() {
        clearSession();
        $dashboard.classList.add('hidden');
        $loginScreen.classList.remove('hidden');
        $loginName.value = '';
        $loginPin.value = '';
        $loginError.classList.remove('show');
    }

    // ==================== DASHBOARD ====================
    async function showDashboard() {
        $loginScreen.classList.add('hidden');
        $dashboard.classList.remove('hidden');
        if ($jurorNameDisplay) $jurorNameDisplay.textContent = currentJuror.name;
        await loadData();
    }

    async function loadData() {
        try {
            const [projectsRes, scoresRes, criteriaRes] = await Promise.all([
                fetch('/api/projects'),
                fetch('/api/scores/' + currentJuror.id),
                fetch('/api/criteria')
            ]);
            projects = await projectsRes.json();
            jurorScores = await scoresRes.json();
            criteria = await criteriaRes.json();
            renderProjects();
            updateProgress();
        } catch (err) {
            showToast('Veriler yüklenirken hata oluştu', 'error');
        }
    }

    // ==================== HELPERS ====================
    function maxTotal() {
        return criteria.reduce((sum, c) => sum + c.maxScore, 0);
    }

    function checkboxCountToLevel(count) {
        if (count <= 0) return 0;
        if (count <= 2) return 1;
        if (count <= 3) return 2;
        if (count <= 4) return 3;
        if (count <= 5) return 4;
        return 5;
    }

    // ==================== RENDER PROJECTS ====================
    function renderProjects() {
        $projectsGrid.innerHTML = '';
        if (projects.length === 0) {
            $emptyState.classList.remove('hidden');
            return;
        }
        $emptyState.classList.add('hidden');
        const max = maxTotal();

        projects.forEach((project, index) => {
            const score = jurorScores[project.id];
            const isScored = !!score;
            const card = document.createElement('div');
            card.className = 'project-card' + (isScored ? ' scored' : '');
            card.style.animationDelay = (index * 0.05) + 's';

            card.innerHTML = `
                <div class="project-card-header">
                    <div>
                        <div class="project-card-name">${escapeHtml(project.name)}</div>
                        ${project.team ? `<div class="project-card-team">${escapeHtml(project.team)}</div>` : ''}
                    </div>
                    ${isScored ? '<span class="badge badge-success">Puanlandı</span>' : '<span class="badge badge-warning">Bekliyor</span>'}
                </div>
                <div class="project-card-status ${isScored ? 'scored-status' : ''}">
                    ${isScored ? 'Puanınız kaydedildi. Düzenlemek için tıklayın.' : 'Puanlamak için tıklayın'}
                </div>
                ${isScored ? `<div class="project-card-score"><span class="project-card-score-value">${score.total}</span><span class="project-card-score-max">/ ${max}</span></div>` : ''}
            `;
            card.addEventListener('click', () => openScoring(project));
            $projectsGrid.appendChild(card);
        });
    }

    function updateProgress() {
        const total = projects.length;
        const scored = Object.keys(jurorScores).length;
        $scoredCount.textContent = scored;
        $totalCount.textContent = total;
        const percent = total > 0 ? (scored / total) * 100 : 0;
        $progressFill.style.width = percent + '%';
    }

    // ==================== SCORING MODAL ====================
    function openScoring(project) {
        currentScoringProject = project;
        $scoringProjectName.textContent = project.name;
        $scoringProjectTeam.textContent = project.team || '';
        $scoringQuestions.innerHTML = '';

        const existingScore = jurorScores[project.id];
        const max = maxTotal();
        if ($scoringTotalMax) $scoringTotalMax.textContent = max;

        criteria.forEach((criterion, ci) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'score-question';

            if (criterion.type === 'checkbox') {
                // ---- CHECKBOX CRITERION ----
                const existingSelected = existingScore ? existingScore.scores[ci] : [];
                const selectedArr = Array.isArray(existingSelected) ? existingSelected : [];
                const count = selectedArr.length;
                const level = checkboxCountToLevel(count);

                wrapper.innerHTML = `
                    <div class="score-question-label">
                        <span class="score-question-number">${ci + 1}</span>
                        <span class="score-criterion-label">${escapeHtml(criterion.label)}</span>
                        <span class="score-criterion-max">/ ${criterion.maxScore} puan</span>
                    </div>
                    <p class="score-criterion-desc">${escapeHtml(criterion.description)}</p>
                    <div class="checkbox-options-grid" id="checkbox-group-${ci}">
                        ${(criterion.options || []).map((opt, oi) => {
                            const isChecked = selectedArr.includes(opt);
                            return `
                                <label class="checkbox-option ${isChecked ? 'checked' : ''}" id="checkbox-option-${ci}-${oi}">
                                    <input type="checkbox" class="checkbox-input" 
                                           data-ci="${ci}" data-oi="${oi}" data-opt="${escapeHtml(opt)}"
                                           ${isChecked ? 'checked' : ''}>
                                    <span class="checkbox-icon">
                                        <svg viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                    </span>
                                    <span class="checkbox-text">${escapeHtml(opt)}</span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                    <div class="checkbox-score-display" id="checkbox-score-${ci}">
                        <div class="checkbox-score-info">
                            <span class="checkbox-count">Seçilen alan: <strong id="checkbox-count-val-${ci}">${count}</strong></span>
                            <span class="checkbox-level">Kazanım skoru: <strong id="checkbox-level-val-${ci}">${level}</strong>/5</span>
                        </div>
                        <div class="checkbox-weighted-score">
                            <span id="checkbox-weighted-${ci}">${level * (criterion.weight || 4)}</span>
                            <span class="checkbox-weighted-max">/${criterion.maxScore}</span>
                        </div>
                    </div>
                `;

                // Bind checkbox events after appending
                $scoringQuestions.appendChild(wrapper);

                const checkboxes = wrapper.querySelectorAll('.checkbox-input');
                checkboxes.forEach(cb => {
                    cb.addEventListener('change', function () {
                        const option = this.closest('.checkbox-option');
                        if (this.checked) {
                            option.classList.add('checked');
                        } else {
                            option.classList.remove('checked');
                        }
                        // Recalculate
                        const allChecked = wrapper.querySelectorAll('.checkbox-input:checked');
                        const newCount = allChecked.length;
                        const newLevel = checkboxCountToLevel(newCount);
                        document.getElementById(`checkbox-count-val-${ci}`).textContent = newCount;
                        document.getElementById(`checkbox-level-val-${ci}`).textContent = newLevel;
                        document.getElementById(`checkbox-weighted-${ci}`).textContent = newLevel * (criterion.weight || 4);
                        updateTotal();
                    });
                });
                return; // skip normal appendChild below
            }

            // ---- RADIO CRITERION ----
            const existingVal = existingScore ? existingScore.scores[ci] : 3;
            const currentVal = (typeof existingVal === 'number' && existingVal >= 1 && existingVal <= 5) ? existingVal : 3;
            const methodBadge = criterion.isMethod ? ` <span class="score-badge--method">METOT</span>` : '';

            wrapper.innerHTML = `
                <div class="score-question-label">
                    <span class="score-question-number">${ci + 1}</span>
                    <span class="score-criterion-label">${escapeHtml(criterion.label)}${methodBadge}</span>
                    <span class="score-criterion-max">/ ${criterion.maxScore} puan</span>
                </div>
                <p class="score-criterion-desc">${escapeHtml(criterion.description)}</p>
                <div class="radio-score-group" id="radio-group-${ci}">
                    ${[1, 2, 3, 4, 5].map(v => `
                        <label class="radio-score-item ${v === currentVal ? 'selected' : ''}">
                            <input type="radio" name="score-radio-${ci}" value="${v}" 
                                   data-ci="${ci}" class="radio-input" ${v === currentVal ? 'checked' : ''}>
                            <span class="radio-circle">${v}</span>
                        </label>
                    `).join('')}
                </div>
                <div class="impact-display" id="impact-display-${ci}">
                    <div class="impact-bar">
                        <div class="impact-bar-fill ${IMPACT_CLASSES[currentVal]}" id="impact-bar-fill-${ci}" style="width: ${currentVal * 20}%"></div>
                    </div>
                    <div class="impact-info">
                        <span class="impact-label ${IMPACT_CLASSES[currentVal]}" id="impact-label-${ci}">Etki: ${IMPACT_LABELS[currentVal]}</span>
                        <span class="impact-weighted-score">
                            <span id="impact-weighted-${ci}">${currentVal * (criterion.weight || 1)}</span>
                            <span class="impact-weighted-max">/${criterion.maxScore}</span>
                        </span>
                    </div>
                </div>
            `;

            $scoringQuestions.appendChild(wrapper);

            // Bind radio events
            const radios = wrapper.querySelectorAll('.radio-input');
            radios.forEach(radio => {
                radio.addEventListener('change', function () {
                    const val = parseInt(this.value);
                    // Update selected class on all items in this group
                    const group = wrapper.querySelectorAll('.radio-score-item');
                    group.forEach(item => item.classList.remove('selected'));
                    this.closest('.radio-score-item').classList.add('selected');
                    // Update impact display
                    const barFill = document.getElementById(`impact-bar-fill-${ci}`);
                    const label = document.getElementById(`impact-label-${ci}`);
                    const weighted = document.getElementById(`impact-weighted-${ci}`);
                    barFill.style.width = (val * 20) + '%';
                    barFill.className = 'impact-bar-fill ' + IMPACT_CLASSES[val];
                    label.textContent = 'Etki: ' + IMPACT_LABELS[val];
                    label.className = 'impact-label ' + IMPACT_CLASSES[val];
                    weighted.textContent = val * (criterion.weight || 1);
                    updateTotal();
                });
            });
        });

        updateTotal();
        $scoringModal.classList.add('active');
    }

    function closeScoring() {
        $scoringModal.classList.remove('active');
        currentScoringProject = null;
    }

    function updateTotal() {
        let total = 0;
        criteria.forEach((c, ci) => {
            if (c.type === 'checkbox') {
                const allChecked = document.querySelectorAll(`#checkbox-group-${ci} .checkbox-input:checked`);
                const level = checkboxCountToLevel(allChecked.length);
                total += level * (c.weight || 4);
            } else {
                const checked = document.querySelector(`input[name="score-radio-${ci}"]:checked`);
                if (checked) {
                    total += parseInt(checked.value) * (c.weight || 1);
                }
            }
        });
        $scoringTotal.textContent = total;
    }

    // ==================== SAVE SCORE ====================
    async function handleSaveScore(e) {
        e.preventDefault();
        if (!currentScoringProject || !currentJuror) return;

        const scores = criteria.map((c, ci) => {
            if (c.type === 'checkbox') {
                const allChecked = document.querySelectorAll(`#checkbox-group-${ci} .checkbox-input:checked`);
                return Array.from(allChecked).map(cb => cb.dataset.opt);
            } else {
                const checked = document.querySelector(`input[name="score-radio-${ci}"]:checked`);
                return checked ? parseInt(checked.value) : 3;
            }
        });

        let savedSuccessfully = false;
        try {
            const res = await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jurorId: currentJuror.id,
                    projectId: currentScoringProject.id,
                    scores: scores
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                showToast(errData.message || 'Puan kaydetme hatası', 'error');
                return;
            }

            const data = await res.json();
            if (data.success) {
                jurorScores[currentScoringProject.id] = data.score;
                savedSuccessfully = true;
            } else {
                showToast(data.message || 'Puan kaydetme hatası', 'error');
                return;
            }
        } catch (err) {
            showToast('Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.', 'error');
            return;
        }

        if (savedSuccessfully) {
            closeScoring();
            try {
                renderProjects();
                updateProgress();
            } catch (renderErr) {
                console.error('Render error:', renderErr);
            }
            showToast(`"${currentScoringProject ? currentScoringProject.name : ''}" puanları kaydedildi!`, 'success');
        }
    }

    // ==================== TOAST ====================
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.textContent = message;
        $toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'toast-out 0.4s ease forwards';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    document.addEventListener('DOMContentLoaded', init);
})();
