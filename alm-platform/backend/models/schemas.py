from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import date, datetime
from enum import Enum


class UserRole(str, Enum):
    president = "president"
    vp_events = "vp_events"
    vp_finance = "vp_finance"
    vp_outreach = "vp_outreach"
    vp_standards = "vp_standards"
    member = "member"


class EventType(str, Enum):
    social = "social"
    fundraiser = "fundraiser"
    professional = "professional"
    community = "community"
    service = "service"
    brotherhood = "brotherhood"
    retreat = "retreat"
    banquet = "banquet"


class RequestStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    needs_revision = "needs_revision"


class BudgetIncomeSource(str, Enum):
    dues = "dues"
    fundraiser = "fundraiser"
    donation = "donation"
    national = "national"
    campus = "campus"
    other = "other"


# ─── Auth ─────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    full_name: str


# ─── Events ───────────────────────────────────────────────
class EventCreate(BaseModel):
    name: str
    event_type: EventType
    date: date
    venue: Optional[str] = None
    expected_attendees: int = 0
    description: Optional[str] = None


class EventResponse(BaseModel):
    id: str
    name: str
    event_type: str
    date: str
    venue: Optional[str]
    expected_attendees: int
    description: Optional[str]
    checklist: List[Any]
    created_by: Optional[str]
    created_at: str


# ─── Budget ───────────────────────────────────────────────
class LineItem(BaseModel):
    description: str
    amount: float


class BudgetRequestCreate(BaseModel):
    event_id: str
    amount: float
    purpose: str
    itemized_breakdown: List[LineItem] = []


class BudgetReview(BaseModel):
    status: RequestStatus
    reviewer_notes: Optional[str] = None


class BudgetRequestResponse(BaseModel):
    id: str
    event_id: Optional[str]
    event_name: Optional[str]
    requested_by: Optional[str]
    requester_name: Optional[str]
    amount: float
    purpose: str
    itemized_breakdown: List[Any]
    status: str
    reviewer_notes: Optional[str]
    ai_flag: Optional[str]
    created_at: str
    reviewed_at: Optional[str]


class OrgBudgetResponse(BaseModel):
    id: str
    semester: str
    total_budget: float
    spent: float
    remaining: float
    updated_at: str


# ─── Budget Income ────────────────────────────────────────
class BudgetIncomeCreate(BaseModel):
    amount: float
    source: BudgetIncomeSource
    description: str
    received_date: Optional[str] = None


class BudgetIncomeResponse(BaseModel):
    id: str
    amount: float
    source: str
    description: str
    received_date: Optional[str]
    added_by: Optional[str]
    adder_name: Optional[str]
    created_at: str