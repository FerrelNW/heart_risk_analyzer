document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('predict-form');
    form.addEventListener('submit', handlePrediction);
});


async function handlePrediction(event) {
    event.preventDefault();

    const button = document.getElementById('predict-button');
    const buttonText = document.getElementById('button-text');
    const buttonLoader = document.getElementById('button-loader');
    const resultContainer = document.getElementById('result-content');
    const recommendationContainer = document.getElementById('recommendation-container');

    recommendationContainer.classList.add('hidden');
    recommendationContainer.innerHTML = '';
    button.disabled = true;
    buttonText.classList.add('hidden');
    buttonLoader.classList.remove('hidden');
    resultContainer.innerHTML = `
        <h2 class="text-2xl font-semibold text-primary mb-2">Analyzing...</h2>
        <p class="text-secondary">Please wait, the AI is processing your data.</p>
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mt-4"></div>
    `;

    const formData = new FormData(event.target);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = parseFloat(value);
    });

    try {
        // Kirim data ke backend
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
            <h2 class="text-2xl font-semibold text-red-500 mb-2">An Error Occurred</h2>
            <p class="text-secondary">${error.message}</p>
        `;
    } finally {
        button.disabled = false;
        buttonText.classList.remove('hidden');
        buttonLoader.classList.add('hidden');
    }
}

/**
 * @param {object} result - Hasil dari backend (API)
 * @param {object} inputData - Data asli yang diinput user
 */
function renderResult(result, inputData) {
    const { prediction_probability, shap_values } = result;
    const resultContainer = document.getElementById('result-content');
    const recommendationContainer = document.getElementById('recommendation-container');

    // Tentukan level risiko & warna
    let riskLevel, riskColorClass;
    if (prediction_probability < 40) {
        riskLevel = "Low";
        riskColorClass = "text-green-500";
    } else if (prediction_probability < 70) {
        riskLevel = "Medium";
        riskColorClass = "text-yellow-500";
    } else {
        riskLevel = "High";
        riskColorClass = "text-red-500";
    }

    // Urutkan SHAP values berdasarkan dampaknya
    const sortedShap = Object.entries(shap_values)
        .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a));

    const suggestionHtml = getDynamicSuggestion(sortedShap, inputData);

    resultContainer.innerHTML = `
        <h2 class="text-2xl font-semibold text-primary mb-2">Your Analysis Results</h2>
        <p class="text-6xl font-bold ${riskColorClass}">${prediction_probability}%</p>
        <p class="text-2xl text-secondary mb-6">${riskLevel} Risk</p>
        <div class="w-full text-left mb-6">
            <h3 class="text-lg font-semibold text-primary mb-3">Risk Factor Analysis (AI)</h3>
            <p class="text-sm text-secondary mb-3">Based on the data you entered, here are the factors contributing most to your current risk score.</p>
            <div class="relative h-64">
                <canvas id="shapChart"></canvas>
            </div>
            <p class="text-xs text-secondary mt-2 text-center">
                <span class="text-red-500">Red</span>: Increases Risk | <span class="text-blue-500">Blue</span>: Decreases Risk
            </p>
        </div>
    `;

    // Rekomenasi personal
    recommendationContainer.innerHTML = suggestionHtml;
    recommendationContainer.classList.remove('hidden');

    renderShapChart(sortedShap);
}

/**
 * Buat saran personal berdasarkan input user & hasil AI (SHAP).
 * @param {Array} sortedShap - Nilai SHAP yg sudah diurutkan
 * @param {object} inputData - Data asli yg diinput user
 */
function getDynamicSuggestion(sortedShap, inputData) {
    let suggestions = [];

    //Cek input user
    if (inputData.chol >= 240) {
        suggestions.push(`<strong>Your Cholesterol (Level: ${inputData.chol}) is VERY HIGH.</strong> This is a major risk factor. It's highly recommended to reduce saturated/trans fats (fried foods, organ meats) and increase fiber (fruits, vegetables, oatmeal).`);
    } else if (inputData.chol >= 200) {
        suggestions.push(`<strong>Your Cholesterol (Level: ${inputData.chol}) is BORDERLINE HIGH.</strong> Start improving your diet to bring it back to a normal level.`);
    } else {
        suggestions.push(`<strong>Your Cholesterol (Level: ${inputData.chol}) is NORMAL.</strong> This is excellent! Maintain your healthy eating habits.`);
    }

    if (inputData.trestbps >= 140) {
        suggestions.push(`<strong>Your Blood Pressure (Level: ${inputData.trestbps}) is HIGH (Hypertension).</strong> This is a serious risk factor. It's important to reduce salt intake (flavorings, instant foods), exercise regularly, and manage stress. Monitor it regularly.`);
    } else if (inputData.trestbps >= 130) {
        suggestions.push(`<strong>Your Blood Pressure (Level: ${inputData.trestbps}) is ELEVATED.</strong> This is an early warning. Try reducing salt consumption and start light regular exercise.`);
    } else if (inputData.trestbps >= 120) {
         suggestions.push(`<strong>Your Blood Pressure (Level: ${inputData.trestbps}) is slightly elevated.</strong> It's still within a reasonable range, but prevent further increases with a healthy lifestyle.`);
    } else {
        suggestions.push(`<strong>Your Blood Pressure (Level: ${inputData.trestbps}) is NORMAL.</strong> Excellent! Maintain your active lifestyle and balanced diet.`);
    }

    if (inputData.age >= 50) {
         suggestions.push(`<strong>Your Age (${inputData.age} years)</strong> is naturally a risk factor. Since age cannot be changed, it becomes increasingly important to manage other factors you can control (diet, exercise, stress).`);
    }

    // Tambahkan insight dari AI (SHAP)
    if (sortedShap.length > 0) {
        const [topFactorName, topFactorValue] = sortedShap[0];
        const featureMap = getFeatureNameMap();
        const friendlyName = featureMap[topFactorName] || topFactorName;

        if (topFactorValue > 0) {
            if (topFactorName !== 'chol' && topFactorName !== 'trestbps' && topFactorName !== 'age') {
                suggestions.push(`The AI analysis also highlights **${friendlyName}** (Level: ${inputData[topFactorName]}) as the unique factor contributing most significantly to your risk.`);
            }
        } else {
             if (topFactorName !== 'chol' && topFactorName !== 'trestbps') {
                suggestions.push(`Good news! The AI analysis shows **${friendlyName}** (Level: ${inputData[topFactorName]}) is the main factor **decreasing** your risk. Keep it up!`);
             }
        }
    }

    let html = '<h3 class="text-2xl font-semibold text-primary mb-4">Personal Recommendations & Notes</h3>';
    if (suggestions.length > 0) {
        html += '<ul class="list-disc list-inside space-y-3 text-secondary text-base">';
        suggestions.forEach(suggestion => {
            suggestion = suggestion.replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary">$1</strong>');
            html += `<li>${suggestion}</li>`;
        });
        html += '</ul>';
    } else {
        html += '<p class="text-secondary text-base">Based on your data, there are no specific notes. Keep maintaining a healthy lifestyle.</p>';
    }
    
    html += '<p class="text-sm text-secondary italic mt-6 font-medium">IMPORTANT: This analysis is an informational tool and not a substitute for professional medical diagnosis or advice. Always consult with your doctor.</p>';
    return html;
}

