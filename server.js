// Kaizen Puanlama Sistemi - Geri Yukleme Surumu (Vercel Tetikleme)
const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const multer = require('multer');

// Configure storage for audio uploads
const audioStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'public', 'sounds');
        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        } catch (e) {
            console.error("Could not create sounds directory:", e.message);
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname) || '.mp3';
        cb(null, `${file.fieldname}${ext}`);
    }
});

const uploadAudio = multer({
    storage: audioStorage,
    fileFilter: function (req, file, cb) {
        if (!file.mimetype.startsWith('audio/') && !file.originalname.endsWith('.mp3') && !file.originalname.endsWith('.wav')) {
            return cb(new Error('Yalnızca ses dosyaları (.mp3, .wav) yüklenebilir!'), false);
        }
        cb(null, true);
    }
});

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
const DATA_DIR = isProduction ? path.join(os.tmpdir(), 'kaizen-data') : path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

// Ensure data directory exists
try {
    if (!process.env.FIREBASE_URL && !fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
} catch (e) {
    console.warn("Data directory warning (normal in serverless):", e.message);
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== DATA HELPERS ====================
function getDefaultData() {
    return {
        projects: [],
        jurors: [],
        scores: {},
        presentation: {
            mode: "timer", // "timer", "waiting"
            revealedRanks: [],
            isRevealing: false,
            currentRank: null,
            timer: {
                duration: 600, // 10 minutes default
                remaining: 600,
                isRunning: false,
                lastUpdated: Date.now(),
                targetTimestamp: Date.now() + 600000
            }
        },
        settings: {
            criteria: [
                {
                    id: "c1",
                    label: "Hasta Güvenliği ve Memnuniyeti",
                    type: "radio",
                    weight: 2,
                    maxScore: 20,
                    description: "Projenin hasta güvenliği üzerindeki etkisi"
                },
                {
                    id: "c2",
                    label: "Çalışan Güvenliği ve Memnuniyeti",
                    type: "radio",
                    weight: 1.5,
                    maxScore: 15,
                    description: "Çalışan deneyimine katkısı"
                },
                {
                    id: "c3",
                    label: "Problem Çözme Teknikleri",
                    type: "radio",
                    weight: 2.5,
                    maxScore: 25,
                    description: "5S, Kaizen, PDCA vb. yöntemlerin kullanımı"
                },
                {
                    id: "c4",
                    label: "Kazanım",
                    type: "checkbox",
                    weight: 2,
                    maxScore: 20,
                    description: "Birden fazla seçim yapılabilir",
                    options: [
                        "İş gücü kazancı",
                        "Zaman tasarrufu",
                        "Makine veya cihaz verimliliği",
                        "Malzeme tasarrufu",
                        "Enerji tasarrufu",
                        "Ergonomik iyileştirme",
                        "Dijital dönüşüm",
                        "Dokümantasyon ve standardizasyon",
                        "Bilgi Akışı / İletişim / Koordinasyon",
                        "Maliyet"
                    ]
                },
                {
                    id: "c5",
                    label: "Sürdürülebilirlik",
                    type: "radio",
                    weight: 2,
                    maxScore: 20,
                    description: "Süreç standardizasyonu ve devamlılık"
                }
            ],
            adminPassword: "kaizen2026",
            countdownSeconds: 10,
            winnerRevealSeconds: 10,
            sounds: {
                countdownEnabled: true,
                countdownUrl: "",
                revealEnabled: true,
                revealUrl: ""
            }
        }
    };
}

function ensureDefaults(data) {
    if (!data || typeof data !== 'object') {
        return getDefaultData();
    }
    const defaults = getDefaultData();
    const presentation = data.presentation || {};
    const timer = presentation.timer || {};

    // Validate and migrate criteria if needed
    let dbCriteria = data.settings && data.settings.criteria;
    let validCriteria = true;
    if (!Array.isArray(dbCriteria) || dbCriteria.length !== defaults.settings.criteria.length) {
        validCriteria = false;
    } else {
        // Check if any criterion is missing weight, maxScore or has wrong properties
        for (let i = 0; i < dbCriteria.length; i++) {
            if (dbCriteria[i].weight === undefined || dbCriteria[i].maxScore === undefined || dbCriteria[i].type !== defaults.settings.criteria[i].type) {
                validCriteria = false;
                break;
            }
        }
    }

    const criteriaToUse = validCriteria ? dbCriteria : defaults.settings.criteria;

    return {
        projects: Array.isArray(data.projects) ? data.projects : defaults.projects,
        jurors: Array.isArray(data.jurors) ? data.jurors : defaults.jurors,
        scores: (data.scores && typeof data.scores === 'object') ? data.scores : defaults.scores,
        presentation: {
            mode: presentation.mode || defaults.presentation.mode,
            revealedRanks: Array.isArray(presentation.revealedRanks) ? presentation.revealedRanks : defaults.presentation.revealedRanks,
            isRevealing: typeof presentation.isRevealing === 'boolean' ? presentation.isRevealing : defaults.presentation.isRevealing,
            currentRank: presentation.currentRank !== undefined ? presentation.currentRank : defaults.presentation.currentRank,
            timer: {
                duration: typeof timer.duration === 'number' ? timer.duration : defaults.presentation.timer.duration,
                remaining: typeof timer.remaining === 'number' ? timer.remaining : defaults.presentation.timer.remaining,
                isRunning: typeof timer.isRunning === 'boolean' ? timer.isRunning : defaults.presentation.timer.isRunning,
                lastUpdated: typeof timer.lastUpdated === 'number' ? timer.lastUpdated : defaults.presentation.timer.lastUpdated,
                targetTimestamp: typeof timer.targetTimestamp === 'number' ? timer.targetTimestamp : (defaults.presentation.timer.targetTimestamp || Date.now() + 600000)
            }
        },
        settings: {
            ...defaults.settings,
            ...(data.settings || {}),
            criteria: criteriaToUse,
            sounds: {
                ...defaults.settings.sounds,
                ...((data.settings && data.settings.sounds) || {})
            }
        }
    };
}

async function readData() {
    const firebaseDbUrl = process.env.FIREBASE_URL;
    if (firebaseDbUrl) {
        try {
            const url = firebaseDbUrl.endsWith('.json') ? firebaseDbUrl : `${firebaseDbUrl.replace(/\/$/, '')}/.json`;
            const res = await fetch(url);
            const data = await res.json();
            return ensureDefaults(data);
        } catch (e) {
            console.error("Firebase read error:", e);
            return getDefaultData();
        }
    } else {
        try {
            const raw = fs.readFileSync(DATA_FILE, 'utf-8');
            return ensureDefaults(JSON.parse(raw));
        } catch (e) {
            const defaultData = getDefaultData();
            writeDataSync(defaultData);
            return defaultData;
        }
    }
}

async function writeData(data) {
    const firebaseDbUrl = process.env.FIREBASE_URL;
    if (firebaseDbUrl) {
        try {
            const url = firebaseDbUrl.endsWith('.json') ? firebaseDbUrl : `${firebaseDbUrl.replace(/\/$/, '')}/.json`;
            await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) {
            console.error("Firebase write error:", e);
        }
    } else {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    }
}

function writeDataSync(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function calculateRankings(data) {
    const projectScores = {};

    for (const key in data.scores) {
        const score = data.scores[key];
        if (!projectScores[score.projectId]) {
            projectScores[score.projectId] = { totalSum: 0, count: 0 };
        }
        // score.total already contains the computed total including bonuses
        projectScores[score.projectId].totalSum += score.total;
        projectScores[score.projectId].count += 1;
    }

    const maxScore = data.settings.criteria.reduce((sum, c) => sum + c.maxScore, 0);

    const rankings = data.projects.map(project => {
        const ps = projectScores[project.id] || { totalSum: 0, count: 0 };
        const average = ps.count > 0 ? Math.round((ps.totalSum / ps.count) * 100) / 100 : 0;
        return {
            projectId: project.id,
            projectName: project.name,
            projectTeam: project.team || '',
            averageScore: average,
            maxScore: maxScore,
            jurorCount: ps.count,
            totalJurors: data.jurors.length
        };
    });

    rankings.sort((a, b) => b.averageScore - a.averageScore);
    return rankings;
}

// Method rankings calculations removed


// ==================== AUTH ====================
app.post('/api/auth/login', async (req, res) => {
    const { name, pin } = req.body;
    const data = await readData();
    const juror = data.jurors.find(j =>
        j.name.toLowerCase().trim() === name.toLowerCase().trim() && j.pin === pin
    );
    if (juror) {
        res.json({ success: true, juror: { id: juror.id, name: juror.name } });
    } else {
        res.status(401).json({ success: false, message: 'Geçersiz ad veya PIN kodu' });
    }
});

app.post('/api/auth/admin', async (req, res) => {
    const { password } = req.body;
    const data = await readData();
    if (password === data.settings.adminPassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Geçersiz şifre' });
    }
});

// ==================== PROJECTS ====================
app.get('/api/projects', async (req, res) => {
    const data = await readData();
    res.json(data.projects);
});

app.post('/api/projects', async (req, res) => {
    const { name, team } = req.body;
    if (!name) return res.status(400).json({ message: 'Proje adı gerekli' });

    const data = await readData();
    const id = data.projects.length > 0 ? Math.max(...data.projects.map(p => p.id)) + 1 : 1;
    const project = { id, name, team: team || '' };
    data.projects.push(project);
    await writeData(data);
    res.json(project);
});

app.put('/api/projects/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { name, team } = req.body;
    const data = await readData();
    const project = data.projects.find(p => p.id === id);
    if (!project) return res.status(404).json({ message: 'Proje bulunamadı' });

    if (name) project.name = name;
    if (team !== undefined) project.team = team;
    await writeData(data);
    res.json(project);
});

app.delete('/api/projects/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const data = await readData();
    data.projects = data.projects.filter(p => p.id !== id);
    // Remove related scores
    for (const key in data.scores) {
        if (data.scores[key].projectId === id) {
            delete data.scores[key];
        }
    }
    await writeData(data);
    res.json({ success: true });
});

// ==================== JURORS ====================
app.get('/api/jurors', async (req, res) => {
    const data = await readData();
    res.json(data.jurors);
});

app.post('/api/jurors', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Jüri adı gerekli' });

    const data = await readData();
    const id = data.jurors.length > 0 ? Math.max(...data.jurors.map(j => j.id)) + 1 : 1;

    // Generate unique 4-digit PIN
    let pin;
    const existingPins = data.jurors.map(j => j.pin);
    do {
        pin = String(Math.floor(1000 + Math.random() * 9000));
    } while (existingPins.includes(pin));

    const juror = { id, name, pin };
    data.jurors.push(juror);
    await writeData(data);
    res.json(juror);
});

