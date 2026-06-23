// ==================== VIEWER.JS ====================
// İzleyici ekranı: Polling ile gerçek zamanlı güncellemeler, geri sayım ve açıklama animasyonları

(function () {
    'use strict';

    // ==================== STATE ====================
    let revealedProjects = [];
    let lastRenderedRanksStr = '';
    let rankings = [];
    let countdownSeconds = 10;
    let winnerRevealSeconds = 10;
    let isAnimating = false;
    let countdownInterval = null;
    let revealTimeout = null;
    let presentationMode = 'timer'; // 'timer' or 'waiting'
    let timerState = null;
    let localTimerInterval = null;
    let serverTimeOffset = 0;
    let soundSettings = {
        countdownEnabled: true,
        countdownUrl: "",
        revealEnabled: true,
        revealUrl: ""
    };

    // ==================== DOM ELEMENTS ====================
    const $particles = document.getElementById('particles');
    const $waitingState = document.getElementById('waiting-state');
    const $timerState = document.getElementById('timer-state');
    const $welcomeState = document.getElementById('welcome-state');
    const $timerDays = document.getElementById('timer-days');
    const $timerHours = document.getElementById('timer-hours');
    const $timerMinutes = document.getElementById('timer-minutes');
    const $timerSeconds = document.getElementById('timer-seconds');
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
    const $viewerStage = document.getElementById('viewer-stage');
    
    const $rankingsRevealCard = document.getElementById('rankings-reveal-card');
    const $revealTwoContainer = document.getElementById('reveal-two-container');
    const $revealSilverProjectName = document.getElementById('reveal-silver-project-name');
    const $revealSilverProjectTeam = document.getElementById('reveal-silver-project-team');
    const $revealSilverScoreValue = document.getElementById('reveal-silver-score-value');
    const $revealSilverScoreMax = document.getElementById('reveal-silver-score-max');
    const $revealGoldProjectName = document.getElementById('reveal-gold-project-name');
    const $revealGoldProjectTeam = document.getElementById('reveal-gold-project-team');
    const $revealGoldScoreValue = document.getElementById('reveal-gold-score-value');
    const $revealGoldScoreMax = document.getElementById('reveal-gold-score-max');
    const $countdownRankLabel = document.querySelector('.countdown-rank-label');
    const $countdownSubtext = document.querySelector('.countdown-subtext');

    const $viewerHeaderTitle = document.getElementById('viewer-header-title');
    const $viewerHeaderSubtitle = document.getElementById('viewer-header-subtitle');

    // Scoreboard elements
    const $scoreboardState = document.getElementById('scoreboard-state');
    const $statTotalProjects = document.getElementById('stat-total-projects');
    const $statTotalJurors = document.getElementById('stat-total-jurors');
    const $statTotalVotes = document.getElementById('stat-total-votes');
    const $statConsensusLabel = document.getElementById('stat-consensus-label');
    const $scoreboardList = document.getElementById('scoreboard-list');

    // Podium elements
    const $podiumState = document.getElementById('podium-state');
    const $activePodiumView = document.getElementById('active-podium-view');
    const $lowerRankingsSection = document.getElementById('lower-rankings-section');
    const $lowerRankingsList = document.getElementById('lower-rankings-list');
    let goldAlreadyRevealed = false;

    // Podium Spots
    const podiumSpots = {
        1: {
            el: document.getElementById('spot-1'),
            name: document.getElementById('name-1'),
            team: document.getElementById('team-1'),
            score: document.getElementById('score-1')
        },
        2: {
            el: document.getElementById('spot-2'),
            name: document.getElementById('name-2'),
            team: document.getElementById('team-2'),
            score: document.getElementById('score-2')
        },
        3: {
            el: document.getElementById('spot-3'),
            name: document.getElementById('name-3'),
            team: document.getElementById('team-3'),
            score: document.getElementById('score-3')
        }
    };

    const CIRCUMFERENCE = 2 * Math.PI * 120; // ~753.98

    // ==================== INIT ====================
    function init() {
        createParticles();
        startPolling();
        initParallax();
    }
 
    // ==================== PARALLAX ====================
    function initParallax() {
        const $grid = document.querySelector('.grid-overlay');
        const $glowBlue = document.querySelector('.welcome-glow-blue');
        const $glowOrange = document.querySelector('.welcome-glow-orange');
        const $brand = document.querySelector('.welcome-top-brand');
        const $heading = document.querySelector('.welcome-heading');
        const $subtitle = document.querySelector('.welcome-subtitle-bubble');
        
        document.addEventListener('mousemove', (e) => {
            const moveX = (e.clientX - window.innerWidth / 2);
            const moveY = (e.clientY - window.innerHeight / 2);
            
            if ($grid) {
                // Background shifts with mouse
                $grid.style.transform = `translate(${moveX * 0.015}px, ${moveY * 0.015}px)`;
            }
            if ($glowBlue) {
                // Glow shifts with mouse
                $glowBlue.style.transform = `translate(${moveX * 0.025}px, ${moveY * 0.025}px)`;
            }
            if ($glowOrange) {
                // Glow shifts in opposite direction
                $glowOrange.style.transform = `translate(${moveX * -0.02}px, ${moveY * -0.02}px)`;
            }
            
            if (presentationMode === 'welcome') {
                // Layered parallax with different ratios for a true 3D depth effect
                if ($brand) {
                    $brand.style.transform = `translate(${moveX * -0.007}px, ${moveY * -0.007}px)`;
                }
                if ($heading) {
                    $heading.style.transform = `translate(${moveX * -0.016}px, ${moveY * -0.016}px)`;
                }
                if ($subtitle) {
                    $subtitle.style.transform = `translate(${moveX * -0.028}px, ${moveY * -0.028}px)`;
                }
                if ($viewerStage) {
                    $viewerStage.style.transform = 'none';
                }
            } else {
                if ($viewerStage) {
                    $viewerStage.style.transform = `translate(${moveX * -0.008}px, ${moveY * -0.008}px)`;
                }
                if ($brand) $brand.style.transform = 'none';
                if ($heading) $heading.style.transform = 'none';
                if ($subtitle) $subtitle.style.transform = 'none';
            }
        });
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
            const startTime = Date.now();
            const res = await fetch('/api/presentation/status');
            const data = await res.json();
            const endTime = Date.now();
            const rtt = endTime - startTime;
            if (typeof data.serverTime === 'number') {
                serverTimeOffset = (data.serverTime + rtt / 2) - endTime;
            }
            handleStatusUpdate(data);

            // Canlı Skor Tablosu modundaysak jüri oylaması verilerini çek
            if (data.presentation?.mode === 'scoreboard') {
                await pollScoreboardData();
            }
        } catch (err) {
            console.error('Polling error:', err);
        }
    }

    function handleStatusUpdate(data) {
        rankings = data.rankings || [];
        countdownSeconds = data.settings?.countdownSeconds || 10;
        winnerRevealSeconds = data.settings?.winnerRevealSeconds || 10;
        if (data.settings && data.settings.sounds) {
            soundSettings = data.settings.sounds;
        }
        presentationMode = data.presentation?.mode || 'timer';

        const revealed = data.presentation?.revealedRanks || [];
        
        // Handle reset
        if (revealed.length === 0 && revealedProjects.length > 0) {
            handleReset();
            return;
        }

        const timer = data.presentation?.timer;
        if (timer) {
            syncTimer(timer);
        }

        if (revealed.length > 0 && rankings.length > 0) {
            // Find ranks in revealed that we haven't processed yet
            const newRanks = revealed.filter(r => !revealedProjects.some(rp => rp.rank === r));
            
            if (newRanks.includes(2) && newRanks.includes(1)) {
                // Simultaneous reveal of 1 and 2
                if (!isAnimating) {
                    isAnimating = true;
                    startTopTwoCountdown(rankings[0], rankings[1]);
                }
            } else if (newRanks.length > 0) {
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

        if (presentationMode === 'podium') {
            renderPodium(data);
        }
        updateWaitingVisibility();
    }

    // Method handlers removed

    function syncTimer(timer) {
        const stateKey = `${timer.isRunning}_${timer.duration}_${timer.remaining}_${timer.lastUpdated}_${timer.targetTimestamp}`;
        if (timerState === stateKey) {
            return;
        }
        timerState = stateKey;

        if (localTimerInterval) {
            clearInterval(localTimerInterval);
            localTimerInterval = null;
        }

        function tick() {
            let remaining = timer.remaining;
            if (timer.isRunning && timer.targetTimestamp) {
                const now = Date.now() + serverTimeOffset;
                remaining = Math.max(0, Math.floor((timer.targetTimestamp - now) / 1000));
            } else if (timer.isRunning) {
                const elapsed = Math.floor((Date.now() - timer.lastUpdated) / 1000);
                remaining = Math.max(0, timer.remaining - elapsed);
            }

            const days = Math.floor(remaining / (24 * 3600));
            const hours = Math.floor((remaining % (24 * 3600)) / 3600);
            const minutes = Math.floor((remaining % 3600) / 60);
            const seconds = remaining % 60;

            $timerDays.textContent = String(days).padStart(2, '0');
            $timerHours.textContent = String(hours).padStart(2, '0');
            $timerMinutes.textContent = String(minutes).padStart(2, '0');
            $timerSeconds.textContent = String(seconds).padStart(2, '0');
        }

        tick();
        const initialNow = Date.now() + serverTimeOffset;
        const targetExpired = timer.targetTimestamp ? (timer.targetTimestamp <= initialNow) : (timer.remaining <= 0);
        if (timer.isRunning && !targetExpired) {
            localTimerInterval = setInterval(tick, 1000);
        }
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
        if (localTimerInterval) {
            clearInterval(localTimerInterval);
            localTimerInterval = null;
        }
        timerState = null;
        goldAlreadyRevealed = false;

        revealedProjects = [];
        lastRenderedRanksStr = '';
        $rankingsList.innerHTML = '';
        $rankingsTitle.textContent = '';
        hideOverlay($countdownOverlay);
        hideOverlay($revealOverlay);
        if ($welcomeState) $welcomeState.classList.add('hidden');
        if ($revealTwoContainer) $revealTwoContainer.classList.add('hidden');
        if ($rankingsRevealCard) $rankingsRevealCard.classList.remove('hidden');
        if ($scoreboardState) $scoreboardState.classList.add('hidden');
        if ($podiumState) $podiumState.classList.add('hidden');
        
        // Hide podium spots
        [1, 2, 3].forEach(r => {
            if (podiumSpots[r] && podiumSpots[r].el) {
                podiumSpots[r].el.classList.add('hidden');
            }
        });
        if ($lowerRankingsList) $lowerRankingsList.innerHTML = '';
        if ($lowerRankingsSection) $lowerRankingsSection.classList.add('hidden');

        $confettiContainer.classList.add('hidden');
        $confettiContainer.innerHTML = '';
        isAnimating = false;
        updateWaitingVisibility();
    }

    // ==================== COUNTDOWN ====================
    function startCountdown(rank, project) {
        // Hide waiting and welcome states, show countdown
        $waitingState.classList.add('hidden');
        if ($welcomeState) $welcomeState.classList.add('hidden');
        showOverlay($countdownOverlay);
        hideOverlay($revealOverlay);

        if ($countdownRankLabel) {
            $countdownRankLabel.innerHTML = 'Açıklanacak Sıra: <span id="countdown-rank-text">#' + rank + '</span>';
        }
        if ($countdownSubtext) {
            $countdownSubtext.textContent = 'Sonuç hazırlanıyor';
        }

        // Reset ring
        $ringProgress.style.transition = 'none';
        $ringProgress.style.strokeDasharray = CIRCUMFERENCE;
        $ringProgress.style.strokeDashoffset = '0';

        let remaining = countdownSeconds;
        updateCountdownDisplay(remaining, countdownSeconds);
        playTick();
 
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
                playTick();
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
        playReveal();
 
        if ($rankingsRevealCard) $rankingsRevealCard.classList.remove('hidden');

        // Set rank badge class
        let rankClass = 'rank-default';
        if (rank === 1) rankClass = 'rank-gold';
        else if (rank === 2) rankClass = 'rank-silver';
        else if (rank === 3) rankClass = 'rank-bronze';

        if ($rankingsRevealCard) $rankingsRevealCard.className = 'reveal-card ' + rankClass;
        $revealRankBadge.className = 'reveal-rank-badge ' + rankClass;
        $revealRankNum.textContent = '#' + rank;
        $revealProjectName.textContent = project.projectName;
        $revealProjectTeam.textContent = project.projectTeam || '';
        $revealScoreValue.textContent = project.averageScore.toFixed(1);
        const $revealScoreMax = document.getElementById('reveal-score-max');
        if ($revealScoreMax) {
            $revealScoreMax.textContent = '/' + (project.maxScore || 100);
        }

        // Confetti for top 3
        if (rank <= 3) {
            launchConfetti(rank);
        }

        const revealDuration = rank === 1 ? (winnerRevealSeconds * 1000) : 5000;

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
        }, revealDuration);
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
            $rankingsTitle.textContent = `SIRALAMA`;
        } else {
            $rankingsTitle.textContent = '';
        }
    }

    // ==================== UI HELPERS ====================
    function updateHeader(title, subtitle) {
        if ($viewerHeaderTitle) {
            $viewerHeaderTitle.textContent = title;
            if (title) {
                $viewerHeaderTitle.classList.remove('hidden');
            } else {
                $viewerHeaderTitle.classList.add('hidden');
            }
        }
        if ($viewerHeaderSubtitle) {
            $viewerHeaderSubtitle.textContent = subtitle;
            if (subtitle) {
                $viewerHeaderSubtitle.classList.remove('hidden');
            } else {
                $viewerHeaderSubtitle.classList.add('hidden');
            }
        }
    }

    function updateWaitingVisibility() {
        const $container = document.querySelector('.viewer-container');
        if ($container) {
            $container.classList.remove('show-podium-bg');
        }

        if (isAnimating) {
            $waitingState.classList.add('hidden');
            $timerState.classList.add('hidden');
            if ($welcomeState) $welcomeState.classList.add('hidden');
            if ($scoreboardState) $scoreboardState.classList.add('hidden');
            if ($podiumState) $podiumState.classList.add('hidden');
            $rankingsSection.classList.add('hidden');
            updateHeader('', '');
            return;
        }

        // Hide all views first
        $waitingState.classList.add('hidden');
        $timerState.classList.add('hidden');
        if ($welcomeState) $welcomeState.classList.add('hidden');
        if ($scoreboardState) $scoreboardState.classList.add('hidden');
        if ($podiumState) $podiumState.classList.add('hidden');
        $rankingsSection.classList.add('hidden');
        $viewerStage.classList.remove('timer-only');

        if (presentationMode === 'scoreboard') {
            if ($scoreboardState) $scoreboardState.classList.remove('hidden');
            updateHeader('KAIZEN CANLI SKOR TABLOSU', 'Grup Değerlendirmeleri');
        } else if (presentationMode === 'podium') {
            if (revealedProjects.length === 0) {
                $waitingState.classList.remove('hidden');
                $viewerStage.classList.add('timer-only');
                updateHeader('', '');
            } else {
                if ($podiumState) $podiumState.classList.remove('hidden');
                updateHeader('KAIZEN PUANLAMA PODYUMU', 'Final Sonuçları');
                if ($container) {
                    $container.classList.add('show-podium-bg');
                }
            }
        } else if (revealedProjects.length > 0) {
            $rankingsSection.classList.remove('hidden');
            updateHeader('', '');
        } else if (presentationMode === 'timer') {
            $timerState.classList.remove('hidden');
            $viewerStage.classList.add('timer-only');
            updateHeader('', '');
        } else if (presentationMode === 'welcome') {
            if ($welcomeState) $welcomeState.classList.remove('hidden');
            $viewerStage.classList.add('timer-only');
            updateHeader('', '');
        } else {
            $waitingState.classList.remove('hidden');
            $viewerStage.classList.add('timer-only');
            updateHeader('', '');
        }
    }

    // ==================== SCOREBOARD & PODIUM RENDERERS ====================
    async function pollScoreboardData() {
        try {
            const res = await fetch('/api/admin/all-scores');
            const data = await res.json();
            renderLiveScoreboard(data);
        } catch (err) {
            console.error('Scoreboard polling error:', err);
        }
    }

    function renderLiveScoreboard(data) {
        const projects = data.projects || [];
        const jurors = data.jurors || [];
        const scores = data.scores || {};
        const rankingsList = data.rankings || [];

        if ($statTotalProjects) $statTotalProjects.textContent = projects.length;
        if ($statTotalJurors) $statTotalJurors.textContent = jurors.length;
        
        const totalVotes = Object.keys(scores).length;
        if ($statTotalVotes) $statTotalVotes.textContent = totalVotes;

        if ($statConsensusLabel) {
            const maxPossibleVotes = projects.length * jurors.length;
            if (projects.length === 0 || jurors.length === 0) {
                $statConsensusLabel.textContent = 'Kurulum Yok';
                $statConsensusLabel.className = 'stat-value text-accent';
                $statConsensusLabel.style.color = '';
            } else if (totalVotes >= maxPossibleVotes) {
                $statConsensusLabel.textContent = 'Tamamlandı';
                $statConsensusLabel.className = 'stat-value';
                $statConsensusLabel.style.color = 'var(--success)';
            } else {
                $statConsensusLabel.textContent = 'Oylanıyor';
                $statConsensusLabel.className = 'stat-value text-accent';
                $statConsensusLabel.style.color = '';
            }
        }

        if (!$scoreboardList) return;
        $scoreboardList.innerHTML = '';
        if (rankingsList.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'text-center text-muted mt-md w-full';
            emptyEl.textContent = 'Henüz değerlendirilecek proje bulunmamaktadır.';
            $scoreboardList.appendChild(emptyEl);
            return;
        }

        rankingsList.forEach((project, index) => {
            const rank = index + 1;
            const percent = (project.averageScore / (project.maxScore || 100)) * 100;
            const formattedRank = String(rank).padStart(2, '0');

            let badgeClass = 'badge-none';
            let badgeText = 'Bekliyor';
            if (project.jurorCount === project.totalJurors && project.totalJurors > 0) {
                badgeClass = 'badge-complete';
                badgeText = 'Tamamlandı';
            } else if (project.jurorCount > 0) {
                badgeClass = 'badge-voting';
                badgeText = 'Oylanıyor';
            }

            const row = document.createElement('div');
            row.className = 'scoreboard-row';
            row.style.animationDelay = (index * 0.04) + 's';

            row.innerHTML = `
                <div class="row-rank">${formattedRank}</div>
                <div class="row-info">
                    <div class="row-project-name">${escapeHtml(project.projectName)}</div>
                    <div class="row-project-team">${escapeHtml(project.projectTeam || '')}</div>
                </div>
                <div class="row-bar-container">
                    <div class="row-score-bar">
                        <div class="row-score-fill" style="width: ${percent}%"></div>
                    </div>
                </div>
                <div class="row-votes-status">
                    <span class="votes-badge ${badgeClass}">
                        ${badgeText} (${project.jurorCount}/${project.totalJurors})
                    </span>
                </div>
                <div class="row-score">${project.averageScore.toFixed(1)}</div>
            `;
            $scoreboardList.appendChild(row);
        });
    }

    function renderPodium(data) {
        const listRankings = data.rankings || [];
        const revealedRanks = revealedProjects.map(rp => rp.rank);

        const stateKey = revealedRanks.sort((a, b) => a - b).map(r => {
            const proj = listRankings[r - 1];
            return `${r}_${proj ? proj.averageScore.toFixed(1) : 0}`;
        }).join(',');

        if (stateKey === lastRenderedRanksStr) {
            return;
        }
        lastRenderedRanksStr = stateKey;

        // Handle reset
        if (revealedRanks.length === 0) {
            goldAlreadyRevealed = false;
            [1, 2, 3].forEach(r => {
                if (podiumSpots[r] && podiumSpots[r].el) {
                    podiumSpots[r].el.classList.add('hidden');
                }
            });
            if ($lowerRankingsList) $lowerRankingsList.innerHTML = '';
            if ($lowerRankingsSection) $lowerRankingsSection.classList.add('hidden');
            return;
        }

        let showLower = false;

        [1, 2, 3].forEach(rank => {
            const projectIndex = rank - 1;
            const project = listRankings[projectIndex];
            const spot = podiumSpots[rank];

            if (project && revealedRanks.includes(rank)) {
                if (spot) {
                    spot.name.textContent = project.projectName;
                    spot.team.textContent = project.projectTeam || '';
                    spot.score.textContent = project.averageScore.toFixed(1);
                    if (spot.el.classList.contains('hidden')) {
                        spot.el.classList.remove('hidden');
                    }
                }

                if (rank === 1 && !goldAlreadyRevealed) {
                    goldAlreadyRevealed = true;
                    setTimeout(() => {
                        launchConfetti(1);
                    }, 800);
                }
            } else {
                if (spot && spot.el) {
                    spot.el.classList.add('hidden');
                }
            }
        });

        if ($lowerRankingsList) {
            $lowerRankingsList.innerHTML = '';
            const maxLowerRank = Math.min(10, listRankings.length);
            
            for (let r = 4; r <= maxLowerRank; r++) {
                const projectIndex = r - 1;
                const project = listRankings[projectIndex];

                if (project && revealedRanks.includes(r)) {
                    showLower = true;
                    const el = document.createElement('div');
                    el.className = 'lower-rank-item';
                    el.style.animationDelay = ((r - 4) * 0.05) + 's';
                    el.innerHTML = `
                        <div class="lower-rank-badge">${r}</div>
                        <div class="lower-rank-info">
                            <div class="lower-rank-name">${escapeHtml(project.projectName)}</div>
                            ${project.projectTeam ? `<div class="lower-rank-team">${escapeHtml(project.projectTeam)}</div>` : ''}
                        </div>
                        <div class="lower-rank-score">${project.averageScore.toFixed(1)}</div>
                    `;
                    $lowerRankingsList.appendChild(el);
                }
            }
        }

        if (showLower) {
            if ($lowerRankingsSection) $lowerRankingsSection.classList.remove('hidden');
        } else {
            if ($lowerRankingsSection) $lowerRankingsSection.classList.add('hidden');
        }
    }

    // ==================== SIMULTANEOUS TOP TWO REVEAL ====================
    function startTopTwoCountdown(project1st, project2nd) {
        $waitingState.classList.add('hidden');
        if ($welcomeState) $welcomeState.classList.add('hidden');
        showOverlay($countdownOverlay);
        hideOverlay($revealOverlay);

        if ($countdownRankLabel) {
            $countdownRankLabel.innerHTML = 'Açıklanacak Sıra: <span id="countdown-rank-text">1. ve 2. BİRİNCİLİK</span>';
        }
        if ($countdownSubtext) {
            $countdownSubtext.textContent = 'Büyük Final!';
        }

        // Reset ring
        $ringProgress.style.transition = 'none';
        $ringProgress.style.strokeDasharray = CIRCUMFERENCE;
        $ringProgress.style.strokeDashoffset = '0';

        let remaining = countdownSeconds;
        updateCountdownDisplay(remaining, countdownSeconds);
        playTick();

        void $ringProgress.offsetWidth;
        $ringProgress.style.transition = 'stroke-dashoffset 1s linear';

        countdownInterval = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(countdownInterval);
                countdownInterval = null;
                hideOverlay($countdownOverlay);
                showTopTwoReveal(project1st, project2nd);
            } else {
                updateCountdownDisplay(remaining, countdownSeconds);
                playTick();
            }
        }, 1000);
    }

    function showTopTwoReveal(project1st, project2nd) {
        showOverlay($revealOverlay);
        playReveal();

        if ($rankingsRevealCard) $rankingsRevealCard.classList.add('hidden');
        if ($revealTwoContainer) $revealTwoContainer.classList.remove('hidden');

        // Populate Silver (2nd place)
        $revealSilverProjectName.textContent = project2nd.projectName;
        $revealSilverProjectTeam.textContent = project2nd.projectTeam || '';
        $revealSilverScoreValue.textContent = project2nd.averageScore.toFixed(1);
        $revealSilverScoreMax.textContent = '/' + (project2nd.maxScore || 100);

        // Populate Gold (1st place)
        $revealGoldProjectName.textContent = project1st.projectName;
        $revealGoldProjectTeam.textContent = project1st.projectTeam || '';
        $revealGoldScoreValue.textContent = project1st.averageScore.toFixed(1);
        $revealGoldScoreMax.textContent = '/' + (project1st.maxScore || 100);

        // Continuous celebration for top places!
        launchConfetti(1); 

        const revealDuration = winnerRevealSeconds * 1000;

        revealTimeout = setTimeout(() => {
            hideOverlay($revealOverlay);
            $confettiContainer.classList.add('hidden');
            $confettiContainer.innerHTML = '';
            
            // Add both to the rankings list
            addToList(2, project2nd, false);
            addToList(1, project1st, false);
            
            updateRankingsTitle();
            isAnimating = false;
            updateWaitingVisibility();
            revealTimeout = null;
        }, revealDuration);
    }

    function showOverlay(el) {
        el.classList.remove('hidden');
    }

    function hideOverlay(el) {
        el.classList.add('hidden');
    }

    // ==================== CONFETTI ====================
    function launchConfetti(rank) {
        if (typeof confetti === 'undefined') {
            console.warn("canvas-confetti is not loaded.");
            return;
        }

        // Corporate theme colors: orange (#fc5000), blue (#0a338b), gold (#ffd700), white (#ffffff)
        const orange = '#fc5000';
        const blue = '#0a338b';
        const gold = '#ffd700';
        const white = '#ffffff';
        const colors = [orange, blue, gold, '#ff8c00', white];

        if (rank === 1) {
            // Massive continuous celebration for 1st place!
            const duration = (winnerRevealSeconds || 10) * 1000;
            const end = Date.now() + duration;

            (function frame() {
                // Left cannon
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0, y: 0.8 },
                    colors: colors,
                    zIndex: 9999
                });
                // Right cannon
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1, y: 0.8 },
                    colors: colors,
                    zIndex: 9999
                });
                // Center splash
                if (Math.random() < 0.2) {
                    confetti({
                        particleCount: 15,
                        angle: 90,
                        spread: 100,
                        origin: { x: 0.5, y: 0.75 },
                        colors: colors,
                        zIndex: 9999
                    });
                }

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());
        } else {
            // Exploding side cannons for 2nd & 3rd place (Rank 2 and Rank 3)
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { x: 0, y: 0.8 },
                angle: 60,
                colors: colors,
                zIndex: 9999
            });
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { x: 1, y: 0.8 },
                angle: 120,
                colors: colors,
                zIndex: 9999
            });
        }
    }

    // ==================== SOUNDS PLAYBACK ====================
    function playTick() {
        if (soundSettings && soundSettings.countdownEnabled === false) return;
        playSound(soundSettings?.countdownUrl, 'tick');
    }
 
    function playReveal() {
        if (soundSettings && soundSettings.revealEnabled === false) return;
        playSound(soundSettings?.revealUrl, 'reveal');
    }
 
    function playSound(url, type) {
        if (!url) {
            if (type === 'tick') playDefaultTickSound();
            else if (type === 'reveal') playDefaultRevealSound();
            return;
        }
        try {
            const audio = new Audio(url);
            audio.volume = type === 'tick' ? 0.35 : 0.8;
            audio.play().catch(e => {
                console.warn("Could not play custom sound, playing fallback:", e);
                if (type === 'tick') playDefaultTickSound();
                else if (type === 'reveal') playDefaultRevealSound();
            });
        } catch (e) {
            if (type === 'tick') playDefaultTickSound();
            else if (type === 'reveal') playDefaultRevealSound();
        }
    }
 
    function playDefaultTickSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.08);
        } catch (e) {
            console.error("Audio error:", e);
        }
    }
 
    function playDefaultRevealSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const now = ctx.currentTime;
            
            // C major arpeggio
            const notes = [261.63, 329.63, 392.00, 523.25];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + i * 0.12);
                gain.gain.setValueAtTime(0.12, now + i * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.8);
                
                osc.start(now + i * 0.12);
                osc.stop(now + i * 0.12 + 0.8);
            });
        } catch (e) {
            console.error("Audio error:", e);
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
