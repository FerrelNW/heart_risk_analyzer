import pandas as pd
import json
import numpy as np
from sklearn.preprocessing import StandardScaler
from pathlib import Path

# --- KONFIGURASI FITUR BARU (HANYA 5) ---
FEATURES = [
    'age', 'sex', 'trestbps', 'chol', 'thalch'
]
# Kolom target (nama yang benar adalah 'num')
TARGET = 'num' 

# Memisahkan mana fitur numerik dan kategorikal
NUMERIC_FEATURES = ['age', 'trestbps', 'chol', 'thalch']
CATEGORICAL_FEATURES = ['sex']

def load_and_prep_data(csv_path, columns_path=None):
    """
    Memuat dataset, membersihkan data ('?'), mengisi data yang hilang (impute),
    melakukan encoding pada data teks, dan melakukan scaling.
    HANYA MENGGUNAKAN 5 FITUR.
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
    # Loop ini sekarang hanya akan berjalan untuk 4 fitur numerik
    for col in NUMERIC_FEATURES:
        if df[col].isnull().any():
            df[col] = pd.to_numeric(df[col])
            mean_val = df[col].mean()
            df[col] = df[col].fillna(mean_val)
            
    # Loop ini sekarang hanya akan berjalan untuk 'sex'
    for col in CATEGORICAL_FEATURES:
         if df[col].isnull().any():
            mode_val = df[col].mode()[0]
            df[col] = df[col].fillna(mode_val)

    # Pisahkan fitur (X) dan target (y)
    try:
        # X sekarang hanya akan berisi 5 FITUR
        X = df[FEATURES].copy()
        y = df[TARGET].copy()
    except KeyError as e:
        print(f"Error: Kolom tidak ditemukan. Pastikan nama kolom di CSV sudah benar: {e}")
        return None, None, None

    # --- 3. ENCODING TEKS MENJADI ANGKA ---
    # Ubah 'sex' (Male/Female) menjadi 1/0
    X['sex'] = X['sex'].map({'Male': 1, 'Female': 0}).astype(int)
    
    # SEMUA PROSES ENCODING LAINNYA (get_dummies) DIHAPUS

    # Ubah target menjadi biner (0 = sehat, 1 = sakit)
    y = y.apply(lambda x: 1 if x > 0 else 0)

    # --- 4. SCALING ---
    scaler = StandardScaler()
    # Scale hanya 4 fitur numerik
    X[NUMERIC_FEATURES] = scaler.fit_transform(X[NUMERIC_FEATURES])

    # --- 5. SIMPAN KOLOM ---
    # Simpan 5 nama kolom
    if columns_path:
        try:
            with open(columns_path, 'w') as f:
                json.dump(X.columns.tolist(), f)
            print(f"Column names (5 features) saved to {columns_path}")
        except Exception as e:
            print(f"Error saving columns file: {e}")
    
    print(f"Data loaded and cleaned successfully (5 features). Shape: {X.shape}")
    return X, y, scaler