from fastapi import APIRouter, HTTPException, Depends
from database import supabase_admin
from routes.auth import get_current_user, require_role
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter(prefix="/education", tags=["education"])

DEFAULT_REQUIREMENTS = [
    {"id": 1, "task": "Attend new member orientation", "done": False},
    {"id": 2, "task": "Complete ALM history quiz", "done": False},
    {"id": 3, "task": "Attend 3 brotherhood events", "done": False},
    {"id": 4, "task": "Attend 2 service events", "done": False},
    {"id": 5, "task": "Complete big brother assignment", "done": False},
    {"id": 6, "task": "Attend halaqah sessions (min 3)", "done": False},
    {"id": 7, "task": "Learn ALM values & principles", "done": False},
    {"id": 8, "task": "Complete pledge project", "done": False},
    {"id": 9, "task": "Attend chapter meetings (min 4)", "done": False},
    {"id": 10, "task": "Final initiation interview", "done": False},
]

class PledgeCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    semester: str = "Spring 2026"
    notes: Optional[str] = None

class PledgeUpdate(BaseModel):
    status: Optional[str] = None
    requirements: Optional[List[dict]] = None
    notes: Optional[str] = None

class ModuleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    semester: str = "Spring 2026"
    module_type: str = "general"
    attendee_count: int = 0
    notes: Optional[str] = None

class ModuleUpdate(BaseModel):
    completed: Optional[bool] = None
    completed_date: Optional[str] = None
    attendee_count: Optional[int] = None
    notes: Optional[str] = None


@router.get("/pledges/{semester}")
async def get_pledges(semester: str, current_user=Depends(get_current_user)):
    result = supabase_admin.table("pledges").select("*").eq("semester", semester).order("full_name").execute()
    return result.data


@router.post("/pledges")
async def create_pledge(body: PledgeCreate, current_user=Depends(require_role("vp_education", "president"))):
    result = supabase_admin.table("pledges").insert({
        "full_name": body.full_name,
        "email": body.email,
        "phone": body.phone,
        "semester": body.semester,
        "status": "in_progress",
        "requirements": DEFAULT_REQUIREMENTS,
        "notes": body.notes
    }).execute()
    return result.data[0]


@router.patch("/pledges/{pledge_id}")
async def update_pledge(pledge_id: str, body: PledgeUpdate, current_user=Depends(require_role("vp_education", "president"))):
    update_data = {"updated_at": datetime.utcnow().isoformat()}
    if body.status is not None: update_data["status"] = body.status
    if body.requirements is not None: update_data["requirements"] = body.requirements
    if body.notes is not None: update_data["notes"] = body.notes
    result = supabase_admin.table("pledges").update(update_data).eq("id", pledge_id).execute()
    return result.data[0]


@router.delete("/pledges/{pledge_id}")
async def delete_pledge(pledge_id: str, current_user=Depends(require_role("vp_education", "president"))):
    supabase_admin.table("pledges").delete().eq("id", pledge_id).execute()
    return {"message": "Deleted"}


@router.get("/modules/{semester}")
async def get_modules(semester: str, current_user=Depends(get_current_user)):
    result = supabase_admin.table("education_modules").select("*").eq("semester", semester).order("created_at").execute()
    return result.data


@router.post("/modules")
async def create_module(body: ModuleCreate, current_user=Depends(require_role("vp_education", "president"))):
    result = supabase_admin.table("education_modules").insert({
        "title": body.title,
        "description": body.description,
        "semester": body.semester,
        "module_type": body.module_type,
        "attendee_count": body.attendee_count,
        "notes": body.notes
    }).execute()
    return result.data[0]


@router.patch("/modules/{module_id}")
async def update_module(module_id: str, body: ModuleUpdate, current_user=Depends(require_role("vp_education", "president"))):
    update_data = {}
    if body.completed is not None: update_data["completed"] = body.completed
    if body.completed_date is not None: update_data["completed_date"] = body.completed_date
    if body.attendee_count is not None: update_data["attendee_count"] = body.attendee_count
    if body.notes is not None: update_data["notes"] = body.notes
    result = supabase_admin.table("education_modules").update(update_data).eq("id", module_id).execute()
    return result.data[0]


@router.delete("/modules/{module_id}")
async def delete_module(module_id: str, current_user=Depends(require_role("vp_education", "president"))):
    supabase_admin.table("education_modules").delete().eq("id", module_id).execute()
    return {"message": "Deleted"}