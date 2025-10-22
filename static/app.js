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
        // Panggil API backend (yang sekarang juga mengharapkan 5 fitur)
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

    // ======================= PERUBAHAN DI SINI =======================
    // Baris .filter() telah dihapus
    const sortedShap = Object.entries(shap_values)
        .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a));
        // .slice(0, 5) juga tidak diperlukan karena kita hanya punya 5 fitur
    // =================================================================

    // Dapatkan saran dinamis
    const suggestionHtml = getDynamicSuggestion(sortedShap, inputData);

    // Buat HTML baru untuk KARTU HASIL (kanan atas)
    resultContainer.innerHTML = `
        <h2 class="text-2xl font-semibold text-primary mb-2">Hasil Analisis Anda</h2>
        <p class="text-6xl font-bold ${riskColorClass}">${prediction_probability}%</p>
        <p class="text-2xl text-secondary mb-6">Risiko ${riskLevel}</p>

        <div class="w-full text-left mb-6">
            <h3 class="text-lg font-semibold text-primary mb-3">Analisis Faktor Risiko (AI)</h3>
            <p class="text-sm text-secondary mb-3">Berdasarkan data yang Anda masukkan, berikut adalah faktor yang paling berkontribusi pada skor risiko Anda.</p>
            
            <div class="relative h-64"> <canvas id="shapChart"></canvas>
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

    // Analisis Kolesterol
    if (inputData.chol >= 240) {
        suggestions.push(`<strong>Kolesterol Anda (Level: ${inputData.chol}) tergolong SANGAT TINGGI.</strong> Ini adalah faktor risiko utama. Sangat disarankan untuk mengurangi lemak jenuh/trans (gorengan, jeroan) dan perbanyak serat (buah, sayur, oatmeal).`);
    } else if (inputData.chol >= 200) {
        suggestions.push(`<strong>Kolesterol Anda (Level: ${inputData.chol}) berada di BATAS TINGGI.</strong> Mulailah perbaiki pola makan untuk menurunkannya kembali ke level normal.`);
    } else {
        suggestions.push(`<strong>Kolesterol Anda (Level: ${inputData.chol}) tergolong NORMAL.</strong> Ini sangat baik! Pertahankan pola makan sehat Anda.`);
    }

    // Analisis Tekanan Darah (Sistolik)
    if (inputData.trestbps >= 140) {
        suggestions.push(`<strong>Tekanan Darah Anda (Level: ${inputData.trestbps}) tergolong TINGGI (Hipertensi).</strong> Ini adalah faktor risiko serius. Penting untuk mengurangi asupan garam (penyedap, makanan instan), berolahraga teratur, dan mengelola stres. Pantau secara rutin.`);
    } else if (inputData.trestbps >= 130) {
        suggestions.push(`<strong>Tekanan Darah Anda (Level: ${inputData.trestbps}) di atas normal.</strong> Ini adalah peringatan dini. Cobalah kurangi konsumsi garam dan mulai berolahraga ringan secara teratur.`);
    } else if (inputData.trestbps >= 120) {
         suggestions.push(`<strong>Tekanan Darah Anda (Level: ${inputData.trestbps}) sedikit meningkat.</strong> Ini masih dalam batas wajar, namun jaga agar tidak naik lebih lanjut dengan pola hidup sehat.`);
    } else {
        suggestions.push(`<strong>Tekanan Darah Anda (Level: ${inputData.trestbps}) tergolong NORMAL.</strong> Luar biasa! Pertahankan gaya hidup aktif dan pola makan seimbang Anda.`);
    }

    // Analisis Usia
    if (inputData.age >= 50) {
         suggestions.push(`<strong>Usia Anda (${inputData.age} tahun)</strong> secara alami adalah faktor risiko. Karena usia tidak bisa diubah, menjadi semakin penting untuk mengelola faktor lain yang bisa Anda kontrol (diet, olahraga, stres).`);
    }

    // --- 2. Analisis berdasarkan AI (SHAP) ---
    if (sortedShap.length > 0) {
        const [topFactorName, topFactorValue] = sortedShap[0];
        const featureMap = getFeatureNameMap();
        const friendlyName = featureMap[topFactorName] || topFactorName;

        if (topFactorValue > 0) {
            // Hanya tambahkan jika faktor teratas BUKAN kolesterol, tensi, atau usia (karena sudah dibahas)
            if (topFactorName !== 'chol' && topFactorName !== 'trestbps' && topFactorName !== 'age') {
                suggestions.push(`Analisis AI juga menyoroti **${friendlyName}** (Level: ${inputData[topFactorName]}) sebagai faktor unik yang paling berkontribusi pada risiko Anda.`);
            }
        } else {
             // Cek apakah faktor teratas (yang menurunkan risiko) bukan 'chol' atau 'trestbps' yang sudah normal
             if (topFactorName !== 'chol' && topFactorName !== 'trestbps') {
                suggestions.push(`Kabar baik! Analisis AI menunjukkan **${friendlyName}** (Level: ${inputData[topFactorName]}) adalah faktor utama yang **menurunkan** risiko Anda. Pertahankan!`);
             }
        }
    }

    // --- 3. Bangun HTML Akhir ---
    let html = '<h3 class="text-2xl font-semibold text-primary mb-4">Rekomendasi & Catatan Personal</h3>';
    if (suggestions.length > 0) {
        html += '<ul class="list-disc list-inside space-y-3 text-secondary text-base">';
        suggestions.forEach(suggestion => {
            // Ganti **teks** menjadi <strong>tag</strong>
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
 */
function getFeatureNameMap() {
    // Nama kolom di sini HARUS SAMA PERSIS dengan preprocessing.py
    // Jika Anda menggunakan 'thalac' di preprocessing.py, ganti 'thalch' di sini menjadi 'thalac'
    return {
        'age': 'Usia',
        'sex': 'Jenis Kelamin (Pria=1, Wanita=0)',
        'trestbps': 'Tekanan Darah',
        'chol': 'Kolesterol',
        'thalch': 'Detak Jantung Maks. (saat tes)', // <-- Pastikan ini SAMA dengan nama kolom Anda
    };
}


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