app.delete('/api/jurors/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const data = await readData();
    data.jurors = data.jurors.filter(j => j.id !== id);
    // Remove related scores
    for (const key in data.scores) {
        if (data.scores[key].jurorId === id) {
            delete data.scores[key];
        }
    }
    await writeData(data);
    res.json({ success: true });
});

// ==================== SCORES ====================
app.get('/api/scores/:jurorId', async (req, res) => {
    const jurorId = parseInt(req.params.jurorId);
    const data = await readData();
    const jurorScores = {};
    for (const key in data.scores) {
        if (data.scores[key].jurorId === jurorId) {
            jurorScores[data.scores[key].projectId] = data.scores[key];
        }
    }
    res.json(jurorScores);
});

app.post('/api/scores', async (req, res) => {
    const { jurorId, projectId, scores } = req.body;
    const data = await readData();
    const criteria = data.settings.criteria;

    if (!jurorId || !projectId || !scores || !Array.isArray(scores) || scores.length !== criteria.length) {
        return res.status(400).json({ message: `Geçersiz puan verisi (beklenen ${criteria.length} değer, gelen ${scores ? scores.length : 0})` });
    }

    let total = 0;
    for (let i = 0; i < criteria.length; i++) {
        const c = criteria[i];
        const s = scores[i];

        if (c.type === 'checkbox') {
            // s should be an array of selected option strings
            if (!Array.isArray(s)) {
                return res.status(400).json({ message: `"${c.label}" için geçersiz veri (dizi bekleniyor)` });
            }
            // Calculate checkbox score: count -> 1-10 scale
            const count = s.length;
            let level;
            if (count === 0) level = 0;
            else if (count === 1) level = 2;
            else if (count === 2) level = 4;
            else if (count === 3) level = 6;
            else if (count === 4 || count === 5) level = 8;
            else level = 10;
            total += level * (c.weight || 2);
        } else {
            // Radio type: s should be a number 1-10
            if (typeof s !== 'number' || s < 1 || s > 10) {
                return res.status(400).json({ message: `"${c.label}" için geçersiz puan (1-10 arası olmalı)` });
            }
            total += s * (c.weight || 1);
        }
    }

    const key = `${jurorId}_${projectId}`;
    data.scores[key] = {
        jurorId,
        projectId,
        scores,
        total,
        timestamp: new Date().toISOString()
    };
    await writeData(data);
    res.json({ success: true, score: data.scores[key] });
});