function getFeatureNameMap() {
    return {
        'age': 'Age',
        'sex': 'Sex (Male=1, Female=0)',
        'trestbps': 'Blood Pressure',
        'chol': 'Cholesterol',
        'thalch': 'Max Heart Rate (during test)',
    };
}

function getChartColors() {
    const styles = getComputedStyle(document.documentElement);
    return {
        gridColor: styles.getPropertyValue('--chart-grid-color').trim(),
        tickColor: styles.getPropertyValue('--chart-tick-color').trim(),
        red: 'rgba(239, 68, 68, 0.7)',
        blue: 'rgba(59, 130, 246, 0.7)',
        redBorder: 'rgba(239, 68, 68, 1)',
        blueBorder: 'rgba(59, 130, 246, 1)'
    };
}

/**
 * @param {Array} shapData - Data SHAP yg sudah diurutkan
 */
function renderShapChart(shapData) {
    const ctx = document.getElementById('shapChart').getContext('2d');

    // Hapus chart lama jika ada
    let existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }

    const featureMap = getFeatureNameMap();
    const labels = shapData.map(item => featureMap[item[0]] || item[0]);
    const values = shapData.map(item => item[1]);
    const colors = getChartColors();

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Contribution to Risk',
                data: values,
                backgroundColor: values.map(v => v > 0 ? colors.red : colors.blue),
                borderColor: values.map(v => v > 0 ? colors.redBorder : colors.blueBorder),
                borderWidth: 1
            }]
        },
        options: getChartOptions(colors)
    });
}

function getChartOptions(colors) {
    return {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }, 
            tooltip: { 
                callbacks: {
                    label: function(context) {
                        let value = context.raw;
                        let label = value > 0 ? 'Increases Risk' : 'Decreases Risk';
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                title: { display: false },
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
