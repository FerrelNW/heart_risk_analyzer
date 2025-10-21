// ===========================================
// LOGIKA THEME TOGGLE
// ===========================================
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('predict-form');
    form.addEventListener('submit', handlePrediction);

    const themeToggle = document.getElementById('theme-toggle');
    const docElement = document.documentElement;
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');

    // Fungsi untuk update ikon
    const updateIcon = (theme) => {
        if (theme === 'dark') {
            sunIcon.classList.remove('hidden'); // Tampilkan matahari
            moonIcon.classList.add('hidden');   // Sembunyikan bulan
        } else {
            sunIcon.classList.add('hidden');    // Sembunyikan matahari
            moonIcon.classList.remove('hidden'); // Tampilkan bulan
        }
    };

    // Set ikon saat halaman dimuat
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
        docElement.classList.add('dark');
    }
    updateIcon(currentTheme);

    // Tambahkan event listener ke tombol
    themeToggle.addEventListener('click', () => {
        docElement.classList.toggle('dark');
        const newTheme = docElement.classList.contains('dark') ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        updateIcon(newTheme);

        const existingChart = Chart.getChart("shapChart");
        if (existingChart) {
            updateChartTheme(existingChart);
        }
    });
});

/**
 * Menangani submit form, memanggil API, dan merender hasilnya.
 */
async function handlePrediction(event) {
    event.preventDefault(); 
    
    const button = document.getElementById('predict-button');
    const buttonText = document.getElementById('button-text');
    const buttonLoader = document.getElementById('button-loader');
    const resultContainer = document.getElementById('result-content');
    
    // Sembunyikan kartu rekomendasi lama
    const recommendationContainer = document.getElementById('recommendation-container');
    recommendationContainer.classList.add('hidden');
    recommendationContainer.innerHTML = ''; 

    // Tampilkan status loading
    button.disabled = true;
    buttonText.classList.add('hidden');
    buttonLoader.classList.remove('hidden');
    resultContainer.innerHTML = `
        <h2 class="text-2xl font-semibold text-primary mb-2">Menganalisis...</h2>
        <p class="text-secondary">Mohon tunggu, AI sedang memproses data Anda.</p>
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mt-4"></div>
    `;

    // Kumpulkan data dari form menjadi objek
    const formData = new FormData(event.target);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = parseFloat(value); 
    });

    try {
        // Panggil API backend
        const response = await fetch('/api/predict_heart_disease', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }
        
        renderResult(result, data); 

    } catch (error) {
        console.error('Prediction error:', error);
        resultContainer.innerHTML = `
            <h2 class="text-2xl font-semibold text-red-500 mb-2">Terjadi Kesalahan</h2>
            <p class="text-secondary">${error.message}</p>
        `;
    } finally {
        // Kembalikan tombol ke status normal
        button.disabled = false;
        buttonText.classList.remove('hidden');
        buttonLoader.classList.add('hidden');
    }
}

/**
 * Merender hasil prediksi ke dalam UI.
 * @param {object} result - Objek hasil dari API
 * @param {object} inputData - Data mentah dari formulir
 */
function renderResult(result, inputData) {
    const { prediction_probability, shap_values } = result;
    const resultContainer = document.getElementById('result-content');
    const recommendationContainer = document.getElementById('recommendation-container');

    let riskLevel, riskColorClass;
    if (prediction_probability < 40) {
        riskLevel = "Rendah";
        riskColorClass = "text-green-500";
    } else if (prediction_probability < 70) {
        riskLevel = "Menengah";
        riskColorClass = "text-yellow-500";
    } else {
        riskLevel = "Tinggi";
        riskColorClass = "text-red-500";
    }

    // Urutkan SHAP values
    const sortedShap = Object.entries(shap_values)
        .filter(([, val]) => Math.abs(val) > 0.01) 
        .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
        .slice(0, 5); 

    // Dapatkan saran dinamis
    const suggestionHtml = getDynamicSuggestion(sortedShap, inputData);

    // Buat HTML baru untuk KARTU HASIL (kanan atas)
    resultContainer.innerHTML = `
        <h2 class="text-2xl font-semibold text-primary mb-2">Hasil Analisis Anda</h2>
        <p class="text-6xl font-bold ${riskColorClass}">${prediction_probability}%</p>
        <p class="text-2xl text-secondary mb-6">Risiko ${riskLevel}</p>

        <div class="w-full text-left mb-6">
            <h3 class="text-lg font-semibold text-primary mb-3">Analisis Faktor Risiko (AI)</h3>
            <p class="text-sm text-secondary mb-3">Grafik ini menunjukkan faktor apa saja yang paling berkontribusi pada skor risiko Anda saat ini.</p>
            
            <div class="relative h-80"> <canvas id="shapChart"></canvas>
            </div>
            <p class="text-xs text-secondary mt-2 text-center">
                <span class="text-red-500">Merah</span>: Meningkatkan Risiko | <span class="text-blue-500">Biru</span>: Menurunkan Risiko
            </p>
        </div>
    `;

    // Masukkan HTML saran ke WADAH BARU di bagian bawah
    recommendationContainer.innerHTML = suggestionHtml;
    recommendationContainer.classList.remove('hidden');

    // Render chart SHAP (setelah innerHTML di-set)
    renderShapChart(sortedShap);
}

