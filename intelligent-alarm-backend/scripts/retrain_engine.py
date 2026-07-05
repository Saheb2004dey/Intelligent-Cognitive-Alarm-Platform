import asyncio
import os
import logging
import pandas as pd
import joblib
from motor.motor_asyncio import AsyncIOMotorClient
from sklearn.ensemble import RandomForestClassifier
from dotenv import load_dotenv

# Configure production-grade logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

# Strictly enforce database URL without hardcoded fallback credentials
MONGO_URL = os.getenv("MONGO_URL")
if not MONGO_URL:
    raise ValueError("CRITICAL: MONGO_URL environment variable is not set.")

async def run_retraining_loop():
    logger.info("Initiating Nightly ML Retraining Engine...")
    
    try:
        # 1. Database Connection
        client = AsyncIOMotorClient(MONGO_URL)
        db = client["cognitive_alarm_logs"]
        collection = db["challenge_logs"]
        
        # 2. Ingest Recent Telemetry
        cursor = collection.find({})
        logs = await cursor.to_list(length=1000)
        
        if not logs:
            logger.info("No new challenge logs found. Retraining skipped.")
            return

        logger.info(f"Ingested {len(logs)} new interaction logs from MongoDB.")
        
        # 3. Format Data
        new_data = pd.DataFrame(logs)
        expected_cols = ['habit_score', 'snooze_count', 'time_to_solve_seconds', 'failed_attempts', 'difficulty_level']
        
        # 4. Load Historical Baseline
        data_path = os.path.join(os.path.dirname(__file__), '../data/synthetic_cognitive_data.csv')
        if not os.path.exists(data_path):
            logger.error("Historical dataset not found. Aborting process.")
            return
            
        historical_df = pd.read_csv(data_path)
        logger.info(f"Loaded {len(historical_df)} rows of historical baseline data.")
        
        # TODO: In Week 2, execute Postgres JOIN here to map 'user_id' from Mongo 
        # to the live 'snooze_count' and 'habit_score' in Postgres before concatenating.
        df_combined = historical_df 
        
        # 5. Execute Retraining
        logger.info("Fitting RandomForestClassifier to updated dataset...")
        X = df_combined[['habit_score', 'snooze_count', 'avg_time_to_solve', 'failed_attempts']]
        y = df_combined['target_difficulty']
        
        model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
        model.fit(X, y)
        
        # 6. Save Updated Model
        model_path = os.path.join(os.path.dirname(__file__), '../models/adaptive_model_v1.pkl')
        joblib.dump(model, model_path)
        
        logger.info(f"ML Engine successfully updated and persisted to {model_path}.")
        
    except Exception as e:
        logger.error(f"Retraining loop failed: {str(e)}", exc_info=True)
        raise

if __name__ == "__main__":
    asyncio.run(run_retraining_loop())