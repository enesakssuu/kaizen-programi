// ==================== ADMIN.JS ====================
// Admin paneli: Proje/jüri yönetimi, puanlar, sunum kontrolü, ayarlar

(function () {
    'use strict';

    // ==================== STATE ====================
    let isLoggedIn = false;
    let projects = [];
    let jurors = [];
    let allScores = {};
    let rankings = [];
    let presentationStatus = null;
    let settings = {};
    let revealInProgress = false;
    let currentQuestions = [];

    // ==================== DOM ELEMENTS ====================
    const $loginSection = document.getElementById('admin-login');
    const $dashboard = document.getElementById('admin-dashboard');
    const $loginForm = document.getElementById('admin-login-form');
    const $loginPassword = document.getElementById('admin-password');
    const $loginError = document.getElementById('admin-login-error');
    const $logoutBtn = document.getElementById('admin-logout-btn');
    const $toastContainer = document.getElementById('toast-container');

    // Tabs
    const $tabs = document.querySelectorAll('.admin-tab');
    const $projectsCount = document.getElementById('projects-count');
    const $jurorsCount = document.getElementById('jurors-count');

    // Projects
    const $projectNameInput = document.getElementById('project-name-input');
    const $projectTeamInput = document.getElementById('project-team-input');
    const $addProjectBtn = document.getElementById('add-project-btn');
    const $projectsList = document.getElementById('projects-list');

    // Jurors
    const $jurorNameInput = document.getElementById('juror-name-input');
    const $addJurorBtn = document.getElementById('add-juror-btn');
    const $jurorsList = document.getElementById('jurors-list');

    // Scores
    const $refreshScoresBtn = document.getElementById('refresh-scores-btn');
    const $rankingsTbody = document.getElementById('rankings-tbody');
    const $matrixThead = document.getElementById('matrix-thead');
    const $matrixTbody = document.getElementById('matrix-tbody');

    // Presentation
    const $revealStatus = document.getElementById('reveal-status');
    const $revealNextBtn = document.getElementById('reveal-next-btn');
    const $revealInfo = document.getElementById('reveal-info');
    const $resetPresentationBtn = document.getElementById('reset-presentation-btn');

    // Settings
    const $countdownInput = document.getElementById('countdown-seconds-input');
    const $saveCountdownBtn = document.getElementById('save-countdown-btn');
    const $adminNewPassword = document.getElementById('admin-new-password-input');
    const $savePasswordBtn = document.getElementById('save-password-btn');
    const $questionsList = document.getElementById('questions-list');
    const $saveQuestionsBtn = document.getElementById('save-questions-btn');
    const $addQuestionBtn = document.getElementById('add-question-btn');

    // Resets
    const $resetProjectsBtn = document.getElementById('reset-projects-btn');
    const $resetJurorsBtn = document.getElementById('reset-jurors-btn');
    const $resetScoresBtn = document.getElementById('reset-scores-btn');
    const $resetAllBtn = document.getElementById('reset-all-btn');

    // ==================== INIT ====================
    function init() {
        checkSession();
        bindEvents();
    }

    // ==================== SESSION ====================
    function checkSession() {
        const saved = localStorage.getItem('kaizen_admin');
        if (saved === 'true') {
            isLoggedIn = true;
            showDashboard();
        }
    }

    // ==================== EVENTS ====================
    function bindEvents() {
        $loginForm.addEventListener('submit', handleLogin);
        $logoutBtn.addEventListener('click', handleLogout);

        // Tabs
        $tabs.forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        // Projects
        $addProjectBtn.addEventListener('click', addProject);
        $projectNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addProject(); });

        // Jurors
        $addJurorBtn.addEventListener('click', addJuror);
        $jurorNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addJuror(); });

        // Scores
        $refreshScoresBtn.addEventListener('click', loadAllScores);

        // Presentation
        $revealNextBtn.addEventListener('click', revealNext);
        $resetPresentationBtn.addEventListener('click', resetPresentation);

        // Settings
        $saveCountdownBtn.addEventListener('click', saveCountdown);
        $savePasswordBtn.addEventListener('click', savePassword);
        $saveQuestionsBtn.addEventListener('click', saveQuestions);
        $addQuestionBtn.addEventListener('click', addQuestionRow);

        // Resets
        $resetProjectsBtn.addEventListener('click', () => confirmReset('projects', 'Tüm projeler ve ilişkili puanlar silinecek. Emin misiniz?'));
        $resetJurorsBtn.addEventListener('click', () => confirmReset('jurors', 'Tüm jüriler ve ilişkili puanlar silinecek. Emin misiniz?'));
        $resetScoresBtn.addEventListener('click', () => confirmReset('scores', 'Tüm puanlar silinecek. Projeler ve jüriler korunacak. Emin misiniz?'));
        $resetAllBtn.addEventListener('click', () => confirmReset('all', 'DİKKAT: Tüm sistem sıfırlanacaktır (Projeler, jüriler ve puanlar silinecektir). Emin misiniz?'));
    }

    // ==================== RESETS ====================
    async function confirmReset(type, message) {
        if (!confirm(message)) return;

        try {
            const res = await fetch(`/api/settings/reset/${type}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast('Sıfırlama işlemi başarıyla tamamlandı.', 'success');
                await showDashboard();
            }
        } catch (err) {
            showToast('Sıfırlama sırasında hata oluştu.', 'error');
        }
    }

    // ==================== LOGIN ====================
    async function handleLogin(e) {
        e.preventDefault();
        const password = $loginPassword.value.trim();

        try {
            const res = await fetch('/api/auth/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const data = await res.json();
            if (data.success) {
                isLoggedIn = true;
                localStorage.setItem('kaizen_admin', 'true');
                $loginError.classList.remove('show');
                showDashboard();
            } else {
                $loginError.classList.add('show');
                $loginPassword.value = '';
            }
        } catch (err) {
            showToast('Bağlantı hatası', 'error');
        }
    }

    function handleLogout() {
        isLoggedIn = false;
        localStorage.removeItem('kaizen_admin');
        $dashboard.classList.add('hidden');
        $loginSection.classList.remove('hidden');
        $loginPassword.value = '';
    }

    async function showDashboard() {
        $loginSection.classList.add('hidden');
        $dashboard.classList.remove('hidden');

        await Promise.all([
            loadProjects(),
            loadJurors(),
            loadAllScores(),
            loadPresentationStatus(),
            loadSettings()
        ]);
    }

    // ==================== TABS ====================
    function switchTab(tabName) {
        $tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.toggle('active', section.id === 'section-' + tabName);
        });

        if (tabName === 'scores') loadAllScores();
        if (tabName === 'presentation') loadPresentationStatus();
        if (tabName === 'settings') loadSettings();
    }

    // ==================== PROJECTS ====================
    async function loadProjects() {
        try {
            const res = await fetch('/api/projects');
            projects = await res.json();
            renderProjects();
        } catch (err) {
            showToast('Projeler yüklenemedi', 'error');
        }
    }

    function renderProjects() {
        $projectsCount.textContent = projects.length;
        $projectsList.innerHTML = '';

        if (projects.length === 0) {
            $projectsList.innerHTML = '<div class="empty-state"><p class="empty-state-text">Henüz proje eklenmemiş</p></div>';
            return;
        }

        projects.forEach((project, index) => {
            const row = document.createElement('div');
            row.className = 'item-row';
            row.style.animationDelay = (index * 0.03) + 's';
            row.innerHTML = `
                <div class="item-number">${index + 1}</div>
                <div class="item-info">
                    <div class="item-name">${escapeHtml(project.name)}</div>
                    ${project.team ? `<div class="item-detail">${escapeHtml(project.team)}</div>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn btn-danger btn-sm" onclick="window._deleteProject(${project.id})" title="Sil">Sil</button>
                </div>
            `;
            $projectsList.appendChild(row);
        });
    }

    async function addProject() {
        const name = $projectNameInput.value.trim();
        const team = $projectTeamInput.value.trim();
        if (!name) return showToast('Proje adı girin', 'error');

        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, team })
            });

            const project = await res.json();
            if (project.id) {
                $projectNameInput.value = '';
                $projectTeamInput.value = '';
                $projectNameInput.focus();
                await loadProjects();
                showToast(`"${name}" eklendi`, 'success');
            }
        } catch (err) {
            showToast('Proje eklenemedi', 'error');
        }
    }

    window._deleteProject = async function (id) {
        if (!confirm('Bu projeyi silmek istediğinizden emin misiniz?')) return;

        try {
            await fetch('/api/projects/' + id, { method: 'DELETE' });
            await loadProjects();
            showToast('Proje silindi', 'info');
        } catch (err) {
            showToast('Proje silinemedi', 'error');
        }
    };

    // ==================== JURORS ====================
    async function loadJurors() {
        try {
            const res = await fetch('/api/jurors');
            jurors = await res.json();
            renderJurors();
        } catch (err) {
            showToast('Jüriler yüklenemedi', 'error');
        }
    }

    function renderJurors() {
        $jurorsCount.textContent = jurors.length;
        $jurorsList.innerHTML = '';

        if (jurors.length === 0) {
            $jurorsList.innerHTML = '<div class="empty-state"><p class="empty-state-text">Henüz jüri üyesi eklenmemiş</p></div>';
            return;
        }

        jurors.forEach((juror, index) => {
            const row = document.createElement('div');
            row.className = 'item-row';
            row.style.animationDelay = (index * 0.03) + 's';
            row.innerHTML = `
                <div class="item-number">${index + 1}</div>
                <div class="item-info">
                    <div class="item-name">${escapeHtml(juror.name)}</div>
                </div>
                <div class="item-pin">PIN: ${juror.pin}</div>
                <div class="item-actions">
                    <button class="btn btn-danger btn-sm" onclick="window._deleteJuror(${juror.id})" title="Sil">Sil</button>
                </div>
            `;
            $jurorsList.appendChild(row);
        });
    }

    async function addJuror() {
        const name = $jurorNameInput.value.trim();
        if (!name) return showToast('Jüri adı girin', 'error');

        try {
            const res = await fetch('/api/jurors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });

            const juror = await res.json();
            if (juror.id) {
                $jurorNameInput.value = '';
                $jurorNameInput.focus();
                await loadJurors();
                showToast(`"${name}" eklendi (PIN: ${juror.pin})`, 'success');
            }
        } catch (err) {
            showToast('Jüri eklenemedi', 'error');
        }
    }

    window._deleteJuror = async function (id) {
        if (!confirm('Bu jüri üyesini silmek istediğinizden emin misiniz?')) return;

        try {
            await fetch('/api/jurors/' + id, { method: 'DELETE' });
            await loadJurors();
            showToast('Jüri üyesi silindi', 'info');
        } catch (err) {
            showToast('Jüri silinemedi', 'error');
        }
    };

    // ==================== SCORES ====================
    async function loadAllScores() {
        try {
            const res = await fetch('/api/admin/all-scores');
            const data = await res.json();
            projects = data.projects;
            jurors = data.jurors;
            allScores = data.scores;
            rankings = data.rankings;
            renderRankings();
            renderScoreMatrix();
        } catch (err) {
            showToast('Puanlar yüklenemedi', 'error');
        }
    }

    function renderRankings() {
        $rankingsTbody.innerHTML = '';

        if (rankings.length === 0) {
            $rankingsTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:2rem;">Henüz puanlanmış proje yok</td></tr>';
            return;
        }

        rankings.forEach((r, index) => {
            const rank = index + 1;
            let rankClass = '';
            if (rank === 1) rankClass = 'rank-1';
            else if (rank === 2) rankClass = 'rank-2';
            else if (rank === 3) rankClass = 'rank-3';

            const maxScore = r.maxScore || 60;
            const percent = (r.averageScore / maxScore) * 100;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="rank-cell ${rankClass}">${rank}</span></td>
                <td style="font-weight:600;">${escapeHtml(r.projectName)}</td>
                <td style="color:var(--text-muted);">${escapeHtml(r.projectTeam)}</td>
                <td style="font-weight:700; font-family:var(--font-display);">${r.averageScore.toFixed(1)} / ${maxScore}</td>
                <td><span class="badge ${r.jurorCount === r.totalJurors ? 'badge-success' : 'badge-warning'}">${r.jurorCount} / ${r.totalJurors}</span></td>
                <td><span class="score-bar-mini"><span class="score-bar-mini-fill" style="width:${percent}%"></span></span></td>
            `;
            $rankingsTbody.appendChild(row);
        });
    }

    function renderScoreMatrix() {
        $matrixThead.innerHTML = '';
        $matrixTbody.innerHTML = '';

        if (projects.length === 0 || jurors.length === 0) {
            $matrixTbody.innerHTML = '<tr><td style="text-align:center; color:var(--text-muted); padding:2rem;">Veri yok</td></tr>';
            return;
        }

        // Header row
        let headerHtml = '<tr><th>Jüri</th>';
        projects.forEach(p => {
            headerHtml += `<th>${escapeHtml(p.name)}</th>`;
        });
        headerHtml += '</tr>';
        $matrixThead.innerHTML = headerHtml;

        // Data rows
        jurors.forEach(juror => {
            const row = document.createElement('tr');
            let html = `<td style="font-weight:600; white-space:nowrap;">${escapeHtml(juror.name)}</td>`;

            projects.forEach(project => {
                const key = `${juror.id}_${project.id}`;
                const score = allScores[key];
                if (score) {
                    html += `<td><span class="matrix-score scored">${score.total}</span></td>`;
                } else {
                    html += `<td><span class="matrix-score not-scored">—</span></td>`;
                }
            });

            row.innerHTML = html;
            $matrixTbody.appendChild(row);
        });
    }

    // ==================== PRESENTATION ====================
    async function loadPresentationStatus() {
        try {
            const res = await fetch('/api/presentation/status');
            const data = await res.json();
            presentationStatus = data.presentation;
            rankings = data.rankings;
            settings = data.settings;
            renderPresentationControl();
        } catch (err) {
            showToast('Sunum durumu yüklenemedi', 'error');
        }
    }

    function renderPresentationControl() {
        $revealStatus.innerHTML = '';

        const totalToShow = Math.min(10, rankings.length);
        const revealedRanks = presentationStatus?.revealedRanks || [];

        if (totalToShow === 0) {
            $revealStatus.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:1rem;">Henüz puanlanmış proje yok</p>';
            $revealNextBtn.disabled = true;
            $revealNextBtn.textContent = 'Açıklanacak proje yok';
            return;
        }

        const nextRank = totalToShow - revealedRanks.length;

        for (let rank = totalToShow; rank >= 1; rank--) {
            const project = rankings[rank - 1];
            const isRevealed = revealedRanks.includes(rank);
            const isNext = rank === nextRank;

            const item = document.createElement('div');
            item.className = 'reveal-status-item';

            if (isRevealed) {
                item.classList.add('revealed');
                item.innerHTML = `
                    <span class="reveal-status-icon status-revealed"></span>
                    <span>#${rank} — ${escapeHtml(project.projectName)} (${project.averageScore.toFixed(1)})</span>
                `;
            } else if (isNext) {
                item.classList.add('next');
                item.innerHTML = `
                    <span class="reveal-status-icon status-next"></span>
                    <span>#${rank} — Sıradaki açıklama</span>
                `;
            } else {
                item.classList.add('pending');
                item.innerHTML = `
                    <span class="reveal-status-icon status-pending"></span>
                    <span>#${rank} — Bekliyor</span>
                `;
            }

            $revealStatus.appendChild(item);
        }

        if (revealedRanks.length >= totalToShow) {
            $revealNextBtn.disabled = true;
            $revealNextBtn.textContent = 'Tüm sıralar açıklandı';
            $revealInfo.textContent = '';
        } else if (revealInProgress) {
            $revealNextBtn.disabled = true;
            $revealNextBtn.textContent = 'Açıklama devam ediyor...';
        } else {
            $revealNextBtn.disabled = false;
            $revealNextBtn.textContent = `${nextRank}. Sırayı Açıkla`;
            $revealInfo.textContent = `Geri sayım: ${settings.countdownSeconds || 10} saniye`;
        }
    }

    async function revealNext() {
        if (revealInProgress) return;
        revealInProgress = true;
        renderPresentationControl();

        try {
            const res = await fetch('/api/presentation/reveal', { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                showToast(`#${data.rank} açıklanıyor: ${data.project.projectName}`, 'success');

                const waitTime = ((settings.countdownSeconds || 10) + 6) * 1000;
                setTimeout(async () => {
                    revealInProgress = false;
                    await loadPresentationStatus();
                }, waitTime);
            } else {
                showToast(data.message || 'Açıklama hatası', 'error');
                revealInProgress = false;
                renderPresentationControl();
            }
        } catch (err) {
            showToast('Bağlantı hatası', 'error');
            revealInProgress = false;
            renderPresentationControl();
        }
    }

    async function resetPresentation() {
        if (!confirm('Sunumu sıfırlamak istediğinizden emin misiniz? İzleyici ekranındaki tüm açıklanmış sıralar silinecek.')) return;

        try {
            await fetch('/api/presentation/reset', { method: 'POST' });
            revealInProgress = false;
            await loadPresentationStatus();
            showToast('Sunum sıfırlandı', 'info');
        } catch (err) {
            showToast('Sıfırlama hatası', 'error');
        }
    }

    // ==================== SETTINGS ====================
    async function loadSettings() {
        try {
            const res = await fetch('/api/presentation/status');
            const data = await res.json();
            settings = data.settings;

            $countdownInput.value = settings.countdownSeconds || 10;

            const qRes = await fetch('/api/questions');
            const questions = await qRes.json();
            renderQuestions(questions);
        } catch (err) {
            showToast('Ayarlar yüklenemedi', 'error');
        }
    }

    function renderQuestions(questions) {
        currentQuestions = [...questions];
        $questionsList.innerHTML = '';

        currentQuestions.forEach((q, index) => {
            const item = document.createElement('div');
            item.className = 'question-item';
            item.innerHTML = `
                <span class="question-number">${index + 1}.</span>
                <input type="text" class="form-input question-input" value="${escapeHtml(q)}" data-index="${index}">
                <button type="button" class="btn btn-danger btn-sm question-delete-btn" data-index="${index}">Sil</button>
            `;
            $questionsList.appendChild(item);
        });

        // Bind dynamic delete events
        const deleteBtns = $questionsList.querySelectorAll('.question-delete-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = parseInt(this.dataset.index);
                // Collect current values from inputs to not lose user changes elsewhere
                saveCurrentQuestionsFromInputs();
                currentQuestions.splice(idx, 1);
                renderQuestions(currentQuestions);
            });
        });
    }

    function saveCurrentQuestionsFromInputs() {
        const inputs = $questionsList.querySelectorAll('.question-input');
        currentQuestions = [];
        inputs.forEach(input => {
            currentQuestions.push(input.value.trim());
        });
    }

    function addQuestionRow() {
        saveCurrentQuestionsFromInputs();
        currentQuestions.push('');
        renderQuestions(currentQuestions);
    }

    async function saveCountdown() {
        const seconds = parseInt($countdownInput.value);
        if (isNaN(seconds) || seconds < 3 || seconds > 30) {
            return showToast('Süre 3-30 saniye arasında olmalıdır', 'error');
        }

        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ countdownSeconds: seconds })
            });

            const data = await res.json();
            if (data.success) {
                showToast('Geri sayım süresi güncellendi', 'success');
            }
        } catch (err) {
            showToast('Kaydetme hatası', 'error');
        }
    }

    async function savePassword() {
        const password = $adminNewPassword.value.trim();
        if (!password) return showToast('Şifre boş olamaz', 'error');

        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminPassword: password })
            });

            const data = await res.json();
            if (data.success) {
                $adminNewPassword.value = '';
                showToast('Şifre güncellendi', 'success');
            }
        } catch (err) {
            showToast('Kaydetme hatası', 'error');
        }
    }

    async function saveQuestions() {
        saveCurrentQuestionsFromInputs();

        // Filter out empty questions
        const filtered = currentQuestions.filter(q => q && q.trim().length > 0);

        if (filtered.length === 0) {
            return showToast('En az bir soru eklemelisiniz', 'error');
        }

        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questions: filtered })
            });

            const data = await res.json();
            if (data.success) {
                showToast('Sorular güncellendi', 'success');
                renderQuestions(data.settings.questions);
            }
        } catch (err) {
            showToast('Kaydetme hatası', 'error');
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
        div.textContent = str || '';
        return div.innerHTML;
    }

    // ==================== START ====================
    document.addEventListener('DOMContentLoaded', init);
})();
