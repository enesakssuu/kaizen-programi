// ==================== SCOREBOARD.JS ====================
// Canlı Skor Tablosu Ekranı: Jüri puanlamalarını anlık yansıtan polling mekanizması

(function () {
    'use strict';

    // ==================== DOM ELEMENTS ====================
    const $particles = document.getElementById('particles');
    const $statTotalProjects = document.getElementById('stat-total-projects');
    const $statTotalJurors = document.getElementById('stat-total-jurors');
    const $statTotalVotes = document.getElementById('stat-total-votes');
    const $statConsensusLabel = document.getElementById('stat-consensus-label');
    const $scoreboardList = document.getElementById('scoreboard-list');

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
        pollData();
        setInterval(pollData, 2000);
    }

    async function pollData() {
        try {
            const res = await fetch('/api/admin/all-scores');
            const data = await res.json();
            handleDataUpdate(data);
        } catch (err) {
            console.error('Scoreboard polling error:', err);
        }
    }

    function handleDataUpdate(data) {
        const projects = data.projects || [];
        const jurors = data.jurors || [];
        const scores = data.scores || {};
        const rankings = data.rankings || [];

        // Update summary boxes
        $statTotalProjects.textContent = projects.length;
        $statTotalJurors.textContent = jurors.length;
        
        // Count total votes cast
        const totalVotes = Object.keys(scores).length;
        $statTotalVotes.textContent = totalVotes;

        // Consensus/Scor durum belirleme
        const maxPossibleVotes = projects.length * jurors.length;
        if (projects.length === 0 || jurors.length === 0) {
            $statConsensusLabel.textContent = 'Kurulum Yok';
            $statConsensusLabel.className = 'stat-value text-accent';
        } else if (totalVotes >= maxPossibleVotes) {
            $statConsensusLabel.textContent = 'Tamamlandı';
            $statConsensusLabel.className = 'stat-value';
            $statConsensusLabel.style.color = 'var(--success)';
        } else {
            $statConsensusLabel.textContent = 'Oylanıyor';
            $statConsensusLabel.className = 'stat-value text-accent';
            $statConsensusLabel.style.color = '';
        }

        // Render rankings rows
        $scoreboardList.innerHTML = '';
        if (rankings.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'text-center text-muted mt-md w-full';
            emptyEl.textContent = 'Henüz değerlendirilecek proje bulunmamaktadır.';
            $scoreboardList.appendChild(emptyEl);
            return;
        }

        rankings.forEach((project, index) => {
            const rank = index + 1;
            const percent = (project.averageScore / (project.maxScore || 100)) * 100;
            const formattedRank = String(rank).padStart(2, '0');

            // Determine judge voting status badge
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

    // ==================== UTILITY ====================
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ==================== START ====================
    document.addEventListener('DOMContentLoaded', init);
})();
