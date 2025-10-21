import pandas as pd
import joblib
import numpy as np
import shap
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
from pathlib import Path 
import json

# Impor langsung karena file-nya sejajar
from preprocessing import NUMERIC_FEATURES 

# --- Konfigurasi Path ---
ROOT_DIR = Path(__file__).parent 
MODEL_PATH = ROOT_DIR / 'models' / 'heart_disease_model.joblib'
SCALER_PATH = ROOT_DIR / 'models' / 'heart_disease_scaler.joblib'
COLUMNS_PATH = ROOT_DIR / 'models' / 'model_columns.json'

# --- Inisialisasi App ---
app = Flask(__name__) # Flask akan otomatis mencari folder 'templates' dan 'static'
CORS(app) 

# --- Load Models & Columns ---
model = None
scaler = None
model_columns = None
explainer = None # Definisikan di luar try block

try:
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    with open(COLUMNS_PATH, 'r') as f:
        model_columns = json.load(f)

    # RandomForestClassifier menggunakan TreeExplainer
    explainer = shap.TreeExplainer(model)
    print("Model, scaler, columns, and SHAP explainer loaded successfully.")

except FileNotFoundError:
    print("="*50)
    print("Error: Model/scaler/columns files not found.")
    print(f"Pastikan file ada di {MODEL_PATH}")
    print("Silakan jalankan 'python model.py' terlebih dahulu.")
    print("="*50)
except Exception as e:
    print(f"An unexpected error occurred during model loading: {e}")


# --- Rute Halaman Utama ---
@app.route('/')
def serve_index():
    # Ini akan otomatis mencari 'index.html' di dalam folder 'templates'
    return render_template('index.html')

# --- API Endpoint ---
@app.route('/api/predict_heart_disease', methods=['POST'])
def predict_heart_disease():
    if model is None or explainer is None or scaler is None or model_columns is None: 
        return jsonify({"error": "Model, explainer, atau scaler tidak dimuat dengan benar. Periksa konsol server."}), 500

    try:
        data = request.json
        # Buat DataFrame dari input
        input_df = pd.DataFrame([data]) 
        
        # --- PREPROCESSING SISI API ---
        
        # 1. Konversi Tipe Data (karena input dari web adalah float)
        int_features = ['sex', 'cp', 'fbs', 'restecg', 'exang', 'slope', 'ca', 'thal']
        for col in int_features:
            if col in input_df.columns:
                input_df[col] = input_df[col].astype(int)

        # 2. Lakukan One-Hot Encoding
        input_df = pd.get_dummies(input_df)

        # 3. Rekonsiliasi Kolom
        for col in model_columns:
            if col not in input_df.columns:
                input_df[col] = 0
        
        input_df = input_df.reindex(columns=model_columns, fill_value=0)

        # 4. Scale fitur numerik
        input_df[NUMERIC_FEATURES] = scaler.transform(input_df[NUMERIC_FEATURES])
        
        # --- PREDIKSI ---
        
        # Prediksi probabilitas
        prediction_proba = model.predict_proba(input_df)[0][1] # Ambil probabilitas kelas 1 (sakit)

        # Hitung SHAP values. Hasilnya berbentuk (1, n_fitur, 2)
        shap_values = explainer.shap_values(input_df)
        
        # ======================= PERUBAHAN DI SINI =======================
        # shap_values[0] -> mengambil data untuk sampel pertama (bentuk: n_fitur, 2)
        # val -> adalah array [shap_kelas_0, shap_kelas_1]
        # val[1] -> kita ambil hanya nilai untuk kelas 1 (sakit)
        shap_explanation = {name: float(val[1]) for name, val in zip(model_columns, shap_values[0])}
        # =================================================================

        return jsonify({
            'prediction_probability': round(prediction_proba * 100, 2),
            'shap_values': shap_explanation
        })

    except Exception as e:
        print(f"Error during prediction: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 400

# Start the server
if __name__ == '__main__':
    app.run(debug=True, port=5000)