from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone, timedelta
from fastapi_cache.decorator import cache

from app.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.habit import Habit, HabitLog
from app.core.analytics.scoring import calculate_habit_score
from app.core.analytics.groq_recommendations import generate_ai_recommendations
from app.services.telemetry_service import get_user_telemetry_last_7_days

router = APIRouter(prefix="/analytics", tags=["Analytics"])

def analytics_key_builder(func, namespace: str = "", request=None, response=None, args=None, kwargs=None):
    """Custom key builder to cache results uniquely per user, ignoring DB session reference changes."""
    current_user = kwargs.get("current_user") if kwargs else None
    user_id = str(current_user.id) if current_user else "anonymous"
    return f"analytics:{func.__name__}:{user_id}"

@router.get("/habit-score")
@cache(expire=43200, key_builder=analytics_key_builder)
async def get_habit_score(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    GET /analytics/habit-score
    Calculates and returns the user's habit score based on their last 7 days of activity.
    Saves the calculated score to the database and caches the result for 12 hours.
    """
    try:
        # Fetch user telemetry
        telemetry = await get_user_telemetry_last_7_days(str(current_user.id))
        
        # 1. Consistency: based on habit completion in the last 7 days
        seven_days_ago = datetime.now(timezone.utc).date() - timedelta(days=7)
        habits = db.query(Habit).filter(Habit.user_id == current_user.id).all()
        habit_ids = [h.id for h in habits]
        
        if habit_ids:
            total_logs = db.query(HabitLog).filter(
                HabitLog.habit_id.in_(habit_ids),
                HabitLog.log_date >= seven_days_ago
            ).count()
            
            completed_logs = db.query(HabitLog).filter(
                HabitLog.habit_id.in_(habit_ids),
                HabitLog.log_date >= seven_days_ago,
                HabitLog.completed == True
            ).count()
            
            consistency = (completed_logs / total_logs * 100.0) if total_logs > 0 else 80.0
        else:
            consistency = 80.0

        # 2. Challenge Rate: 100 - failure_rate_percent
        failure_rate = telemetry.get("failure_rate_percent", 0.0)
        challenge_rate = max(0.0, 100.0 - failure_rate)

        # 3. Snooze Reduction: starts at 100, drops by 15 per snooze
        total_snoozes = telemetry.get("total_snoozes", 0)
        snooze_reduction = max(0.0, 100.0 - (total_snoozes * 15.0))

        # 4. Sleep Adherence: base adherence adjusted by streak
        has_target_times = current_user.target_bedtime is not None and current_user.target_wake_time is not None
        base_adherence = 95.0 if has_target_times else 70.0
        sleep_adherence = min(100.0, base_adherence + current_user.current_streak)

        # Compute overall score
        score = calculate_habit_score(
            consistency=consistency,
            challenge_rate=challenge_rate,
            snooze_reduction=snooze_reduction,
            sleep_adherence=sleep_adherence
        )

        # Update score in database
        current_user.habit_score = score
        db.commit()
        db.refresh(current_user)

        status_str = "poor"
        if score >= 80:
            status_str = "good"
        elif score >= 50:
            status_str = "fair"

        return {
            "habit_score": score,
            "status": status_str,
            "message": "Actual calculated habit score based on 7-day user telemetry"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate habit score: {str(e)}"
        )

@router.get("/recommendations")
@cache(expire=43200, key_builder=analytics_key_builder)
async def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    GET /analytics/recommendations
    Generates and returns personalized AI recommendations using Groq and caches the result for 12 hours.
    """
    try:
        # Fetch telemetry
        telemetry = await get_user_telemetry_last_7_days(str(current_user.id))
        
        # Calculate or retrieve habit score
        habit_score = current_user.habit_score
        if habit_score == 0.0:
            # Fallback dynamic score calculation if not calculated yet
            seven_days_ago = datetime.now(timezone.utc).date() - timedelta(days=7)
            habits = db.query(Habit).filter(Habit.user_id == current_user.id).all()
            habit_ids = [h.id for h in habits]
            
            if habit_ids:
                total_logs = db.query(HabitLog).filter(
                    HabitLog.habit_id.in_(habit_ids),
                    HabitLog.log_date >= seven_days_ago
                ).count()
                completed_logs = db.query(HabitLog).filter(
                    HabitLog.habit_id.in_(habit_ids),
                    HabitLog.log_date >= seven_days_ago,
                    HabitLog.completed == True
                ).count()
                consistency = (completed_logs / total_logs * 100.0) if total_logs > 0 else 80.0
            else:
                consistency = 80.0

            failure_rate = telemetry.get("failure_rate_percent", 0.0)
            challenge_rate = max(0.0, 100.0 - failure_rate)
            total_snoozes = telemetry.get("total_snoozes", 0)
            snooze_reduction = max(0.0, 100.0 - (total_snoozes * 15.0))
            has_target_times = current_user.target_bedtime is not None and current_user.target_wake_time is not None
            base_adherence = 95.0 if has_target_times else 70.0
            sleep_adherence = min(100.0, base_adherence + current_user.current_streak)

            habit_score = calculate_habit_score(
                consistency=consistency,
                challenge_rate=challenge_rate,
                snooze_reduction=snooze_reduction,
                sleep_adherence=sleep_adherence
            )

        recommendations_dict = await generate_ai_recommendations(
            user_name=current_user.full_name,
            telemetry_data=telemetry,
            habit_score=habit_score
        )

        rec_list = list(recommendations_dict.values())

        return {
            "recommendations": rec_list,
            "details": recommendations_dict,
            "message": "AI-generated recommendations based on your 7-day smart-alarm data"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recommendations: {str(e)}"
        )
