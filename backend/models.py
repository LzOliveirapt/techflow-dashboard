import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from .database import Base


class UserRole(str, enum.Enum):
    student = "student"
    technician = "technician"
    admin = "admin"


class TicketStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


class TicketPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.student)
    # Student-specific fields
    turma = Column(String(100), nullable=True)
    enrollment_number = Column(String(100), unique=True, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    tickets_as_student = relationship(
        "Ticket",
        foreign_keys="Ticket.student_id",
        back_populates="student",
    )
    tickets_as_technician = relationship(
        "Ticket",
        foreign_keys="Ticket.technician_id",
        back_populates="technician",
    )
    messages = relationship("Message", back_populates="sender")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=False)
    status = Column(
        Enum(TicketStatus), nullable=False, default=TicketStatus.open
    )
    priority = Column(
        Enum(TicketPriority), nullable=False, default=TicketPriority.medium
    )
    equipment = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    technician_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    student = relationship(
        "User", foreign_keys=[student_id], back_populates="tickets_as_student"
    )
    technician = relationship(
        "User",
        foreign_keys=[technician_id],
        back_populates="tickets_as_technician",
    )
    messages = relationship(
        "Message", back_populates="ticket", cascade="all, delete-orphan"
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(
        Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False
    )
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    ticket = relationship("Ticket", back_populates="messages")
    sender = relationship("User", back_populates="messages")
