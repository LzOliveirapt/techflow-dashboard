from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from .models import TicketPriority, TicketStatus, UserRole


# ---------------------------------------------------------------------------
# User schemas
# ---------------------------------------------------------------------------


class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = UserRole.student
    turma: Optional[str] = None
    enrollment_number: Optional[str] = None


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    turma: Optional[str] = None
    enrollment_number: Optional[str] = None
    password: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Ticket schemas
# ---------------------------------------------------------------------------


class TicketBase(BaseModel):
    title: Optional[str] = None
    description: str
    status: TicketStatus = TicketStatus.open
    priority: TicketPriority = TicketPriority.medium
    equipment: str
    category: str


class TicketCreate(TicketBase):
    student_id: int


class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    equipment: Optional[str] = None
    category: Optional[str] = None
    technician_id: Optional[int] = None


class TicketResponse(TicketBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    technician_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class TicketDetailResponse(TicketResponse):
    student: UserResponse
    technician: Optional[UserResponse] = None
    messages: list["MessageResponse"] = []


# ---------------------------------------------------------------------------
# Message schemas
# ---------------------------------------------------------------------------


class MessageBase(BaseModel):
    text: str


class MessageCreate(MessageBase):
    ticket_id: int
    sender_id: int


class MessageUpdate(BaseModel):
    text: str


class MessageResponse(MessageBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: int
    sender_id: int
    created_at: datetime
    updated_at: datetime


class MessageDetailResponse(MessageResponse):
    sender: UserResponse


# Resolve forward references
TicketDetailResponse.model_rebuild()
