from fastapi import APIRouter, HTTPException, Depends
from database import supabase_admin
from routes.auth import get_current_user, require_role
from middleware.audit_log import log_action
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter(prefix="/tasks", tags=["tasks"])

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_roles: List[str]  # multiple roles
    due_date: Optional[str] = None
    event_id: Optional[str] = None
    checklist: List[dict] = []

class TaskUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    checklist: Optional[List[dict]] = None
    uploads: Optional[List[dict]] = None  # [{name, size, uploadedAt, uploadedBy}]

@router.post("/")
async def create_task(body: TaskCreate, current_user=Depends(require_role("president"))):
    result = supabase_admin.table("tasks").insert({
        "title": body.title,
        "description": body.description,
        "assigned_role": body.assigned_roles[0] if body.assigned_roles else "vp_events",
        "assigned_roles": body.assigned_roles,
        "created_by": current_user["user_id"],
        "due_date": body.due_date,
        "event_id": body.event_id,
        "checklist": body.checklist,
        "uploads": [],
        "status": "todo"
    }).execute()

    await log_action(
        actor_id=current_user["user_id"],
        action="task_created",
        entity_type="task",
        entity_id=result.data[0]["id"],
        metadata={"title": body.title, "assigned_roles": body.assigned_roles}
    )
    return result.data[0]


@router.get("/")
async def get_tasks(current_user=Depends(get_current_user)):
    role = current_user["role"]
    result = supabase_admin.table("tasks").select("*").order("created_at", desc=True).execute()

    # Filter: president sees all, others see tasks where their role is in assigned_roles
    filtered = []
    for task in result.data:
        assigned = task.get("assigned_roles") or [task.get("assigned_role")]
        if role == "president" or role in assigned:
            filtered.append(task)

    # Enrich with event name
    enriched = []
    for task in filtered:
        event_name = None
        if task.get("event_id"):
            ev = supabase_admin.table("events").select("name").eq("id", task["event_id"]).execute()
            if ev.data:
                event_name = ev.data[0]["name"]
        enriched.append({**task, "event_name": event_name})

    return enriched


@router.patch("/{task_id}")
async def update_task(task_id: str, body: TaskUpdate, current_user=Depends(get_current_user)):
    task = supabase_admin.table("tasks").select("*").eq("id", task_id).execute()
    if not task.data:
        raise HTTPException(status_code=404, detail="Task not found")

    t = task.data[0]
    role = current_user["role"]
    assigned = t.get("assigned_roles") or [t.get("assigned_role")]

    if role != "president" and role not in assigned:
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = {"updated_at": datetime.utcnow().isoformat()}
    if body.status is not None: update_data["status"] = body.status
    if body.notes is not None: update_data["notes"] = body.notes
    if body.checklist is not None: update_data["checklist"] = body.checklist
    if body.uploads is not None: update_data["uploads"] = body.uploads

    result = supabase_admin.table("tasks").update(update_data).eq("id", task_id).execute()

    await log_action(
        actor_id=current_user["user_id"],
        action="task_updated",
        entity_type="task",
        entity_id=task_id,
        metadata={"status": body.status}
    )
    return result.data[0]


@router.delete("/{task_id}")
async def delete_task(task_id: str, current_user=Depends(require_role("president"))):
    supabase_admin.table("tasks").delete().eq("id", task_id).execute()
    return {"message": "Task deleted"}