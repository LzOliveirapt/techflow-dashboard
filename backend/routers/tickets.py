from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Ticket, TicketPriority, TicketStatus, User, UserRole
from ..schemas import TicketCreate, TicketDetailResponse, TicketResponse, TicketUpdate

router = APIRouter(prefix="/tickets", tags=["tickets"])

# Fields that students are allowed to change on their own tickets.
_STUDENT_EDITABLE_FIELDS = {"title", "description", "equipment", "category"}


@router.post("/", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    data: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new support ticket.
    Students can only create tickets for themselves; technicians/admins can create
    tickets on behalf of any student.
    """
    if current_user.role == UserRole.student and data.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students can only create tickets for themselves",
        )
    ticket = Ticket(**data.model_dump())
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/", response_model=List[TicketResponse])
def list_tickets(
    skip: int = 0,
    limit: int = 100,
    status: Optional[TicketStatus] = None,
    priority: Optional[TicketPriority] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List tickets. Students see only their own tickets; technicians/admins see all.
    Optionally filter by status and/or priority.
    """
    query = db.query(Ticket)
    if current_user.role == UserRole.student:
        query = query.filter(Ticket.student_id == current_user.id)
    if status is not None:
        query = query.filter(Ticket.status == status)
    if priority is not None:
        query = query.filter(Ticket.priority == priority)
    return query.order_by(Ticket.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{ticket_id}", response_model=TicketDetailResponse)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a ticket with its student, technician and messages."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    if current_user.role == UserRole.student and ticket.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    return ticket


@router.put("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: int,
    data: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update a ticket.
    - Students can only update their own tickets and may only change:
      title, description, equipment, category.
    - Technicians/admins can update any field including status, priority,
      and technician assignment.
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    if current_user.role == UserRole.student and ticket.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    update_data = data.model_dump(exclude_unset=True)
    if current_user.role == UserRole.student:
        forbidden = set(update_data) - _STUDENT_EDITABLE_FIELDS
        if forbidden:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Students cannot change: {', '.join(sorted(forbidden))}",
            )
    for field, value in update_data.items():
        setattr(ticket, field, value)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a ticket. Technician or admin only."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    if current_user.role not in (UserRole.technician, UserRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    db.delete(ticket)
    db.commit()