/**
 * Menghasilkan HTML untuk saran dinamis berdasarkan FAKTA (input) dan ANALISIS (SHAP).
 * @param {Array} sortedShap - Array SHAP values yang sudah diurutkan
 * @param {object} inputData - Data mentah dari formulir
 */
function getDynamicSuggestion(sortedShap, inputData) {
    let suggestions = []; // Array untuk menampung saran

    // --- 1. Analisis berdasarkan FAKTA (inputData) ---
    // Cek Kolesterol
    if (inputData.chol >= 240) {
        suggestions.push("<strong>Kolesterol Anda sangat tinggi (≥ 240 mg/dl).</strong> Ini adalah faktor risiko utama. Diskusikan segera dengan dokter mengenai diet dan kemungkinan pengobatan.");
    } else if (inputData.chol >= 200) {
        suggestions.push("<strong>Kolesterol Anda di batas tinggi (200-239 mg/dl).</strong> Perbaikan pola makan, seperti mengurangi lemak jenuh dan memperbanyak serat, dapat sangat membantu.");
    }

    // Cek Tekanan Darah
    if (inputData.trestbps >= 140) {
        suggestions.push("<strong>Tekanan darah Anda tinggi (≥ 140 mmHg).</strong> Mohon pantau secara rutin dan konsultasikan dengan dokter untuk pengobatan atau perubahan gaya hidup (misal: mengurangi garam).");
    } else if (inputData.trestbps >= 130) {
        suggestions.push("<strong>Tekanan darah Anda di atas normal (130-139 mmHg).</strong> Mengurangi garam, berolahraga teratur, dan mengelola stres dapat membantu menurunkannya.");
    }
    
    // --- 2. Analisis berdasarkan AI (SHAP) ---
    if (sortedShap.length > 0) {
        const [topFactorName, topFactorValue] = sortedShap[0];
        const featureMap = getFeatureNameMap(); // Gunakan map baru
        const friendlyName = featureMap[topFactorName] || topFactorName;

        if (topFactorValue > 0) {
            // Jika faktor SHAP teratas *bukan* salah satu yang sudah kita komentari, tambahkan info baru
            if (topFactorName !== 'chol' && topFactorName !== 'trestbps') {
                 suggestions.push(`Analisis AI menunjukkan **${friendlyName}** adalah faktor unik yang paling berkontribusi pada risiko Anda saat ini.`);
            } else if (topFactorName === 'chol' || topFactorName === 'trestbps') {
                 suggestions.push(`Seperti yang tercatat, Analisis AI mengonfirmasi **${friendlyName}** adalah kontributor risiko terbesar Anda.`);
            }
        } else {
             suggestions.push(`Kabar baik! Analisis AI menunjukkan **${friendlyName}** adalah faktor utama yang **menurunkan** risiko Anda. Pertahankan!`);
        }
    }

    // --- 3. Bangun HTML Akhir ---
    let html = '<h3 class="text-2xl font-semibold text-primary mb-4">Rekomendasi & Catatan</h3>';
    if (suggestions.length > 0) {
        html += '<ul class="list-disc list-inside space-y-3 text-secondary text-base">';
        suggestions.forEach(suggestion => {
            suggestion = suggestion.replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary">$1</strong>');
            html += `<li>${suggestion}</li>`;
        });
        html += '</ul>';
    } else {
        html += '<p class="text-secondary text-base">Berdasarkan data Anda, tidak ada catatan khusus. Tetap jaga gaya hidup sehat.</p>';
    }
    
    html += '<p class="text-sm text-secondary italic mt-6 font-medium">PENTING: Analisis ini adalah alat bantu informasi dan bukan pengganti diagnosis atau nasihat medis profesional. Selalu konsultasikan dengan dokter Anda.</p>';
    return html;
}


/**
 * Peta nama fitur teknis ke nama yang mudah dibaca.
 * ======================= INI ADALAH PERUBAHAN BESAR =======================
 * Menerjemahkan istilah teknis (cp_3, thal_2, ca_1) menjadi bahasa awam.
 */
