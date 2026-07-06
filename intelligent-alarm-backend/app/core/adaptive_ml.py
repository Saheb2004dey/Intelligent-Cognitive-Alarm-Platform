import os
import joblib
import numpy as np
import pandas as pd

# Load the model once when the module is imported to save memory/time
MODEL_PATH = os.path.join(os.path.dirname(__file__), '../../models/adaptive_model_v1.pkl')

try:
    model = joblib.load(MODEL_PATH)
except FileNotFoundError:
    model = None
    print("Warning: ML model not found. Falling back to default difficulty.")

def predict_difficulty(habit_score: float, snooze_count: int, avg_time_to_solve: float = 30.0, failed_attempts: int = 0) -> int:
    """
    Ingests user telemetry and uses the trained Scikit-learn model
    to output a predicted difficulty level (1-5).
    """
    if model is None:
        # Fallback if the model file is missing
        return min(5, 1 + snooze_count)

    # Format the input exactly as the model was trained
    # Features: ['habit_score', 'snooze_count', 'avg_time_to_solve', 'failed_attempts']
    # input_features = np.array([[habit_score, snooze_count, avg_time_to_solve, failed_attempts]])
    # Format the input exactly as the model was trained, using a DataFrame to prevent Scikit-Learn warnings
    input_features = pd.DataFrame(
        [[habit_score, snooze_count, avg_time_to_solve, failed_attempts]], 
        columns=['habit_score', 'snooze_count', 'avg_time_to_solve', 'failed_attempts']
    )
    
    # Predict returns an array, so we grab the first element
    predicted_diff = model.predict(input_features)[0]
    
    return int(predicted_diff)