// ==================== RANKINGS ====================
app.get('/api/rankings', async (req, res) => {
    const data = await readData();
    const rankings = calculateRankings(data);
    res.json(rankings);
});

// ==================== CRITERIA ====================
app.get('/api/criteria', async (req, res) => {
    const data = await readData();
    res.json(data.settings.criteria);
});

// Keep /api/questions as alias for backward compat (returns criteria labels)
app.get('/api/questions', async (req, res) => {
    const data = await readData();
    res.json(data.settings.criteria.map(c => c.label));
});

// ==================== SETTINGS ====================
app.put('/api/settings', async (req, res) => {
    const data = await readData();
    const { countdownSeconds, adminPassword, sounds, winnerRevealSeconds, criteria } = req.body;
 
    if (countdownSeconds && countdownSeconds >= 3 && countdownSeconds <= 30) {
        data.settings.countdownSeconds = parseInt(countdownSeconds);
    }
 
    if (winnerRevealSeconds !== undefined) {
        const parsed = parseInt(winnerRevealSeconds);
        if (!isNaN(parsed) && parsed >= 3 && parsed <= 120) {
            data.settings.winnerRevealSeconds = parsed;
        }
    }
 
    if (adminPassword && adminPassword.trim().length > 0) {
        data.settings.adminPassword = adminPassword.trim();
    }
 
    if (sounds && typeof sounds === 'object') {
        data.settings.sounds = {
            countdownEnabled: typeof sounds.countdownEnabled === 'boolean' ? sounds.countdownEnabled : true,
            countdownUrl: typeof sounds.countdownUrl === 'string' ? sounds.countdownUrl.trim() : (data.settings.sounds?.countdownUrl || ""),
            revealEnabled: typeof sounds.revealEnabled === 'boolean' ? sounds.revealEnabled : true,
            revealUrl: typeof sounds.revealUrl === 'string' ? sounds.revealUrl.trim() : (data.settings.sounds?.revealUrl || "")
        };
    }

    if (criteria && Array.isArray(criteria)) {
        data.settings.criteria = criteria.map((c, i) => {
            const criterion = {
                id: c.id || `c${i+1}`,
                label: typeof c.label === 'string' ? c.label.trim() : `Soru ${i+1}`,
                type: c.type || 'radio',
                weight: typeof c.weight === 'number' ? c.weight : (typeof c.weight === 'string' ? parseFloat(c.weight) || 1 : 1),
                maxScore: typeof c.maxScore === 'number' ? c.maxScore : (typeof c.maxScore === 'string' ? parseInt(c.maxScore) || 10 : 10),
                description: typeof c.description === 'string' ? c.description.trim() : ""
            };
            if (c.type === 'checkbox' && Array.isArray(c.options)) {
                criterion.options = c.options.map(o => typeof o === 'string' ? o.trim() : String(o));
            }
            return criterion;
        });
    }

    await writeData(data);
    res.json({ success: true, settings: data.settings });
});

