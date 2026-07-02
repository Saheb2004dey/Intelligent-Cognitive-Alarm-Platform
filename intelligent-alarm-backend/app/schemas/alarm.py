from pydantic import BaseModel, Field
from typing import Optional
from datetime import time as datetime_time

class AlarmBase(BaseModel):
    time: datetime_time = Field(..., description="Time of the alarm")
    label: Optional[str] = Field(default="Wake Up", max_length=50)
    is_active: bool = True
    difficulty_preference: str = Field(default="Medium")

class AlarmCreate(AlarmBase):
    pass

class AlarmResponse(AlarmBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True