from fastapi import APIRouter, HTTPException, status
from app.schemas.alarm import AlarmCreate, AlarmResponse
from typing import List
from datetime import time

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