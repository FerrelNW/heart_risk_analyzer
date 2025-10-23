import joblib
from sklearn.ensemble import RandomForestClassifier
from preprocessing import load_and_prep_data
from pathlib import Path
import json


# Path
ROOT_DIR = Path(__file__).parent 
DATA_FILE_PATH = ROOT_DIR / 'data' / 'heart_disease_uci.csv'

MODEL_SAVE_PATH = ROOT_DIR / 'models' / 'heart_disease_model.joblib'
SCALER_SAVE_PATH = ROOT_DIR / 'models' / 'heart_disease_scaler.joblib'
COLUMNS_SAVE_PATH = ROOT_DIR / 'models' / 'model_columns.json'

def train_and_save_model():
    """
    Melatih model RandomForest Classifier untuk prediksi penyakit jantung menggunakan 5 fitur.
    """
    print("Loading and preparing data for Heart Disease model...")
    X, y, scaler = load_and_prep_data(DATA_FILE_PATH, COLUMNS_SAVE_PATH)
    
    if X is None:
        print("Halting training due to data loading error.")
        return

    print("Data prepared. Training RandomForestClassifier model...")
    
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    print("Model training complete.")

    (ROOT_DIR / 'models').mkdir(exist_ok=True)

    try:
        joblib.dump(model, MODEL_SAVE_PATH)
        joblib.dump(scaler, SCALER_SAVE_PATH)
        print(f"Model saved to {MODEL_SAVE_PATH}")
        print(f"Scaler saved to {SCALER_SAVE_PATH}")
    except Exception as e:
        print(f"Error saving models: {e}")

if __name__ == "__main__":
    train_and_save_model()