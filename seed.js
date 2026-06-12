const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data', 'data.json');

const projects = [
    { id: 1, name: "Yapay Zeka Destekli Kalite Kontrol", team: "Kalite Güvence Takımı" },
    { id: 2, name: "Montaj Hattı Ergonomi İyileştirmesi", team: "Ergonomi Komitesi" },
    { id: 3, name: "Geri Dönüşümlü Ambalaj Tasarımı", team: "Paketleme & Sevkiyat" },
    { id: 4, name: "Duruş Sürelerini Azaltan Bakım Modülü", team: "Bakım Onarım Grubu" },
    { id: 5, name: "Depo Alanı Optimizasyonu", team: "Lojistik Takımı" },
    { id: 6, name: "Enerji Tasarruflu Aydınlatma Geçişi", team: "Sürdürülebilirlik Ekibi" },
    { id: 7, name: "Müşteri Geri Bildirim Entegrasyonu", team: "CRM Geliştirme" },
    { id: 8, name: "Yarı Otomatik Paketleme İstasyonu", team: "Üretim Otomasyonu" },
    { id: 9, name: "Kağıtsız Ofis Dijitalleşme Projesi", team: "Bilgi Teknolojileri" },
    { id: 10, name: "Yemekhane İsrafını Önleme Kampanyası", team: "İnsan Kaynakları" },
    { id: 11, name: "Hızlı Kalıp Değişim (SMED) Uygulaması", team: "Yalın Üretim Grubu" },
    { id: 12, name: "Forklift Güvenlik ve Uyarı Sistemi", team: "İSG Kurulu" }
];

const jurors = [
    { id: 1, name: "Ahmet Yılmaz", pin: "1234" },
    { id: 2, name: "Ayşe Demir", pin: "2345" },
    { id: 3, name: "Mehmet Kaya", pin: "3456" },
    { id: 4, name: "Fatma Çelik", pin: "4567" },
    { id: 5, name: "Ali Öztürk", pin: "5678" },
    { id: 6, name: "Zeynep Aslan", pin: "6789" },
    { id: 7, name: "Mustafa Şahin", pin: "7890" },
    { id: 8, name: "Emine Yıldız", pin: "8901" },
    { id: 9, name: "Hasan Arslan", pin: "9012" },
    { id: 10, name: "Elif Bulut", pin: "1023" },
    { id: 11, name: "Hüseyin Koç", pin: "2034" },
    { id: 12, name: "Hatice Doğan", pin: "3045" }
];

const scores = {};

// Populate random scores for each juror and project
jurors.forEach(juror => {
    projects.forEach(project => {
        // 6 criteria, scores between 4 and 10 to make it realistic and close
        const individualScores = Array.from({ length: 6 }, () => Math.floor(Math.random() * 7) + 4);
        const total = individualScores.reduce((a, b) => a + b, 0);
        scores[`${juror.id}_${project.id}`] = {
            jurorId: juror.id,
            projectId: project.id,
            scores: individualScores,
            total: total,
            timestamp: new Date().toISOString()
        };
    });
});

const defaultData = {
    projects,
    jurors,
    scores,
    presentation: {
        revealedRanks: [],
        isRevealing: false,
        currentRank: null
    },
    settings: {
        questions: [
            "Proje işi ne kadar kolaylaştırıyor?",
            "Projenin yaratıcılık ve yenilikçilik düzeyi nedir?",
            "Projenin uygulanabilirlik düzeyi nedir?",
            "Projenin maliyet/zaman tasarrufu sağlama potansiyeli nedir?",
            "Projenin sunumu ne kadar etkili ve anlaşılır?",
            "Projenin sürdürülebilirlik ve yaygınlaştırılabilirlik potansiyeli nedir?"
        ],
        adminPassword: "kaizen2026",
        countdownSeconds: 10
    }
};

fs.writeFileSync(dataPath, JSON.stringify(defaultData, null, 2));
console.log("Mock data successfully seeded!");
