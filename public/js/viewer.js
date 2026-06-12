// ==================== VIEWER.JS ====================
// İzleyici ekranı: Polling ile gerçek zamanlı güncellemeler, geri sayım ve açıklama animasyonları

(function () {
    'use strict';

    // ==================== STATE ====================
    let revealedProjects = [];
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

    // ==================== WELCOME PARTICLES STATE ====================
    let welcomeParticles = [];
    let welcomeParticlesCanvas = null;
    let welcomeParticlesCtx = null;
    let welcomeParticlesAnimFrame = null;
    const welcomeMouse = { x: null, y: null, active: false };

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

    const CIRCUMFERENCE = 2 * Math.PI * 120; // ~753.98

    // ==================== INIT ====================
    function init() {
        createParticles();
        startPolling();
        initParallax();
        initWelcomeParticles();
    }
 
    // ==================== PARALLAX ====================
    function initParallax() {
        const $grid = document.querySelector('.grid-overlay');
        const $glowBlue = document.querySelector('.welcome-glow-blue');
        const $glowOrange = document.querySelector('.welcome-glow-orange');
        
        document.addEventListener('mousemove', (e) => {
            const moveX = (e.clientX - window.innerWidth / 2);
            const moveY = (e.clientY - window.innerHeight / 2);
            
            if ($grid) {
                // Background shifts with mouse
                $grid.style.transform = `translate(${moveX * 0.012}px, ${moveY * 0.012}px)`;
            }
            if ($viewerStage) {
                // Foreground shifts in opposite direction to create depth
                $viewerStage.style.transform = `translate(${moveX * -0.008}px, ${moveY * -0.008}px)`;
            }
            if ($glowBlue) {
                // Glow shifts with mouse
                $glowBlue.style.transform = `translate(${moveX * 0.02}px, ${moveY * 0.02}px)`;
            }
            if ($glowOrange) {
                // Glow shifts in opposite direction
                $glowOrange.style.transform = `translate(${moveX * -0.015}px, ${moveY * -0.015}px)`;
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

    // ==================== WELCOME CANVAS PARTICLES ====================
    function initWelcomeParticles() {
        welcomeParticlesCanvas = document.getElementById('welcome-particles-canvas');
        if (!welcomeParticlesCanvas) return;
        welcomeParticlesCtx = welcomeParticlesCanvas.getContext('2d');

        // Resize handler
        window.addEventListener('resize', resizeWelcomeParticles);
        resizeWelcomeParticles();

        // Mouse listeners (Canvas uses screen coordinates since it's position: fixed)
        document.addEventListener('mousemove', (e) => {
            if (presentationMode !== 'welcome') {
                welcomeMouse.active = false;
                return;
            }
            welcomeMouse.x = e.clientX;
            welcomeMouse.y = e.clientY;
            welcomeMouse.active = true;
        });

        document.addEventListener('mouseleave', () => {
            welcomeMouse.active = false;
        });

        // Initialize particles
        generateWelcomeParticles();
    }

    function generateWelcomeParticles() {
        if (!welcomeParticlesCanvas) return;
        welcomeParticles = [];
        const w = welcomeParticlesCanvas.width || window.innerWidth;
        const h = welcomeParticlesCanvas.height || window.innerHeight;

        const baseColors = [
            'rgba(10, 51, 139, ',   // Blue
            'rgba(252, 80, 0, ',    // Orange
            'rgba(138, 43, 226, ',  // Purple
            'rgba(245, 158, 11, ',  // Gold/Yellow
            'rgba(236, 72, 153, '   // Pink
        ];

        for (let i = 0; i < 80; i++) {
            welcomeParticles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.6,
                vy: (Math.random() - 0.5) * 0.6,
                baseVx: (Math.random() - 0.5) * 0.4,
                baseVy: (Math.random() - 0.5) * 0.4,
                length: 6 + Math.random() * 8, // Length of dash
                width: 1.5 + Math.random() * 1.5, // Thickness of dash
                color: baseColors[Math.floor(Math.random() * baseColors.length)],
                alpha: 0.3 + Math.random() * 0.4, // Opacity
                angle: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.01
            });
        }
    }

    function resizeWelcomeParticles() {
        if (!welcomeParticlesCanvas) return;
        welcomeParticlesCanvas.width = window.innerWidth;
        welcomeParticlesCanvas.height = window.innerHeight;
        // Re-generate to fit new screen bounds cleanly
        generateWelcomeParticles();
    }

    function startWelcomeParticles() {
        if (!welcomeParticlesCanvas) return;
        if (!welcomeParticlesAnimFrame) {
            // Ensure bounds are fresh
            resizeWelcomeParticles();
            animateWelcomeParticles();
        }
    }

    function stopWelcomeParticles() {
        if (welcomeParticlesAnimFrame) {
            cancelAnimationFrame(welcomeParticlesAnimFrame);
            welcomeParticlesAnimFrame = null;
        }
        if (welcomeParticlesCtx && welcomeParticlesCanvas) {
            welcomeParticlesCtx.clearRect(0, 0, welcomeParticlesCanvas.width, welcomeParticlesCanvas.height);
        }
    }

    function animateWelcomeParticles() {
        if (presentationMode !== 'welcome' || isAnimating) {
            stopWelcomeParticles();
            return;
        }

        const ctx = welcomeParticlesCtx;
        const w = welcomeParticlesCanvas.width;
        const h = welcomeParticlesCanvas.height;

        ctx.clearRect(0, 0, w, h);

        // Update and draw particles
        welcomeParticles.forEach(p => {
            // Mouse interaction (gravity attraction)
            if (welcomeMouse.active && welcomeMouse.x !== null && welcomeMouse.y !== null) {
                const dx = welcomeMouse.x - p.x;
                const dy = welcomeMouse.y - p.y;
                const dist = Math.hypot(dx, dy);

                if (dist < 250) {
                    // Force pulls particles gently towards the mouse
                    const force = (250 - dist) / 250;
                    p.vx += (dx / dist) * force * 0.08;
                    p.vy += (dy / dist) * force * 0.08;
                }
            }

            // Apply friction/damping to prevent acceleration build-up
            p.vx *= 0.96;
            p.vy *= 0.96;

            // Add back subtle baseline movement/noise
            p.vx += p.baseVx * 0.05;
            p.vy += p.baseVy * 0.05;

            // Move particle
            p.x += p.vx;
            p.y += p.vy;

            // Rotate dash slightly based on speed
            p.angle += p.spin + (Math.hypot(p.vx, p.vy) * 0.01);

            // Wrap or bounce on boundaries
            if (p.x < -20) p.x = w + 20;
            if (p.x > w + 20) p.x = -20;
            if (p.y < -20) p.y = h + 20;
            if (p.y > h + 20) p.y = -20;

            // Draw connection lines to other particles (Constellation style)
            welcomeParticles.forEach(p2 => {
                if (p === p2) return;
                const dx = p2.x - p.x;
                const dy = p2.y - p.y;
                const dist = Math.hypot(dx, dy);

                if (dist < 100) {
                    const lineAlpha = (100 - dist) / 100 * 0.12;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(10, 51, 139, ${lineAlpha})`; // Soft blue connection
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            });

            // Draw line to mouse if close (dynamic tracking)
            if (welcomeMouse.active && welcomeMouse.x !== null && welcomeMouse.y !== null) {
                const dx = welcomeMouse.x - p.x;
                const dy = welcomeMouse.y - p.y;
                const dist = Math.hypot(dx, dy);

                if (dist < 150) {
                    const mouseAlpha = (150 - dist) / 150 * 0.22;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(welcomeMouse.x, welcomeMouse.y);
                    ctx.strokeStyle = `rgba(252, 80, 0, ${mouseAlpha})`; // Warm orange mouse connection
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }

            // Draw the particle itself as an elegant dash/stroke aligned with its velocity
            ctx.save();
            ctx.translate(p.x, p.y);
            
            // Align rotation with velocity if moving, else fallback to spin angle
            const speed = Math.hypot(p.vx, p.vy);
            const angle = speed > 0.1 ? Math.atan2(p.vy, p.vx) : p.angle;
            ctx.rotate(angle);

            ctx.beginPath();
            ctx.moveTo(-p.length / 2, 0);
            ctx.lineTo(p.length / 2, 0);
            
            // Combine color base with dynamic alpha
            ctx.strokeStyle = p.color + p.alpha + ')';
            ctx.lineWidth = p.width;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();
        });

        welcomeParticlesAnimFrame = requestAnimationFrame(animateWelcomeParticles);
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

        revealedProjects = [];
        $rankingsList.innerHTML = '';
        $rankingsTitle.textContent = '';
        hideOverlay($countdownOverlay);
        hideOverlay($revealOverlay);
        if ($welcomeState) $welcomeState.classList.add('hidden');
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

        $countdownRankText.textContent = '#' + rank;

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
            $rankingsTitle.textContent = `SIRALAMA (${revealedProjects.length}/10)`;
        } else {
            $rankingsTitle.textContent = '';
        }
    }

    // ==================== UI HELPERS ====================
    function updateWaitingVisibility() {
        if (isAnimating || revealedProjects.length > 0) {
            $waitingState.classList.add('hidden');
            $timerState.classList.add('hidden');
            if ($welcomeState) $welcomeState.classList.add('hidden');
            $rankingsSection.classList.remove('hidden');
            $viewerStage.classList.remove('timer-only');
            stopWelcomeParticles();
            return;
        }

        if (presentationMode === 'timer') {
            $timerState.classList.remove('hidden');
            $waitingState.classList.add('hidden');
            if ($welcomeState) $welcomeState.classList.add('hidden');
            $rankingsSection.classList.add('hidden');
            $viewerStage.classList.add('timer-only');
            stopWelcomeParticles();
        } else if (presentationMode === 'welcome') {
            if ($welcomeState) $welcomeState.classList.remove('hidden');
            $timerState.classList.add('hidden');
            $waitingState.classList.add('hidden');
            $rankingsSection.classList.add('hidden');
            $viewerStage.classList.add('timer-only');
            startWelcomeParticles();
        } else {
            $waitingState.classList.remove('hidden');
            $timerState.classList.add('hidden');
            if ($welcomeState) $welcomeState.classList.add('hidden');
            $rankingsSection.classList.add('hidden');
            $viewerStage.classList.add('timer-only');
            stopWelcomeParticles();
        }
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
