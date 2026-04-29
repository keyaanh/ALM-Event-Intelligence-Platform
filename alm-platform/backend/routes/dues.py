from fastapi import APIRouter, HTTPException, Depends
from database import supabase_admin
from routes.auth import get_current_user, require_role
from middleware.audit_log import log_action
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter(prefix="/dues", tags=["dues"])


class DuesUpdate(BaseModel):
    member_id: str
    semester: str
    category: str
    amount_owed: float
    amount_paid: float
    status: str
    notes: Optional[str] = None


class BulkDuesUpdate(BaseModel):
    records: List[DuesUpdate]
    semester: str


class ProjectionUpdate(BaseModel):
    semester: str
    active_members: int
    active_dues: float
    pledge_count: int
    pledge_dues: float
    hiatus_count: int
    hiatus_dues: float
    collection_rate: float
    carryover: float
    imam_funding: float
    fundraiser_count: int
    fundraiser_profit: float
    alumni_retreat_count: int
    alumni_retreat_fee: float
    other_income: float = 0
    other_income_notes: Optional[str] = None


@router.get("/members/{semester}")
async def get_dues(semester: str, current_user=Depends(get_current_user)):
    members = supabase_admin.table("members").select("*").eq("is_active", True).order("full_name").execute()
    dues = supabase_admin.table("member_dues").select("*").eq("semester", semester).execute()
    dues_map = {d["member_id"]: d for d in dues.data}

    result = []
    for m in members.data:
        due = dues_map.get(m["id"], {})
        result.append({
            "member_id": m["id"],
            "full_name": m["full_name"],
            "semester": semester,
            "category": due.get("category", "active"),
            "amount_owed": float(due.get("amount_owed", 180)),
            "amount_paid": float(due.get("amount_paid", 0)),
            "status": due.get("status", "unpaid"),
            "notes": due.get("notes"),
            "dues_id": due.get("id")
        })
    return result


@router.post("/bulk")
async def update_dues(body: BulkDuesUpdate, current_user=Depends(require_role("vp_finance", "president"))):
    for rec in body.records:
        existing = supabase_admin.table("member_dues").select("id").eq("member_id", rec.member_id).eq("semester", rec.semester).execute()
        data = {
            "member_id": rec.member_id,
            "semester": rec.semester,
            "category": rec.category,
            "amount_owed": rec.amount_owed,
            "amount_paid": rec.amount_paid,
            "status": rec.status,
            "notes": rec.notes,
            "updated_by": current_user["user_id"],
            "updated_at": datetime.utcnow().isoformat()
        }
        if existing.data:
            supabase_admin.table("member_dues").update(data).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase_admin.table("member_dues").insert(data).execute()

    await log_action(
        actor_id=current_user["user_id"],
        action="dues_updated",
        entity_type="member_dues",
        entity_id=None,
        metadata={"semester": body.semester, "count": len(body.records)}
    )
    return {"message": "Dues updated"}


@router.get("/projection/{semester}")
async def get_projection(semester: str, current_user=Depends(get_current_user)):
    result = supabase_admin.table("budget_projections").select("*").eq("semester", semester).execute()
    if not result.data:
        return None
    return result.data[0]


@router.post("/projection")
async def save_projection(body: ProjectionUpdate, current_user=Depends(require_role("vp_finance", "president"))):
    existing = supabase_admin.table("budget_projections").select("id").eq("semester", body.semester).execute()
    data = {**body.dict(), "updated_at": datetime.utcnow().isoformat()}
    if existing.data:
        supabase_admin.table("budget_projections").update(data).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase_admin.table("budget_projections").insert(data).execute()
    return {"message": "Projection saved"}


@router.get("/categories/{semester}")
async def get_categories(semester: str, current_user=Depends(get_current_user)):
    cats = supabase_admin.table("expense_categories").select("*").eq("semester", semester).execute()
    # Get actual spent per category from approved budget requests
    requests = supabase_admin.table("budget_requests").select("amount,category").eq("status", "approved").execute()
    spent_map = {}
    for r in requests.data:
        cat = r.get("category", "Events")
        spent_map[cat] = spent_map.get(cat, 0) + float(r["amount"])

    return [{
        **c,
        "spent": spent_map.get(c["name"], 0),
        "remaining": float(c["budgeted_amount"]) - spent_map.get(c["name"], 0)
    } for c in cats.data]


@router.post("/categories")
async def save_category(name: str, semester: str, budgeted_amount: float, current_user=Depends(require_role("vp_finance", "president"))):
    existing = supabase_admin.table("expense_categories").select("id").eq("name", name).eq("semester", semester).execute()
    if existing.data:
        result = supabase_admin.table("expense_categories").update({
            "budgeted_amount": budgeted_amount
        }).eq("id", existing.data[0]["id"]).execute()
    else:
        result = supabase_admin.table("expense_categories").insert({
            "name": name, "semester": semester, "budgeted_amount": budgeted_amount
        }).execute()
    return result.data[0]