// ==================== SOUNDS UPLOAD ====================
app.post('/api/settings/sounds/upload', (req, res, next) => {
    uploadAudio.fields([
        { name: 'countdown', maxCount: 1 },
        { name: 'reveal', maxCount: 1 }
    ])(req, res, function (err) {
        if (err) {
            console.error("Multer upload error:", err);
            let msg = err.message;
            if (err.code === 'EROFS' || err.code === 'ENOENT' || err.code === 'EACCES' || err.message.includes('readonly') || err.message.includes('read-only') || process.env.VERCEL) {
                msg = "Sunucu dosya sistemi salt okunur (Vercel vb.). Dosya yüklemek yerine ses dosyasının internet adresini (URL) giriniz.";
            }
            return res.status(500).json({ success: false, message: msg });
        }
        next();
    });
}, async (req, res) => {
    try {
        const data = await readData();
        if (!data.settings.sounds) {
            data.settings.sounds = {
                countdownEnabled: true,
                countdownUrl: "",
                revealEnabled: true,
                revealUrl: ""
            };
        }

        if (req.files && req.files['countdown']) {
            const file = req.files['countdown'][0];
            data.settings.sounds.countdownUrl = `/sounds/${file.filename}?t=${Date.now()}`;
        }
        if (req.files && req.files['reveal']) {
            const file = req.files['reveal'][0];
            data.settings.sounds.revealUrl = `/sounds/${file.filename}?t=${Date.now()}`;
        }

        await writeData(data);
        res.json({ success: true, sounds: data.settings.sounds });
    } catch (e) {
        console.error("Sound upload error:", e);
        let msg = e.message;
        if (e.code === 'EROFS' || e.code === 'ENOENT' || e.code === 'EACCES' || e.message.includes('readonly') || e.message.includes('read-only') || process.env.VERCEL) {
            msg = "Sunucu dosya sistemi salt okunur (Vercel vb.). Dosya yüklemek yerine ses dosyasının internet adresini (URL) giriniz.";
        }
        res.status(500).json({ success: false, message: msg });
    }
});

