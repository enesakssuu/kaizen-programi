// ==================== JURI.JS ====================
// Jüri paneli: Giriş, puanlama, oturum yönetimi

(function () {
    'use strict';

    // ==================== STATE ====================
    let currentJuror = null;
    let projects = [];
    let jurorScores = {};
    let criteria = [];
    let currentScoringProject = null;

    // ==================== DOM ELEMENTS ====================
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

    // ==================== SESSION ====================
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

    // ==================== EVENTS ====================
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
        $jurorNameDisplay.textContent = currentJuror.name;
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

    // ==================== RENDER PROJECTS ====================
    function renderProjects() {
        $projectsGrid.innerHTML = '';

        if (projects.length === 0) {
            $emptyState.classList.remove('hidden');
            return;
        }

        $emptyState.classList.add('hidden');
        const maxScore = criteria.reduce((s, c) => s + c.maxScore, 0);

        projects.forEach((project, index) => {
            const score = jurorScores[project.id];
            const isScored = !!score;

            const card = document.createElement('div');
            card.className = 'project-card' + (isScored ? ' scored' : '');
            card.style.animationDelay = (index * 0.05) + 's';

            let scoreHtml = '';
            if (isScored) {
                scoreHtml = `
                    <div class="project-card-score">
                        <span class="project-card-score-value">${score.total}</span>
                        <span class="project-card-score-max">/ ${maxScore}</span>
                    </div>
                `;
            }

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
                ${scoreHtml}
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

    // ==================== SCORING ====================
    function openScoring(project) {
        currentScoringProject = project;
        $scoringProjectName.textContent = project.name;
        $scoringProjectTeam.textContent = project.team || '';

        $scoringQuestions.innerHTML = '';

        const existingScore = jurorScores[project.id];
        const maxTotal = criteria.reduce((s, c) => s + c.maxScore, 0);

        if ($scoringTotalMax) $scoringTotalMax.textContent = maxTotal;

        criteria.forEach((criterion, index) => {
            const existingVal = existingScore ? existingScore.scores[index] : (criterion.isBonus ? 0 : Math.round(criterion.maxScore / 2));

            const questionDiv = document.createElement('div');

            if (criterion.isBonus) {
                // Bonus criteria: Yes/No toggle
                const isChecked = existingVal === criterion.maxScore;
                questionDiv.className = 'score-question score-question--bonus';
                questionDiv.innerHTML = `
                    <div class="score-question-label">
                        <span class="score-question-number score-badge--bonus">BONUS</span>
                        <span class="score-criterion-label">${escapeHtml(criterion.label)}</span>
                        <span class="score-criterion-max">+${criterion.maxScore} puan</span>
                    </div>
                    <p class="score-criterion-desc">${escapeHtml(criterion.description)}</p>
                    <div class="bonus-toggle-row">
                        <label class="bonus-toggle" for="bonus-toggle-${index}">
                            <input type="checkbox" id="bonus-toggle-${index}" data-index="${index}" data-maxscore="${criterion.maxScore}" class="bonus-checkbox" ${isChecked ? 'checked' : ''}>
                            <span class="bonus-toggle-track">
                                <span class="bonus-toggle-thumb"></span>
                            </span>
                            <span class="bonus-toggle-label" id="bonus-label-${index}">${isChecked ? 'Evet — +' + criterion.maxScore + ' puan eklendi' : 'Hayır — bonus yok'}</span>
                        </label>
                    </div>
                `;
                questionDiv.querySelector('.bonus-checkbox').addEventListener('change', function () {
                    const lbl = document.getElementById('bonus-label-' + index);
                    if (this.checked) {
                        lbl.textContent = 'Evet — +' + this.dataset.maxscore + ' puan eklendi';
                        lbl.classList.add('bonus-active');
                    } else {
                        lbl.textContent = 'Hayır — bonus yok';
                        lbl.classList.remove('bonus-active');
                    }
                    updateTotal();
                });
                // Set initial label state
                if (isChecked) {
                    const lbl = questionDiv.querySelector('.bonus-toggle-label');
                    if (lbl) lbl.classList.add('bonus-active');
                }
            } else {
                // Normal criteria: slider with its own max
                questionDiv.className = 'score-question';
                questionDiv.innerHTML = `
                    <div class="score-question-label">
                        <span class="score-question-number">${getBaseIndex(index)}</span>
                        <span class="score-criterion-label">${escapeHtml(criterion.label)}</span>
                        <span class="score-criterion-max">/ ${criterion.maxScore} puan</span>
                    </div>
                    <p class="score-criterion-desc">${escapeHtml(criterion.description)}</p>
                    <div class="score-slider-container">
                        <div class="score-slider-labels">
                            <span>0</span>
                            <span>${Math.round(criterion.maxScore / 2)}</span>
                            <span>${criterion.maxScore}</span>
                        </div>
                        <input type="range" class="score-slider" min="0" max="${criterion.maxScore}" value="${existingVal}"
                               data-index="${index}" id="score-slider-${index}">
                        <div class="score-value-display ${getScoreClass(existingVal, criterion.maxScore)}" id="score-display-${index}">
                            ${existingVal}<span class="score-display-max">/${criterion.maxScore}</span>
                        </div>
                    </div>
                `;

                const slider = questionDiv.querySelector('.score-slider');
                const display = questionDiv.querySelector('.score-value-display');
                slider.addEventListener('input', function () {
                    const val = parseInt(this.value);
                    display.innerHTML = val + `<span class="score-display-max">/${criterion.maxScore}</span>`;
                    display.className = 'score-value-display ' + getScoreClass(val, criterion.maxScore);
                    updateTotal();
                });
            }

            $scoringQuestions.appendChild(questionDiv);
        });

        updateTotal();
        $scoringModal.classList.add('active');
    }

    // Get base index (skip bonus labels for numbering)
    function getBaseIndex(idx) {
        let num = 0;
        for (let i = 0; i <= idx; i++) {
            if (!criteria[i].isBonus) num++;
        }
        return num;
    }

    function closeScoring() {
        $scoringModal.classList.remove('active');
        currentScoringProject = null;
    }

    function updateTotal() {
        let total = 0;
        criteria.forEach((criterion, index) => {
            if (criterion.isBonus) {
                const checkbox = document.getElementById('bonus-toggle-' + index);
                if (checkbox && checkbox.checked) total += criterion.maxScore;
            } else {
                const slider = document.getElementById('score-slider-' + index);
                if (slider) total += parseInt(slider.value);
            }
        });
        $scoringTotal.textContent = total;
    }

    function getScoreClass(val, max) {
        const ratio = val / max;
        if (ratio >= 0.7) return 'high';
        if (ratio >= 0.4) return 'mid';
        return 'low';
    }

    // ==================== SAVE SCORE ====================
    async function handleSaveScore(e) {
        e.preventDefault();
        if (!currentScoringProject || !currentJuror) return;

        const scores = [];
        criteria.forEach((criterion, index) => {
            if (criterion.isBonus) {
                const checkbox = document.getElementById('bonus-toggle-' + index);
                scores.push(checkbox && checkbox.checked ? criterion.maxScore : 0);
            } else {
                const slider = document.getElementById('score-slider-' + index);
                scores.push(slider ? parseInt(slider.value) : 0);
            }
        });

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

            const data = await res.json();

            if (data.success) {
                jurorScores[currentScoringProject.id] = data.score;
                closeScoring();
                renderProjects();
                updateProgress();
                showToast(`"${currentScoringProject.name}" puanları kaydedildi!`, 'success');
            } else {
                showToast(data.message || 'Puan kaydetme hatası', 'error');
            }
        } catch (err) {
            showToast('Bağlantı hatası. Lütfen tekrar deneyin.', 'error');
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

    // ==================== UTILITY ====================
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ==================== START ====================
    document.addEventListener('DOMContentLoaded', init);
})();
