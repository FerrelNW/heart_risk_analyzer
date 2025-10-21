import pandas as pd
import json
import numpy as np
from sklearn.preprocessing import StandardScaler
from pathlib import Path

# --- KONFIGURASI FITUR ---
# Fitur yang akan kita gunakan
FEATURES = [
    'age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 
    'restecg', 'thalch', 'exang', 'oldpeak', 'slope', 'ca', 'thal'
]
# Kolom target (nama yang benar adalah 'num')
TARGET = 'num' 

# Memisahkan mana fitur numerik dan kategorikal (teks)
NUMERIC_FEATURES = ['age', 'trestbps', 'chol', 'thalch', 'oldpeak']
CATEGORICAL_FEATURES = ['sex', 'cp', 'fbs', 'restecg', 'exang', 'slope', 'ca', 'thal']

def load_and_prep_data(csv_path, columns_path=None):
    """
    Memuat dataset, membersihkan data ('?'), mengisi data yang hilang (impute),
    melakukan encoding pada data teks, dan melakukan scaling.
    """
    try:
        # 1. Muat data dan langsung ganti '?' dengan NaN
        df = pd.read_csv(csv_path).replace('?', np.nan)
    except FileNotFoundError:
        print(f"Error: File dataset tidak ditemukan di {csv_path}")
        return None, None, None
    except Exception as e:
        print(f"Error saat memuat CSV: {e}")
        return None, None, None

    # --- 2. MENGISI DATA HILANG (IMPUTATION) ---
    # Isi data numerik yang hilang dengan rata-rata (mean)
    for col in NUMERIC_FEATURES:
        if df[col].isnull().any():
            # Pastikan kolom di-convert ke float SEBELUM menghitung mean
            df[col] = pd.to_numeric(df[col])
            mean_val = df[col].mean()
            df[col] = df[col].fillna(mean_val)
            
    # Isi data kategorikal yang hilang dengan nilai paling sering muncul (modus)
    for col in CATEGORICAL_FEATURES:
         if df[col].isnull().any():
            mode_val = df[col].mode()[0]
            df[col] = df[col].fillna(mode_val)

    # Pisahkan fitur (X) dan target (y)
    try:
        X = df[FEATURES].copy()
        y = df[TARGET].copy()
    except KeyError as e:
        print(f"Error: Kolom tidak ditemukan. Pastikan nama kolom di CSV sudah benar: {e}")
        return None, None, None

    # --- 3. ENCODING TEKS MENJADI ANGKA ---
    # Ubah 'sex' (Male/Female) menjadi 1/0
    X['sex'] = X['sex'].map({'Male': 1, 'Female': 0}).astype(int)
    
    # Ubah 'fbs' (True/False) menjadi 1/0
    X['fbs'] = X['fbs'].map({True: 1, False: 0}).astype(int)
    
    # Ubah 'exang' (True/False) menjadi 1/0
    X['exang'] = X['exang'].map({True: 1, False: 0}).astype(int)
    
    # Ubah kolom kategorikal lainnya dengan One-Hot Encoding
    # Ini akan membuat kolom baru seperti 'cp_typical angina', 'cp_asymptomatic', dll.
    X = pd.get_dummies(X, columns=['cp', 'restecg', 'slope', 'thal', 'ca'])

    # Ubah target menjadi biner (0 = sehat, 1 = sakit)
    # Dataset ini memiliki nilai 0, 1, 2, 3, 4. Kita anggap 0 = sehat, >0 = sakit.
    y = y.apply(lambda x: 1 if x > 0 else 0)

    # --- 4. SCALING ---
    scaler = StandardScaler()
    # Scale hanya fitur numerik asli
    X[NUMERIC_FEATURES] = scaler.fit_transform(X[NUMERIC_FEATURES])

    # --- 5. SIMPAN KOLOM ---
    # Simpan nama kolom SETELAH one-hot encoding
    if columns_path:
        try:
            with open(columns_path, 'w') as f:
                json.dump(X.columns.tolist(), f)
            print(f"Column names saved to {columns_path}")
        except Exception as e:
            print(f"Error saving columns file: {e}")
    
    print(f"Data loaded and cleaned successfully. Shape: {X.shape}")
    return X, y, scaler