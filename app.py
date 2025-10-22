import pandas as pd
import joblib
import numpy as np
import shap
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
from pathlib import Path 
import json

# Impor NUMERIC_FEATURES baru (sekarang berisi 4 item)
from preprocessing import NUMERIC_FEATURES 

# --- Konfigurasi Path ---
ROOT_DIR = Path(__file__).parent 
MODEL_PATH = ROOT_DIR / 'models' / 'heart_disease_model.joblib'
SCALER_PATH = ROOT_DIR / 'models' / 'heart_disease_scaler.joblib'
COLUMNS_PATH = ROOT_DIR / 'models' / 'model_columns.json'

# --- Inisialisasi App ---
app = Flask(__name__) 
CORS(app) 

# --- Load Models & Columns ---
model = None
scaler = None
model_columns = None
explainer = None 

try:
    # Memuat model 5-fitur, scaler 4-fitur, dan kolom 5-item
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    with open(COLUMNS_PATH, 'r') as f:
        model_columns = json.load(f)

    explainer = shap.TreeExplainer(model)
    print("Model, scaler, columns, and SHAP explainer loaded successfully (5-feature model).")

except FileNotFoundError:
    print("="*50)
    print("Error: Model/scaler/columns files not found.")
    print(f"Pastikan file ada di {MODEL_PATH}")
    print(">>> PENTING: Jalankan 'python model.py' terlebih dahulu untuk melatih model 5-fitur! <<<")
    print("="*50)
except Exception as e:
    print(f"An unexpected error occurred during model loading: {e}")


# --- Rute Halaman Utama ---
@app.route('/')
def serve_index():
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
        
        # --- PREPROCESSING SISI API (JAUH LEBIH SEDERHANA) ---
        
        # 1. Konversi Tipe Data 'sex'
        if 'sex' in input_df.columns:
            input_df['sex'] = input_df['sex'].astype(int)

        # 2. Pastikan urutan kolom benar
        # model_columns sekarang adalah ['age', 'sex', 'trestbps', 'chol', 'thalchh']
        try:
            input_df = input_df[model_columns]
        except KeyError as e:
            print(f"Error: Kolom input tidak cocok dengan kolom model. {e}")
            return jsonify({"error": "Data input tidak lengkap."}), 400

        # 3. Scale fitur numerik
        # NUMERIC_FEATURES sekarang adalah ['age', 'trestbps', 'chol', 'thalchh']
        input_df[NUMERIC_FEATURES] = scaler.transform(input_df[NUMERIC_FEATURES])
        
        # --- PREDIKSI ---
        
        # Prediksi probabilitas
        prediction_proba = model.predict_proba(input_df)[0][1] # Ambil probabilitas kelas 1 (sakit)

        # Hitung SHAP values (sekarang untuk 5 fitur)
        shap_values = explainer.shap_values(input_df)
        
        # Ambil nilai shap untuk kelas 1 (indeks 1)
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