// ==================== RESET DATA ====================
app.post('/api/settings/reset/projects', async (req, res) => {
    const data = await readData();
    data.projects = [];
    data.scores = {};
    data.presentation.revealedRanks = [];
    data.presentation.isRevealing = false;
    data.presentation.currentRank = null;
    await writeData(data);
    res.json({ success: true });
});

app.post('/api/settings/reset/jurors', async (req, res) => {
    const data = await readData();
    data.jurors = [];
    data.scores = {};
    data.presentation.revealedRanks = [];
    data.presentation.isRevealing = false;
    data.presentation.currentRank = null;
    await writeData(data);
    res.json({ success: true });
});

app.post('/api/settings/reset/scores', async (req, res) => {
    const data = await readData();
    data.scores = {};
    data.presentation.revealedRanks = [];
    data.presentation.isRevealing = false;
    data.presentation.currentRank = null;
    await writeData(data);
    res.json({ success: true });
});

app.post('/api/settings/reset/all', async (req, res) => {
    const data = await readData();
    data.projects = [];
    data.jurors = [];
    data.scores = {};
    data.presentation = getDefaultData().presentation;
    await writeData(data);
    res.json({ success: true });
});

// ==================== PRESENTATION ====================
app.get('/api/presentation/status', async (req, res) => {
    const data = await readData();
    const rankings = calculateRankings(data);

    res.json({
        presentation: data.presentation,
        rankings: rankings,
        settings: data.settings,
        serverTime: Date.now()
    });
});

app.post('/api/presentation/reveal', async (req, res) => {
    const data = await readData();
    const rankings = calculateRankings(data);

    const totalToShow = Math.min(10, rankings.length);
    const revealedCount = data.presentation.revealedRanks.length;

    if (revealedCount >= totalToShow) {
        return res.status(400).json({ message: 'Tüm sıralar zaten açıklandı' });
    }

    if (totalToShow === 0) {
        return res.status(400).json({ message: 'Henüz puanlanmış proje yok' });
    }

    const rankToReveal = totalToShow - revealedCount;

    if (rankToReveal === 2) {
        // Reveal both 1st and 2nd place at the same time
        if (!data.presentation.revealedRanks.includes(2)) {
            data.presentation.revealedRanks.push(2);
        }
        if (!data.presentation.revealedRanks.includes(1)) {
            data.presentation.revealedRanks.push(1);
        }
        data.presentation.currentRank = 2;
        await writeData(data);
        return res.json({
            success: true,
            rank: 2,
            project: rankings[1], // 2nd place
            project1st: rankings[0], // 1st place
            remaining: 0
        });
    }

    const projectIndex = rankToReveal - 1;
    const project = rankings[projectIndex];

    if (!project) {
        return res.status(400).json({ message: 'Açıklanacak proje bulunamadı' });
    }

    data.presentation.revealedRanks.push(rankToReveal);
    data.presentation.currentRank = rankToReveal;
    await writeData(data);

    res.json({
        success: true,
        rank: rankToReveal,
        project: project,
        remaining: totalToShow - data.presentation.revealedRanks.length
    });
});

