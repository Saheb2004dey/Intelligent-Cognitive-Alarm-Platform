from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import time

from app.database import get_db
from app.models.user import User, UserRole
from app.api.auth import get_current_user
from app.schemas.user import UserResponse, UserProfileUpdate

router = APIRouter()

# ── Security Dependency ──────────────────────────────────────────────
def require_coach(current_user: User = Depends(get_current_user)):
    """Blocks anyone who does not have the WELLNESS_COACH role in the database."""
    if current_user.role != UserRole.WELLNESS_COACH and current_user.role.name != "WELLNESS_COACH" and current_user.role != "wellness_coach":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Wellness Coach privileges required."
        )
    return current_user


# ── PUT /users/profile ─────────────────────────────────────────────
@router.put("/users/profile", response_model=UserResponse)
def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update profile settings (including bedtime and wake_time)."""
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name
    if profile_data.timezone is not None:
        current_user.timezone = profile_data.timezone
    if profile_data.difficulty_preference is not None:
        current_user.difficulty_preference = profile_data.difficulty_preference
    if profile_data.productivity_goal is not None:
        current_user.productivity_goal = profile_data.productivity_goal
    if profile_data.preferred_challenges is not None:
        current_user.preferred_challenges = profile_data.preferred_challenges
        
    if profile_data.bedtime is not None:
        if profile_data.bedtime == "":
            current_user.target_bedtime = None
        else:
            try:
                current_user.target_bedtime = time.fromisoformat(profile_data.bedtime)
            except ValueError:
                from datetime import datetime
                current_user.target_bedtime = datetime.strptime(profile_data.bedtime, "%H:%M").time()

    if profile_data.wake_time is not None:
        if profile_data.wake_time == "":
            current_user.target_wake_time = None
        else:
            try:
                current_user.target_wake_time = time.fromisoformat(profile_data.wake_time)
            except ValueError:
                from datetime import datetime
                current_user.target_wake_time = datetime.strptime(profile_data.wake_time, "%H:%M").time()

    db.commit()
    db.refresh(current_user)
    return current_user


# ── GET /coach/users ───────────────────────────────────────────────
@router.get("/coach/users", response_model=List[UserResponse])
def get_coach_users(
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db)
):
    """Return the list of users assigned to the logged-in coach."""
    return db.query(User).filter(User.coach_id == current_user.id).all()
