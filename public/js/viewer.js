// ==================== VIEWER.JS ====================
// İzleyici ekranı: Polling ile gerçek zamanlı güncellemeler, geri sayım ve açıklama animasyonları

(function () {
    'use strict';

    // ==================== STATE ====================
    let revealedProjects = [];
    let rankings = [];
    let countdownSeconds = 10;
    let isAnimating = false;
    let countdownInterval = null;
    let revealTimeout = null;

    // ==================== DOM ELEMENTS ====================
    const $particles = document.getElementById('particles');
    const $waitingState = document.getElementById('waiting-state');
    const $countdownOverlay = document.getElementById('countdown-overlay');
    const $countdownNumber = document.getElementById('countdown-number');
    const $countdownRankText = document.getElementById('countdown-rank-text');
    const $ringProgress = document.getElementById('ring-progress');
    const $revealOverlay = document.getElementById('reveal-overlay');
    const $revealRankBadge = document.getElementById('reveal-rank-badge');
    const $revealRankNum = document.getElementById('reveal-rank-num');
    const $revealProjectName = document.getElementById('reveal-project-name');
    const $revealProjectTeam = document.getElementById('reveal-project-team');
    const $revealScoreValue = document.getElementById('reveal-score-value');
    const $rankingsList = document.getElementById('rankings-list');
    const $rankingsTitle = document.getElementById('rankings-title');
    const $rankingsSection = document.getElementById('rankings-section');
    const $confettiContainer = document.getElementById('confetti-container');

    const CIRCUMFERENCE = 2 * Math.PI * 120; // ~753.98

    // ==================== INIT ====================
    function init() {
        createParticles();
        startPolling();
    }

    // ==================== PARTICLES ====================
    function createParticles() {
        for (let i = 0; i < 20; i++) {
            const p = document.createElement('div');
            p.classList.add('particle');
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDelay = Math.random() * 15 + 's';
            p.style.animationDuration = (10 + Math.random() * 15) + 's';
            const size = 1 + Math.random() * 3;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            $particles.appendChild(p);
        }
    }

    // ==================== POLLING ====================
    function startPolling() {
        pollStatus();
        setInterval(pollStatus, 2000);
    }

    async function pollStatus() {
        try {
            const res = await fetch('/api/presentation/status');
            const data = await res.json();
            handleStatusUpdate(data);
        } catch (err) {
            console.error('Polling error:', err);
        }
    }

    function handleStatusUpdate(data) {
        rankings = data.rankings || [];
        countdownSeconds = data.settings?.countdownSeconds || 10;
        
        const revealed = data.presentation?.revealedRanks || [];
        
        // Handle reset
        if (revealed.length === 0 && revealedProjects.length > 0) {
            handleReset();
            return;
        }

        if (revealed.length > 0 && rankings.length > 0) {
            // Find ranks in revealed that we haven't processed yet
            const newRanks = revealed.filter(r => !revealedProjects.some(rp => rp.rank === r));
            
            if (newRanks.length > 0) {
                newRanks.sort((a, b) => a - b);
                const nextToReveal = newRanks[0];
                const projectIndex = nextToReveal - 1;
                const project = rankings[projectIndex];
                
                if (project && !isAnimating) {
                    isAnimating = true;
                    startCountdown(nextToReveal, project);
                }
            }

            // Sync list for already revealed items (in case of page refresh/load)
            if (!isAnimating) {
                const sorted = [...revealed].sort((a, b) => a - b);
                let changed = false;
                sorted.forEach(rank => {
                    const projectIndex = rank - 1;
                    if (rankings[projectIndex] && !revealedProjects.some(rp => rp.rank === rank)) {
                        revealedProjects.push({ rank, project: rankings[projectIndex] });
                        changed = true;
                    }
                });
                if (changed) {
                    revealedProjects.sort((a, b) => a - b);
                    renderList(null);
                    updateRankingsTitle();
                }
            }
        }
        updateWaitingVisibility();
    }

    function handleReset() {
        // Clear all timers
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        if (revealTimeout) {
            clearTimeout(revealTimeout);
            revealTimeout = null;
        }

        revealedProjects = [];
        $rankingsList.innerHTML = '';
        $rankingsTitle.textContent = '';
        hideOverlay($countdownOverlay);
        hideOverlay($revealOverlay);
        $confettiContainer.classList.add('hidden');
        $confettiContainer.innerHTML = '';
        isAnimating = false;
        updateWaitingVisibility();
    }

    // ==================== COUNTDOWN ====================
    function startCountdown(rank, project) {
        // Hide waiting, show countdown
        $waitingState.classList.add('hidden');
        showOverlay($countdownOverlay);
        hideOverlay($revealOverlay);

        $countdownRankText.textContent = '#' + rank;

        // Reset ring
        $ringProgress.style.transition = 'none';
        $ringProgress.style.strokeDasharray = CIRCUMFERENCE;
        $ringProgress.style.strokeDashoffset = '0';

        let remaining = countdownSeconds;
        updateCountdownDisplay(remaining, countdownSeconds);

        // Force reflow for transition reset
        void $ringProgress.offsetWidth;
        $ringProgress.style.transition = 'stroke-dashoffset 1s linear';

        countdownInterval = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(countdownInterval);
                countdownInterval = null;
                hideOverlay($countdownOverlay);
                showReveal(rank, project);
            } else {
                updateCountdownDisplay(remaining, countdownSeconds);
            }
        }, 1000);
    }

    function updateCountdownDisplay(remaining, total) {
        $countdownNumber.textContent = remaining;
        $countdownNumber.classList.remove('tick');
        void $countdownNumber.offsetWidth;
        $countdownNumber.classList.add('tick');

        const offset = CIRCUMFERENCE * (1 - remaining / total);
        $ringProgress.style.strokeDashoffset = offset;
    }

    // ==================== REVEAL ====================
    function showReveal(rank, project) {
        showOverlay($revealOverlay);

        // Set rank badge class
        let rankClass = 'rank-default';
        if (rank === 1) rankClass = 'rank-gold';
        else if (rank === 2) rankClass = 'rank-silver';
        else if (rank === 3) rankClass = 'rank-bronze';

        $revealRankBadge.className = 'reveal-rank-badge ' + rankClass;
        $revealRankNum.textContent = '#' + rank;
        $revealProjectName.textContent = project.projectName;
        $revealProjectTeam.textContent = project.projectTeam || '';
        $revealScoreValue.textContent = project.averageScore.toFixed(1);

        // Confetti for top 3
        if (rank <= 3) {
            launchConfetti();
        }

        // After delay, move to list
        revealTimeout = setTimeout(() => {
            hideOverlay($revealOverlay);
            $confettiContainer.classList.add('hidden');
            $confettiContainer.innerHTML = '';
            addToList(rank, project, true);
            updateRankingsTitle();
            isAnimating = false;
            updateWaitingVisibility();
            revealTimeout = null;
        }, 5000);
    }

    // ==================== RANKINGS LIST ====================
    function addToList(rank, project, animate) {
        // Check if already in list
        if (revealedProjects.some(r => r.rank === rank)) return;

        revealedProjects.push({ rank, project });
        // Sort by rank: 1st place at the top, down to 10th
        revealedProjects.sort((a, b) => a.rank - b.rank);

        renderList(animate ? rank : null);
    }

    function renderList(animateRank) {
        $rankingsList.innerHTML = '';

        revealedProjects.forEach((item, index) => {
            const { rank, project } = item;
            const el = document.createElement('div');
            el.className = 'ranking-item';

            if (rank <= 3) el.classList.add('rank-' + rank);
            if (animateRank === rank) el.classList.add('new-item');
            el.style.animationDelay = (index * 0.03) + 's';

            const percent = (project.averageScore / project.maxScore) * 100;

            el.innerHTML = `
                <div class="ranking-badge">${rank}</div>
                <div class="ranking-info">
                    <div class="ranking-project-name">${escapeHtml(project.projectName)}</div>
                    ${project.projectTeam ? `<div class="ranking-project-team">${escapeHtml(project.projectTeam)}</div>` : ''}
                </div>
                <div class="ranking-score">
                    <div class="ranking-score-bar">
                        <div class="ranking-score-fill" style="width: ${percent}%"></div>
                    </div>
                    <span class="ranking-score-value">${project.averageScore.toFixed(1)}/${project.maxScore}</span>
                </div>
            `;

            $rankingsList.appendChild(el);
        });
    }

    function updateRankingsTitle() {
        if (revealedProjects.length > 0) {
            $rankingsTitle.textContent = `SIRALAMA (${revealedProjects.length}/10)`;
        } else {
            $rankingsTitle.textContent = '';
        }
    }

    // ==================== UI HELPERS ====================
    function updateWaitingVisibility() {
        if (isAnimating || revealedProjects.length >= 10) {
            $waitingState.classList.add('hidden');
        } else {
            $waitingState.classList.remove('hidden');
        }
    }

    function showOverlay(el) {
        el.classList.remove('hidden');
    }

    function hideOverlay(el) {
        el.classList.add('hidden');
    }

    // ==================== CONFETTI ====================
    function launchConfetti() {
        $confettiContainer.classList.remove('hidden');
        $confettiContainer.innerHTML = '';

        const colors = ['#818cf8', '#6366f1', '#4f46e5', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

        for (let i = 0; i < 80; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDuration = (2 + Math.random() * 3) + 's';
            confetti.style.animationDelay = Math.random() * 1 + 's';

            const size = 5 + Math.random() * 6;
            confetti.style.width = size + 'px';
            confetti.style.height = size + 'px';
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';

            $confettiContainer.appendChild(confetti);
        }
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
