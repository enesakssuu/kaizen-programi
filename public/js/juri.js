// ==================== JURI.JS ====================
(function () {
    'use strict';

    let currentJuror = null;
    let projects = [];
    let jurorScores = {};
    let criteria = [];
    let currentScoringProject = null;

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

    // ==================== SCORE SLOTS ====================
    // Build flat score slots matching server expectation: criterion + subBonus interleaved
    function buildSlots() {
        const slots = [];
        criteria.forEach((c, ci) => {
            slots.push({ criterionIndex: ci, isSubBonus: false, label: c.label, maxScore: c.maxScore, id: c.id });
            if (c.subBonus) {
                slots.push({ criterionIndex: ci, isSubBonus: true, label: c.subBonus.label, maxScore: c.subBonus.maxScore, id: c.subBonus.id });
            }
        });
        return slots;
    }

    function maxTotal() {
        return buildSlots().reduce((s, slot) => s + slot.maxScore, 0);
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
        const slots = buildSlots();
        const max = maxTotal();
        if ($scoringTotalMax) $scoringTotalMax.textContent = max;

        // Render criteria; group subBonus inside its parent criterion card
        let slotIndex = 0;
        let criterionNum = 0;

        criteria.forEach((criterion) => {
            const mainSlot = slots[slotIndex];
            const mainExisting = existingScore ? existingScore.scores[slotIndex] : Math.round(criterion.maxScore / 2);
            const mainSlotIndex = slotIndex;
            slotIndex++;

            criterionNum++;
            const wrapper = document.createElement('div');
            wrapper.className = 'score-question';

            // Main criterion slider
            const methodBadge = criterion.isMethod ? ` <span class="score-badge--method">METOT</span>` : '';
            wrapper.innerHTML = `
                <div class="score-question-label">
                    <span class="score-question-number">${criterionNum}</span>
                    <span class="score-criterion-label">${escapeHtml(criterion.label)}${methodBadge}</span>
                    <span class="score-criterion-max">/ ${criterion.maxScore} puan</span>
                </div>
                <p class="score-criterion-desc">${escapeHtml(criterion.description)}</p>
                <div class="score-slider-container">
                    <div class="score-slider-row">
                        <input type="range" class="score-slider" min="0" max="${criterion.maxScore}" value="${mainExisting}"
                               data-slot-index="${mainSlotIndex}" id="score-slider-${mainSlotIndex}">
                        <div class="score-value-display ${getScoreClass(mainExisting, criterion.maxScore)}" id="score-display-${mainSlotIndex}">
                            ${mainExisting}<span class="score-display-max">/${criterion.maxScore}</span>
                        </div>
                    </div>
                </div>
            `;

            const slider = wrapper.querySelector('.score-slider');
            const display = wrapper.querySelector('.score-value-display');
            slider.addEventListener('input', function () {
                const val = parseInt(this.value);
                display.innerHTML = val + `<span class="score-display-max">/${criterion.maxScore}</span>`;
                display.className = 'score-value-display ' + getScoreClass(val, criterion.maxScore);
                updateTotal();
            });

            // SubBonus: render inside this card
            if (criterion.subBonus) {
                const bonusSlot = slots[slotIndex];
                const bonusExisting = existingScore ? existingScore.scores[slotIndex] : 0;
                const bonusSlotIndex = slotIndex;
                slotIndex++;

                const isChecked = bonusExisting === criterion.subBonus.maxScore;
                const bonusDiv = document.createElement('div');
                bonusDiv.className = 'sub-bonus-block';
                bonusDiv.innerHTML = `
                    <div class="sub-bonus-header">
                        <span class="score-badge--bonus">+${criterion.subBonus.maxScore} BONUS</span>
                        <span class="sub-bonus-label">${escapeHtml(criterion.subBonus.label)}</span>
                    </div>
                    <p class="score-criterion-desc">${escapeHtml(criterion.subBonus.description)}</p>
                    <label class="bonus-toggle" for="bonus-toggle-${bonusSlotIndex}">
                        <input type="checkbox" id="bonus-toggle-${bonusSlotIndex}" 
                               data-slot-index="${bonusSlotIndex}" 
                               data-maxscore="${criterion.subBonus.maxScore}" 
                               class="bonus-checkbox" ${isChecked ? 'checked' : ''}>
                        <span class="bonus-toggle-track"><span class="bonus-toggle-thumb"></span></span>
                        <span class="bonus-toggle-label ${isChecked ? 'bonus-active' : ''}" id="bonus-label-${bonusSlotIndex}">
                            ${isChecked ? 'Evet — +' + criterion.subBonus.maxScore + ' puan eklendi' : 'Hayır — bonus yok'}
                        </span>
                    </label>
                `;
                bonusDiv.querySelector('.bonus-checkbox').addEventListener('change', function () {
                    const lbl = document.getElementById('bonus-label-' + bonusSlotIndex);
                    if (this.checked) {
                        lbl.textContent = 'Evet — +' + this.dataset.maxscore + ' puan eklendi';
                        lbl.classList.add('bonus-active');
                    } else {
                        lbl.textContent = 'Hayır — bonus yok';
                        lbl.classList.remove('bonus-active');
                    }
                    updateTotal();
                });
                wrapper.appendChild(bonusDiv);
            }

            $scoringQuestions.appendChild(wrapper);
        });

        updateTotal();
        $scoringModal.classList.add('active');
    }

    function closeScoring() {
        $scoringModal.classList.remove('active');
        currentScoringProject = null;
    }

    function updateTotal() {
        const slots = buildSlots();
        let total = 0;
        slots.forEach((slot, i) => {
            if (slot.isSubBonus) {
                const cb = document.getElementById('bonus-toggle-' + i);
                if (cb && cb.checked) total += slot.maxScore;
            } else {
                const sl = document.getElementById('score-slider-' + i);
                if (sl) total += parseInt(sl.value);
            }
        });
        $scoringTotal.textContent = total;
    }

    function getScoreClass(val, max) {
        const ratio = max > 0 ? val / max : 0;
        if (ratio >= 0.7) return 'high';
        if (ratio >= 0.4) return 'mid';
        return 'low';
    }

    // ==================== SAVE SCORE ====================
    async function handleSaveScore(e) {
        e.preventDefault();
        if (!currentScoringProject || !currentJuror) return;

        const slots = buildSlots();
        const scores = slots.map((slot, i) => {
            if (slot.isSubBonus) {
                const cb = document.getElementById('bonus-toggle-' + i);
                return cb && cb.checked ? slot.maxScore : 0;
            } else {
                const sl = document.getElementById('score-slider-' + i);
                return sl ? parseInt(sl.value) : 0;
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
