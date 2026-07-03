def predict_difficulty(habit_score: float, snooze_count: int, user_preference: str = None) -> int:
    """
    Simulates the Adaptive Difficulty ML Model.
    Ingests user telemetry and outputs a predicted difficulty level (1-5).
    
    TODO (Swayam): Replace this deterministic logic with a trained 
    Scikit-learn or XGBoost classifier once MongoDB telemetry data is gathered.
    """
    
    # Feature 1: Base difficulty on their long-term habit score (0-100)
    if habit_score >= 80:
        base_diff = 4
    elif habit_score >= 50:
        base_diff = 3
    elif habit_score >= 30:
        base_diff = 2
    else:
        base_diff = 1
        
    # Feature 2: Immediate Snooze Penalty (The Anti-Snooze Engine)
    # Every time they hit snooze this morning, the puzzle gets harder.
    escalated_diff = base_diff + snooze_count
    
    # Feature 3: Override with user's explicitly set difficulty preference (if applicable)
    # (Leaving room here for future logic if the user forces a specific mode)
    
    # Ensure the output stays strictly within our 1-5 classification bounds
    final_difficulty = max(1, min(5, escalated_diff))
    
    return final_difficulty