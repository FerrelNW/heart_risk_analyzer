# HeartRisk.AI ❤️

HeartRisk.AI is a web application that predicts the risk of heart disease using a Machine Learning model. It provides users with a percentage risk score based on 5 key health metrics and explains the prediction using SHAP values.

## Features ✨

* **Risk Prediction:** Calculates the probability of heart disease based on user input.
* **Explainable AI (XAI):** Uses SHAP (SHapley Additive exPlanations) to visualize which factors most influence the prediction via a bar chart.
* **Personalized Recommendations:** Provides dynamic health advice based on the user's input values (cholesterol, blood pressure, age) and the AI's analysis.
* **User-Friendly Interface:** Clean and simple UI built with Tailwind CSS, focused on ease of use.
* **Dark Mode:** Features a fixed dark theme for comfortable viewing.

---

## Tech Stack 🛠️

* **Backend:** Python, Flask
* **Machine Learning:** Scikit-learn (RandomForestClassifier), SHAP, Pandas, NumPy
* **Frontend:** HTML, CSS (Tailwind CSS), JavaScript
* **Charting:** Chart.js

---

## Setup & Installation ⚙️

To run this project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <your-repository-directory>
    ```

2.  **Create and activate a virtual environment** (recommended):
    ```bash
    # Windows
    python -m venv venv
    .\venv\Scripts\activate

    # macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
    *(Note: You might need to create a `requirements.txt` file first using `pip freeze > requirements.txt` after installing Flask, Scikit-learn, SHAP, Pandas, NumPy, joblib)*

4.  **Train the model:**
    Ensure you have the `heart_disease_uci.csv` dataset inside a `data/` folder. Then, run the training script **once**:
    ```bash
    python model.py
    ```
    This will create the necessary model files (`.joblib`, `.json`) inside the `models/` directory.

5.  **Run the Flask application:**
    ```bash
    python app.py
    ```

6.  **Open your browser:** Navigate to `http://127.0.0.1:5000`

---

## Usage 🖱️

1.  Open the web application in your browser.
2.  Enter the required patient data: Age, Sex, Total Cholesterol, Resting Blood Pressure (Systolic), and Max Heart Rate achieved during an exercise test.
3.  Click the "Analyze Risk" button.
4.  The application will display:
    * The predicted risk percentage.
    * The corresponding risk level (Low, Medium, High).
    * A bar chart showing the contribution of each input factor to the risk score (SHAP values).
    * Personalized recommendations and notes based on your input data.