function getFeatureNameMap() {
    return {
        // Fitur Dasar
        'age': 'Usia',
        'sex': 'Jenis Kelamin',
        'trestbps': 'Tekanan Darah',
        'chol': 'Kolesterol',
        'thalch': 'Detak Jantung Maks. (saat tes)',
        'oldpeak': 'Hasil EKG (Tes Stres)', // Lebih sederhana dari "Depresi ST"
        
        // Nyeri Dada (cp)
        'cp_0': 'Tipe Nyeri Dada (Angina Tipikal)',
        'cp_1': 'Tipe Nyeri Dada (Angina Atipikal)',
        'cp_2': 'Tipe Nyeri Dada (Bukan Angina)',
        'cp_3': 'Tidak Ada Gejala Nyeri Dada',
        
        // Gula Darah Puasa (fbs)
        'fbs_0': 'Gula Darah Puasa (< 120 mg/dl)', // Menambah konteks
        'fbs_1': 'Gula Darah Puasa (> 120 mg/dl)', // Menambah konteks

        // EKG Istirahat (restecg)
        'restecg_0': 'Hasil EKG Istirahat (Normal)',
        'restecg_1': 'Hasil EKG Istirahat (Abnormal)',
        'restecg_2': 'Hasil EKG Istirahat (Hipertrofi)',

        // Nyeri Akibat Olahraga (exang)
        'exang_0': 'Nyeri Dada Saat Olahraga (Tidak)',
        'exang_1': 'Nyeri Dada Saat Olahraga (Ya)',
        
        // Kemiringan ST Puncak (slope)
        'slope_0': 'Grafik EKG Olahraga (Naik)',
        'slope_1': 'Grafik EKG Olahraga (Datar)',
        'slope_2': 'Grafik EKG Olahraga (Turun)',
        
        // Jumlah Pembuluh Darah (ca) - JAUH LEBIH JELAS
        'ca_0': 'Penyumbatan Arteri (0 Terdeteksi)',
        'ca_1': 'Penyumbatan Arteri (1 Terdeteksi)',
        'ca_2': 'Penyumbatan Arteri (2 Terdeteksi)',
        'ca_3': 'Penyumbatan Arteri (3 Terdeteksi)',
        'ca_4': 'Penyumbatan Arteri (4 Terdeteksi)',
        
        // Hasil Scan Jantung (thal) - JAUH LEBIH JELAS
        'thal_0': 'Hasil Scan Jantung (Tidak Ada Data)',
        'thal_1': 'Hasil Scan Jantung (Aliran Normal)',
        'thal_2': 'Hasil Scan Jantung (Aliran Rusak Permanen)', // Jelas "Buruk"
        'thal_3': 'Hasil Scan Jantung (Aliran Rusak Sementara)', // Jelas "Buruk"
    };
}
// ========================================================================


/**
 * Mendapatkan nilai variabel CSS untuk tema chart.
 */
function getChartColors() {
    // Ambil style yang sedang aktif dari elemen root (<html>)
    const styles = getComputedStyle(document.documentElement);
    return {
        gridColor: styles.getPropertyValue('--chart-grid-color').trim(),
        tickColor: styles.getPropertyValue('--chart-tick-color').trim(),
        red: 'rgba(239, 68, 68, 0.7)',  // text-red-500
        blue: 'rgba(59, 130, 246, 0.7)', // text-blue-500
        redBorder: 'rgba(239, 68, 68, 1)',
        blueBorder: 'rgba(59, 130, 246, 1)'
    };
}

/**
 * Merender chart penjelasan SHAP.
 * @param {Array} shapData - Array SHAP values yang sudah diurutkan
 */
function renderShapChart(shapData) {
    const ctx = document.getElementById('shapChart').getContext('2d');
    
    // Hancurkan chart lama jika ada
    let existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }

    const featureMap = getFeatureNameMap();
    // Gunakan '|| item[0]' sebagai fallback jika ada nama yg belum dipetakan
    const labels = shapData.map(item => featureMap[item[0]] || item[0]);
    const values = shapData.map(item => item[1]);
    
    const colors = getChartColors();

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Kontribusi terhadap Risiko',
                data: values,
                backgroundColor: values.map(v => v > 0 ? colors.red : colors.blue),
                borderColor: values.map(v => v > 0 ? colors.redBorder : colors.blueBorder),
                borderWidth: 1
            }]
        },
        options: getChartOptions(colors)
    });
}

/**
Gunakan '|| item[0]' sebagai fallback jika ada nama yg belum dipetakan * Menghasilkan objek options untuk Chart.js.
 */
function getChartOptions(colors) {
    return {
        indexAxis: 'y', // Membuat bar chart horizontal
        responsive: true,
        maintainAspectRatio: false, 
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let value = context.raw;
                        let label = value > 0 ? 'Meningkatkan Risiko' : 'Menurunkan Risiko';
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                title: { display: false, text: 'Kontribusi SHAP Value', color: colors.tickColor },
                ticks: { color: colors.tickColor },
                grid: { color: colors.gridColor }
            },
            y: {
                ticks: { color: colors.tickColor },
                grid: { display: false }
            }
        }
    };
}

/**
 * Memperbarui tema chart yang ada saat mode di-toggle.
 * @param {Chart} chart - Instance Chart.js yang aktif
 */
function updateChartTheme(chart) {
    const colors = getChartColors();
    chart.options = getChartOptions(colors);
    chart.update();
}