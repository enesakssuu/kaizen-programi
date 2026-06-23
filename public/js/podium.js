// ==================== PODIUM.JS ====================
// Podyum Ekranı: Gerçek zamanlı polling ve açıklanma durumuna göre dinamik podyum güncellemesi

(function () {
    'use strict';

    // ==================== STATE ====================
    let revealedRanks = [];
    let rankings = [];
    let serverTimeOffset = 0;
    let goldAlreadyRevealed = false;
    let pollInterval = null;

    // ==================== DOM ELEMENTS ====================
    const $particles = document.getElementById('particles');
    const $waitingState = document.getElementById('podium-waiting-state');
    const $activeView = document.getElementById('active-podium-view');
    const $lowerSection = document.getElementById('lower-rankings-section');
    const $lowerList = document.getElementById('lower-rankings-list');
    const $confettiContainer = document.getElementById('confetti-container');

    // Spots
    const spots = {
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

    // ==================== INIT ====================
    function init() {
        createParticles();
        startPolling();
        initParallax();
    }

    // ==================== PARALLAX ====================
    function initParallax() {
        const $grid = document.querySelector('.grid-overlay');
        document.addEventListener('mousemove', (e) => {
            const moveX = (e.clientX - window.innerWidth / 2);
            const moveY = (e.clientY - window.innerHeight / 2);
            if ($grid) {
                $grid.style.transform = `translate(${moveX * 0.015}px, ${moveY * 0.015}px)`;
            }
        });
    }

    // ==================== PARTICLES ====================
    function createParticles() {
        if (!$particles) return;
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
        pollInterval = setInterval(pollStatus, 2000);
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
        } catch (err) {
            console.error('Polling error:', err);
        }
    }

    function handleStatusUpdate(data) {
        rankings = data.rankings || [];
        revealedRanks = data.presentation?.revealedRanks || [];

        // Handle reset
        if (revealedRanks.length === 0) {
            goldAlreadyRevealed = false;
            $waitingState.classList.remove('hidden');
            $activeView.classList.add('hidden');
            // Hide spots
            [1, 2, 3].forEach(r => {
                spots[r].el.classList.add('hidden');
            });
            $lowerList.innerHTML = '';
            $lowerSection.classList.add('hidden');
            return;
        }

        // Show active view
        $waitingState.classList.add('hidden');
        $activeView.classList.remove('hidden');

        // Populate top 3
        let showPodium = false;
        let showLower = false;

        // Visual order: 2nd place on left, 1st place in center, 3rd place on right
        // We set CSS Grid order: 2nd is first child in markup, 1st is second, 3rd is third.
        // Let's set order properties or rely on HTML order. In HTML, the layout order is spot-2, spot-1, spot-3. This is correct!
        [1, 2, 3].forEach(rank => {
            const projectIndex = rank - 1;
            const project = rankings[projectIndex];
            const spot = spots[rank];

            if (project && revealedRanks.includes(rank)) {
                spot.name.textContent = project.projectName;
                spot.team.textContent = project.projectTeam || '';
                spot.score.textContent = project.averageScore.toFixed(1);
                
                if (spot.el.classList.contains('hidden')) {
                    spot.el.classList.remove('hidden');
                }
                showPodium = true;

                // Gold reveal confetti triggers only once
                if (rank === 1 && !goldAlreadyRevealed) {
                    goldAlreadyRevealed = true;
                    setTimeout(() => {
                        launchConfetti(data.settings?.winnerRevealSeconds || 10);
                    }, 800);
                }
            } else {
                spot.el.classList.add('hidden');
            }
        });

        // Populate lower rankings (ranks 4 to 10)
        $lowerList.innerHTML = '';
        const maxLowerRank = Math.min(10, rankings.length);
        
        for (let r = 4; r <= maxLowerRank; r++) {
            const projectIndex = r - 1;
            const project = rankings[projectIndex];

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
                $lowerList.appendChild(el);
            }
        }

        if (showLower) {
            $lowerSection.classList.remove('hidden');
        } else {
            $lowerSection.classList.add('hidden');
        }
    }

    // ==================== CONFETTI ====================
    function launchConfetti(seconds) {
        if (typeof confetti === 'undefined') return;

        const orange = '#fc5000';
        const blue = '#0a338b';
        const gold = '#ffd700';
        const white = '#ffffff';
        const colors = [orange, blue, gold, '#ff8c00', white];

        const duration = seconds * 1000;
        const end = Date.now() + duration;

        $confettiContainer.classList.remove('hidden');

        (function frame() {
            // Left cannon
            confetti({
                particleCount: 4,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.8 },
                colors: colors,
                zIndex: 9999
            });
            // Right cannon
            confetti({
                particleCount: 4,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.8 },
                colors: colors,
                zIndex: 9999
            });
            // Center splash
            if (Math.random() < 0.2) {
                confetti({
                    particleCount: 12,
                    angle: 90,
                    spread: 80,
                    origin: { x: 0.5, y: 0.75 },
                    colors: colors,
                    zIndex: 9999
                });
            }

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
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
