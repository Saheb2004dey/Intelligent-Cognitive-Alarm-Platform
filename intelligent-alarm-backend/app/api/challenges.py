"""
Challenge endpoints — connects the frontend to the math-challenge generator
and Pavani's databases (Postgres for snooze state, MongoDB for challenge logs).
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.alarm import Alarm
from app.models.user import User
from app.api.auth import get_current_user
from app.core.challenge_generator import generate_math_problem
from app.core.adaptive_ml import predict_difficulty
from app.schemas.challenge import (
    ChallengeNextResponse,
    ChallengeVerifyRequest,
    ChallengeVerifyResponse,
)
from app.schemas.challenge_log import ChallengeLog
from app.services.challenge_log_service import log_challenge_attempt

router = APIRouter(prefix="/challenges", tags=["Challenges"])

# ── In-memory store for pending answers ──────────────────────────────
# Keyed by (user_id, alarm_id) → correct answer (int).
# Replaced every time the same user requests a new challenge for an alarm.
_pending_answers: dict[tuple[UUID, UUID], int] = {}


# ── GET /challenges/next ─────────────────────────────────────────────
@router.get("/next", response_model=ChallengeNextResponse)
def get_next_challenge(
    alarm_id: UUID = Query(..., description="The alarm that triggered this challenge"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Reads the user's active_snooze_count from Postgres, feeds it into the
    adaptive-difficulty predictor, generates a math problem, and returns
    only the problem string (the answer stays on the server).
    """
    # 1. Look up the alarm and verify ownership
    alarm = db.query(Alarm).filter(
        Alarm.id == alarm_id,
        Alarm.user_id == current_user.id,
    ).first()

    if alarm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alarm not found or does not belong to this user.",
        )

    # 2. Predict difficulty from snooze count (ML model or fallback)
    difficulty = predict_difficulty(
        habit_score=0.0,           # placeholder until habit scoring is wired
        snooze_count=alarm.active_snooze_count,
    )

    # 3. Generate the math problem
    challenge = generate_math_problem(difficulty)

    # 4. Stash the correct answer server-side
    _pending_answers[(current_user.id, alarm_id)] = challenge["answer"]

    # 5. Return problem only — no answer sent to the client
    return ChallengeNextResponse(
        problem=challenge["problem"],
        difficulty=difficulty,
    )


# ── POST /challenges/verify ─────────────────────────────────────────
@router.post("/verify", response_model=ChallengeVerifyResponse)
async def verify_challenge(
    body: ChallengeVerifyRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Receives the user's answer, validates it against the server-stored
    correct answer, and — on success — writes a log to PK's MongoDB.
    """
    key = (current_user.id, body.alarm_id)
    correct_answer = _pending_answers.get(key)

    if correct_answer is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending challenge found. Request a new one via GET /challenges/next.",
        )

    success = body.answer == correct_answer

    if success:
        # Clean up the pending entry
        _pending_answers.pop(key, None)

        # Log the successful attempt to MongoDB
        log_entry = ChallengeLog(
            user_id=str(current_user.id),
            challenge_type="math",
            difficulty_level=str(correct_answer),   # difficulty stored at generation
            time_to_solve_seconds=0.0,              # frontend can extend this later
            failed_attempts=0,
        )
        try:
            await log_challenge_attempt(log_entry)
        except Exception as e:
            # Catch MongoDB connection errors so the request still succeeds
            print(f"Warning: Failed to log challenge attempt to MongoDB: {e}")

    return ChallengeVerifyResponse(success=success)
