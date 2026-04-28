from fastapi import APIRouter, HTTPException, Depends
from database import supabase_admin
from models.schemas import BudgetRequestCreate, BudgetReview, BudgetRequestResponse, OrgBudgetResponse, BudgetIncomeCreate
from routes.auth import get_current_user, require_role
from middleware.audit_log import log_action
from routes.ai_service import flag_budget_anomaly
from typing import List
from datetime import datetime

router = APIRouter(prefix="/budget", tags=["budget"])


@router.get("/org", response_model=OrgBudgetResponse)
async def get_org_budget(current_user=Depends(get_current_user)):
    result = supabase_admin.table("org_budget").select("*").order("updated_at", desc=True).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="No budget found")
    b = result.data[0]
    return {**b, "remaining": float(b["total_budget"]) - float(b["spent"])}


@router.post("/requests", response_model=BudgetRequestResponse)
async def create_budget_request(
    body: BudgetRequestCreate,
    current_user=Depends(require_role("vp_events", "president"))
):
    past = supabase_admin.table("budget_requests").select("amount,purpose").eq("status", "approved").execute()
    past_amounts = [float(r["amount"]) for r in past.data] if past.data else []

    ai_flag = await flag_budget_anomaly(
        amount=body.amount,
        purpose=body.purpose,
        past_amounts=past_amounts
    )

    result = supabase_admin.table("budget_requests").insert({
        "event_id": body.event_id,
        "requested_by": current_user["user_id"],
        "amount": body.amount,
        "purpose": body.purpose,
        "itemized_breakdown": [item.dict() for item in body.itemized_breakdown],
        "status": "pending",
        "ai_flag": ai_flag
    }).execute()

    req = result.data[0]
    await log_action(
        actor_id=current_user["user_id"],
        action="budget_request_submitted",
        entity_type="budget_request",
        entity_id=req["id"],
        metadata={"amount": body.amount, "purpose": body.purpose}
    )
    return await _enrich_request(req)


@router.get("/requests", response_model=List[BudgetRequestResponse])
async def get_budget_requests(current_user=Depends(get_current_user)):
    query = supabase_admin.table("budget_requests").select("*").order("created_at", desc=True)
    if current_user["role"] == "vp_events":
        query = query.eq("requested_by", current_user["user_id"])
    result = query.execute()
    return [await _enrich_request(r) for r in result.data]


@router.patch("/requests/{request_id}/review", response_model=BudgetRequestResponse)
async def review_budget_request(
    request_id: str,
    body: BudgetReview,
    current_user=Depends(require_role("vp_finance", "president"))
):
    existing = supabase_admin.table("budget_requests").select("*").eq("id", request_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Request not found")

    req = existing.data[0]
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already reviewed")

    update_data = {
        "status": body.status,
        "reviewer_notes": body.reviewer_notes,
        "reviewed_by": current_user["user_id"],
        "reviewed_at": datetime.utcnow().isoformat()
    }

    result = supabase_admin.table("budget_requests").update(update_data).eq("id", request_id).execute()
    updated = result.data[0]

    if body.status == "approved":
        budget = supabase_admin.table("org_budget").select("*").order("updated_at", desc=True).limit(1).execute()
        if budget.data:
            b = budget.data[0]
            supabase_admin.table("org_budget").update({
                "spent": float(b["spent"]) + float(req["amount"]),
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", b["id"]).execute()

    await log_action(
        actor_id=current_user["user_id"],
        action=f"budget_request_{body.status}",
        entity_type="budget_request",
        entity_id=request_id,
        metadata={"amount": req["amount"], "notes": body.reviewer_notes}
    )
    return await _enrich_request(updated)


# ─── Income routes ────────────────────────────────────────

@router.get("/income")
async def get_income(current_user=Depends(get_current_user)):
    result = supabase_admin.table("budget_income").select("*").order("created_at", desc=True).execute()
    enriched = []
    for inc in result.data:
        adder_name = None
        if inc.get("added_by"):
            u = supabase_admin.table("users").select("full_name").eq("id", inc["added_by"]).execute()
            if u.data:
                adder_name = u.data[0]["full_name"]
        enriched.append({
            "id": inc["id"],
            "amount": float(inc["amount"]),
            "source": inc["source"],
            "description": inc["description"],
            "received_date": str(inc.get("received_date") or ""),
            "added_by": inc.get("added_by"),
            "adder_name": adder_name,
            "created_at": str(inc["created_at"])
        })
    return enriched


@router.post("/income")
async def add_income(
    body: BudgetIncomeCreate,
    current_user=Depends(require_role("vp_finance", "president"))
):
    result = supabase_admin.table("budget_income").insert({
        "amount": body.amount,
        "source": body.source,
        "description": body.description,
        "received_date": body.received_date,
        "added_by": current_user["user_id"]
    }).execute()

    # Increase org_budget total
    budget = supabase_admin.table("org_budget").select("*").order("updated_at", desc=True).limit(1).execute()
    if budget.data:
        b = budget.data[0]
        supabase_admin.table("org_budget").update({
            "total_budget": float(b["total_budget"]) + body.amount,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", b["id"]).execute()

    await log_action(
        actor_id=current_user["user_id"],
        action="budget_income_added",
        entity_type="budget_income",
        entity_id=result.data[0]["id"],
        metadata={"amount": body.amount, "source": body.source, "description": body.description}
    )
    return result.data[0]


@router.get("/audit-log")
async def get_audit_log(current_user=Depends(require_role("vp_finance", "president"))):
    result = supabase_admin.table("audit_log").select("*").order("created_at", desc=True).limit(100).execute()
    return result.data


async def _enrich_request(req: dict) -> dict:
    event_name = None
    requester_name = None
    if req.get("event_id"):
        ev = supabase_admin.table("events").select("name").eq("id", req["event_id"]).execute()
        if ev.data:
            event_name = ev.data[0]["name"]
    if req.get("requested_by"):
        u = supabase_admin.table("users").select("full_name").eq("id", req["requested_by"]).execute()
        if u.data:
            requester_name = u.data[0]["full_name"]
    return {
        "id": req["id"],
        "event_id": req.get("event_id"),
        "event_name": event_name,
        "requested_by": req.get("requested_by"),
        "requester_name": requester_name,
        "amount": float(req["amount"]),
        "purpose": req["purpose"],
        "itemized_breakdown": req.get("itemized_breakdown", []),
        "status": req["status"],
        "reviewer_notes": req.get("reviewer_notes"),
        "ai_flag": req.get("ai_flag"),
        "created_at": str(req["created_at"]),
        "reviewed_at": str(req["reviewed_at"]) if req.get("reviewed_at") else None
    }