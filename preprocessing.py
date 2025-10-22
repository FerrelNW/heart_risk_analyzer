import pandas as pd
import json
import numpy as np
from sklearn.preprocessing import StandardScaler
from pathlib import Path

FEATURES = [
    'age', 'sex', 'trestbps', 'chol', 'thalch'
]
TARGET = 'num' 

NUMERIC_FEATURES = ['age', 'trestbps', 'chol', 'thalch']
CATEGORICAL_FEATURES = ['sex']

def load_and_prep_data(csv_path, columns_path=None):
    
    try:
        df = pd.read_csv(csv_path).replace('?', np.nan)
    except FileNotFoundError:
        print(f"Error: File dataset tidak ditemukan di {csv_path}")
        return None, None, None
    except Exception as e:
        print(f"Error saat memuat CSV: {e}")
        return None, None, None

    # Fill missing values in numeric features with mean
    for col in NUMERIC_FEATURES:
        if df[col].isnull().any():
            df[col] = pd.to_numeric(df[col])
            mean_val = df[col].mean()
            df[col] = df[col].fillna(mean_val)
            
    # Fill missing values in categorical features with mode
    for col in CATEGORICAL_FEATURES:
         if df[col].isnull().any():
            mode_val = df[col].mode()[0]
            df[col] = df[col].fillna(mode_val)

    try:
        X = df[FEATURES].copy()
        y = df[TARGET].copy()
    except KeyError as e:
        print(f"Error: Kolom tidak ditemukan. Pastikan nama kolom di CSV sudah benar: {e}")
        return None, None, None

    
    X['sex'] = X['sex'].map({'Male': 1, 'Female': 0}).astype(int)
    
    y = y.apply(lambda x: 1 if x > 0 else 0)

    scaler = StandardScaler()
    X[NUMERIC_FEATURES] = scaler.fit_transform(X[NUMERIC_FEATURES])

    if columns_path:
        try:
            with open(columns_path, 'w') as f:
                json.dump(X.columns.tolist(), f)
            print(f"Column names (5 features) saved to {columns_path}")
        except Exception as e:
            print(f"Error saving columns file: {e}")
    
    print(f"Data loaded and cleaned successfully (5 features). Shape: {X.shape}")
    return X, y, scaler