app.post('/api/presentation/reset', async (req, res) => {
    const data = await readData();
    data.presentation.revealedRanks = [];
    data.presentation.isRevealing = false;
    data.presentation.currentRank = null;
    await writeData(data);
    res.json({ success: true });
});

// ==================== PRESENTATION MODE & TIMER ENDPOINTS ====================
app.post('/api/presentation/mode', async (req, res) => {
    const { mode } = req.body;
    if (mode !== 'timer' && mode !== 'waiting' && mode !== 'welcome') {
        return res.status(400).json({ message: 'Geçersiz mod' });
    }
    const data = await readData();
    data.presentation.mode = mode;
    await writeData(data);
    res.json({ success: true, mode: data.presentation.mode });
});

app.post('/api/presentation/timer/control', async (req, res) => {
    const { action } = req.body; // 'start', 'pause', 'reset'
    const data = await readData();
    const timer = data.presentation.timer;
    const now = Date.now();

    if (action === 'start') {
        timer.targetTimestamp = now + (timer.remaining * 1000);
        timer.isRunning = true;
        timer.lastUpdated = now;
    } else if (action === 'pause') {
        if (timer.isRunning) {
            timer.remaining = Math.max(0, Math.floor((timer.targetTimestamp - now) / 1000));
        }
        timer.isRunning = false;
        timer.lastUpdated = now;
    } else if (action === 'reset') {
        timer.remaining = timer.duration;
        timer.targetTimestamp = now + (timer.duration * 1000);
        timer.isRunning = false;
        timer.lastUpdated = now;
    } else {
        return res.status(400).json({ message: 'Geçersiz eylem' });
    }

    await writeData(data);
    res.json({ success: true, timer });
});

app.post('/api/presentation/timer/set', async (req, res) => {
    const { duration, targetTimestamp } = req.body;
    const data = await readData();
    const now = Date.now();

    if (targetTimestamp !== undefined) {
        if (typeof targetTimestamp !== 'number' || targetTimestamp <= now) {
            return res.status(400).json({ message: 'Lütfen gelecekteki bir tarih seçin' });
        }
        const calcDuration = Math.floor((targetTimestamp - now) / 1000);
        data.presentation.timer = {
            duration: calcDuration,
            remaining: calcDuration,
            isRunning: true,
            lastUpdated: now,
            targetTimestamp: targetTimestamp
        };
    } else if (duration !== undefined) {
        if (typeof duration !== 'number' || duration <= 0) {
            return res.status(400).json({ message: 'Geçersiz süre' });
        }
        data.presentation.timer = {
            duration: duration,
            remaining: duration,
            isRunning: false,
            lastUpdated: now,
            targetTimestamp: now + (duration * 1000)
        };
    } else {
        return res.status(400).json({ message: 'Geçersiz parametreler' });
    }

    await writeData(data);
    res.json({ success: true, timer: data.presentation.timer });
});

// ==================== ADMIN ALL SCORES ====================
app.get('/api/admin/all-scores', async (req, res) => {
    const data = await readData();
    res.json({
        projects: data.projects,
        jurors: data.jurors,
        scores: data.scores,
        rankings: calculateRankings(data)
    });
});

// ==================== PAGE ROUTES ====================
app.get('/juri', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'juri.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/podium', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'podium.html'));
});

app.get('/scoreboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'scoreboard.html'));
});



// ==================== START SERVER ====================
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log('');
        console.log('╔══════════════════════════════════════════════════╗');
        console.log('║   KAİZEN YARIŞMASI PUANLAMA SİSTEMİ            ║');
        console.log('╠══════════════════════════════════════════════════╣');
        console.log(`║   İzleyici Ekranı : http://localhost:${PORT}         ║`);
        console.log(`║   Jüri Paneli     : http://localhost:${PORT}/juri    ║`);
        console.log(`║   Admin Paneli    : http://localhost:${PORT}/admin   ║`);
        console.log('║                                                  ║');
        console.log('║   Admin Şifresi   : kaizen2026                   ║');
        console.log('╚══════════════════════════════════════════════════╝');
        console.log('');
    });
}

module.exports = app;
