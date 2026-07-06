from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import time

from app.database import get_db
from app.models.alarm import Alarm
from app.models.user import User
from app.api.auth import get_current_user
from app.schemas.alarm import AlarmCreate, AlarmResponse
from app.schemas.challenge import SnoozeRequest, SnoozeResponse
from app.services.alarm_service import register_snooze

router = APIRouter(prefix="/alarms", tags=["Alarms"])

# Dummy data for testing before DB connection is finalized
mock_db_alarms = [
    {"id": 1, "user_id": 1, "time": time(7, 0), "label": "Morning Class", "is_active": True, "difficulty_preference": "Medium"}
]

@router.post("/", response_model=AlarmResponse, status_code=status.HTTP_201_CREATED)
def create_alarm(alarm: AlarmCreate):
    """Schedule a new alarm."""
    new_alarm = alarm.model_dump()
    new_alarm["id"] = len(mock_db_alarms) + 1
    new_alarm["user_id"] = 1 # Hardcoded until Auth is fully linked
    mock_db_alarms.append(new_alarm)
    return new_alarm

@router.get("/", response_model=List[AlarmResponse])
def get_user_alarms():
    """Retrieve all alarms for the logged-in user."""
    return mock_db_alarms


# ── POST /alarms/snooze ─────────────────────────────────────────────
@router.post("/snooze", response_model=SnoozeResponse)
def snooze_alarm(
    body: SnoozeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Increments the user's active_snooze_count in Postgres by 1.
    Enforces the per-alarm snooze limit and daily reset logic.
    """
    # 1. Look up the alarm and verify ownership
    alarm = db.query(Alarm).filter(
        Alarm.id == body.alarm_id,
        Alarm.user_id == current_user.id,
    ).first()

    if alarm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alarm not found or does not belong to this user.",
        )

    # 2. Check that snoozing is enabled for this alarm
    if not alarm.snooze_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Snoozing is disabled for this alarm.",
        )

    # 3. Enforce snooze limit
    if alarm.active_snooze_count >= alarm.snooze_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Snooze limit reached ({alarm.snooze_limit}). Solve the challenge to dismiss.",
        )

    # 4. Delegate to the service layer (handles daily reset + increment)
    updated_alarm = register_snooze(db, alarm)

    return SnoozeResponse(
        active_snooze_count=updated_alarm.active_snooze_count,
        snooze_limit=updated_alarm.snooze_limit,
    )