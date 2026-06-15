// ==================== METOT.JS ====================
(function () {
    'use strict';

    // ==================== STATE ====================
    let isCountdownActive = false;
    let isRevealed = false;
    let countdownInterval = null;
    let methodRankings = [];
    let methodCriterion = null;
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
    const $countdownOverlay = document.getElementById('countdown-overlay');
    const $countdownNumber = document.getElementById('countdown-number');
    const $ringProgress = document.getElementById('ring-progress');
    const $revealOverlay = document.getElementById('reveal-overlay');
    const $revealProjectName = document.getElementById('reveal-project-name');
    const $revealProjectTeam = document.getElementById('reveal-project-team');
    const $revealScoreValue = document.getElementById('reveal-score-value');
    const $revealScoreMax = document.getElementById('reveal-score-max');
    const $methodCriterionLabel = document.getElementById('method-criterion-label');
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
        methodRankings = data.methodRankings || [];
        methodCriterion = data.methodCriterion || null;
        
        if (data.settings && data.settings.sounds) {
            soundSettings = data.settings.sounds;
        }

        const presentation = data.presentation || {};
        const countdownSeconds = data.settings?.countdownSeconds || 10;

        // Update method question copy dynamically if we have it
        if (methodCriterion && $methodCriterionLabel) {
            $methodCriterionLabel.textContent = `${methodCriterion.label} Puanı`;
            if ($revealScoreMax) {
                $revealScoreMax.textContent = `/${methodCriterion.maxScore}`;
            }
        }

        // If reveal has not started at all
        if (!presentation.methodRevealStarted) {
            handleReset();
            return;
        }

        // Winner project data
        const winner = methodRankings[0];
        if (!winner) {
            return; // No winner data yet
        }

        const now = Date.now() + serverTimeOffset;
        const remaining = Math.max(0, Math.floor((presentation.methodRevealTimestamp - now) / 1000));

        if (remaining > 0 && !presentation.methodRevealed) {
            // Countdown active
            if (!isCountdownActive) {
                startCountdown(remaining, countdownSeconds, winner);
            }
        } else {
            // Revealed
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
            isCountdownActive = false;
            hideOverlay($countdownOverlay);
            
            if (!isRevealed) {
                showWinner(winner);
            }
        }
    }

    function handleReset() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        isCountdownActive = false;
        isRevealed = false;
        
        $waitingState.classList.remove('hidden');
        hideOverlay($countdownOverlay);
        hideOverlay($revealOverlay);
        $confettiContainer.classList.add('hidden');
        $confettiContainer.innerHTML = '';
    }

    // ==================== COUNTDOWN ====================
    function startCountdown(initialRemaining, totalDuration, winner) {
        isCountdownActive = true;
        isRevealed = false;

        $waitingState.classList.add('hidden');
        showOverlay($countdownOverlay);
        hideOverlay($revealOverlay);

        $ringProgress.style.transition = 'none';
        $ringProgress.style.strokeDasharray = CIRCUMFERENCE;
        $ringProgress.style.strokeDashoffset = '0';

        updateCountdownDisplay(initialRemaining, totalDuration);
        playTick();

        void $ringProgress.offsetWidth;
        $ringProgress.style.transition = 'stroke-dashoffset 1s linear';

        let remaining = initialRemaining;
        countdownInterval = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(countdownInterval);
                countdownInterval = null;
                isCountdownActive = false;
                hideOverlay($countdownOverlay);
                showWinner(winner);
            } else {
                updateCountdownDisplay(remaining, totalDuration);
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
    function showWinner(winner) {
        isRevealed = true;
        $waitingState.classList.add('hidden');
        hideOverlay($countdownOverlay);
        showOverlay($revealOverlay);

        $revealProjectName.textContent = winner.projectName;
        $revealProjectTeam.textContent = winner.projectTeam || 'Ekip Belirtilmemiş';
        if ($revealScoreValue) {
            $revealScoreValue.textContent = winner.averageScore.toFixed(1);
        }

        playReveal();
        launchConfetti();
    }

    function showOverlay(el) {
        el.classList.remove('hidden');
    }

    function hideOverlay(el) {
        el.classList.add('hidden');
    }

    // ==================== CONFETTI ====================
    function launchConfetti() {
        if (typeof confetti === 'undefined') return;

        const orange = '#fc5000';
        const blue = '#0a338b';
        const gold = '#ffd700';
        const white = '#ffffff';
        const colors = [orange, blue, gold, '#ff8c00', white];

        const duration = 12 * 1000;
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
            if (Math.random() < 0.15) {
                confetti({
                    particleCount: 10,
                    angle: 90,
                    spread: 100,
                    origin: { x: 0.5, y: 0.7 },
                    colors: colors,
                    zIndex: 9999
                });
            }

            if (Date.now() < end && isRevealed) {
                requestAnimationFrame(frame);
            }
        }());
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

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    document.addEventListener('DOMContentLoaded', init);
})();
