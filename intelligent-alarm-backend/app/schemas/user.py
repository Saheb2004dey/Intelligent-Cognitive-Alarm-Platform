from pydantic import BaseModel, field_validator, model_validator
from typing import Optional
from uuid import UUID
from datetime import time

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    timezone: Optional[str] = None
    difficulty_preference: Optional[str] = None
    productivity_goal: Optional[str] = None
    preferred_challenges: Optional[str] = None # NEW
    bedtime: Optional[str] = None
    wake_time: Optional[str] = None

    @field_validator('bedtime', 'wake_time')
    @classmethod
    def validate_time_string(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return v
        try:
            time.fromisoformat(v)
            return v
        except ValueError:
            try:
                from datetime import datetime
                datetime.strptime(v, "%H:%M")
                return v
            except ValueError:
                raise ValueError("Must be a valid time string in HH:MM[:SS] format")

class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    timezone: str
    difficulty_preference: Optional[str] = None
    productivity_goal: Optional[str] = None
    preferred_challenges: Optional[str] = None # NEW
    role: str # Added so frontend router can clearly see it
    bedtime: Optional[str] = None
    wake_time: Optional[str] = None
    coach_id: Optional[UUID] = None

    @model_validator(mode='before')
    @classmethod
    def map_target_times(cls, data):
        if not isinstance(data, dict):
            res = {}
            for field in cls.model_fields.keys():
                if field in ("bedtime", "wake_time"):
                    continue
                res[field] = getattr(data, field, None)
            
            # Map target_bedtime to bedtime
            target_bedtime = getattr(data, "target_bedtime", None)
            if target_bedtime is not None:
                res["bedtime"] = target_bedtime.strftime("%H:%M:%S") if hasattr(target_bedtime, "strftime") else str(target_bedtime)
            else:
                res["bedtime"] = None

            target_wake_time = getattr(data, "target_wake_time", None)
            if target_wake_time is not None:
                res["wake_time"] = target_wake_time.strftime("%H:%M:%S") if hasattr(target_wake_time, "strftime") else str(target_wake_time)
            else:
                res["wake_time"] = None
                
            return res
        return data

    class Config:
        from_attributes = True