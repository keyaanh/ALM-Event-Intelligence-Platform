from fastapi import APIRouter, HTTPException, Depends
from database import supabase_admin
from routes.auth import get_current_user, require_role
from middleware.audit_log import log_action
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/attendance", tags=["attendance"])

MANDATORY_TYPES = {'social','fundraiser','professional','service','religious','chapter_meeting','brotherhood'}

class AttendanceRecord(BaseModel):
    member_id: str
    status: str  # present, tardy, excused, absent

class BulkAttendance(BaseModel):
    event_id: str
    records: List[AttendanceRecord]

@router.get("/members")
async def get_members(current_user=Depends(get_current_user)):
    result = supabase_admin.table("members").select("*").eq("is_active", True).order("full_name").execute()
    return result.data

@router.get("/event/{event_id}")
async def get_event_attendance(event_id: str, current_user=Depends(get_current_user)):
    result = supabase_admin.table("attendance").select("*").eq("event_id", event_id).execute()
    return result.data

@router.post("/bulk")
async def save_attendance(
    body: BulkAttendance,
    current_user=Depends(require_role("vp_standards", "president"))
):
    event = supabase_admin.table("events").select("*").eq("id", body.event_id).execute()
    if not event.data:
        raise HTTPException(status_code=404, detail="Event not found")

    ev = event.data[0]

    # Upsert each record
    for rec in body.records:
        supabase_admin.table("attendance").upsert({
            "event_id": body.event_id,
            "member_id": rec.member_id,
            "status": rec.status,
            "marked_by": current_user["user_id"]
        }, on_conflict="event_id,member_id").execute()

    # Update actual_attendance count on event
    present_count = sum(1 for r in body.records if r.status in ('present', 'tardy'))
    supabase_admin.table("events").update({
        "actual_attendance": present_count
    }).eq("id", body.event_id).execute()

    await log_action(
        actor_id=current_user["user_id"],
        action="attendance_recorded",
        entity_type="event",
        entity_id=body.event_id,
        metadata={"event_name": ev.get("name"), "present": present_count, "total": len(body.records)}
    )

    return {"message": "Attendance saved", "present": present_count}


@router.get("/strikes")
async def get_strikes(current_user=Depends(get_current_user)):
    """Calculate strikes for all members based on unexcused absences at mandatory events."""
    members = supabase_admin.table("members").select("*").eq("is_active", True).order("full_name").execute()
    
    # Get all mandatory events
    mandatory_events = supabase_admin.table("events").select("id,name,event_type,date").execute()
    mandatory = [e for e in mandatory_events.data if e.get("event_type") in MANDATORY_TYPES]
    mandatory_ids = [e["id"] for e in mandatory]

    # Get all attendance records for mandatory events
    all_att = supabase_admin.table("attendance").select("*").in_("event_id", mandatory_ids).execute() if mandatory_ids else type('obj', (object,), {'data': []})()

    att_map = {}  # member_id -> {event_id -> status}
    for a in all_att.data:
        if a["member_id"] not in att_map:
            att_map[a["member_id"]] = {}
        att_map[a["member_id"]][a["event_id"]] = a["status"]

    # Total attendance stats for chapter rate
    total_possible = len(members.data) * len(mandatory)
    total_present = sum(
        1 for a in all_att.data if a["status"] in ("present", "tardy")
    )

    results = []
    for member in members.data:
        mid = member["id"]
        member_att = att_map.get(mid, {})
        
        tardies = sum(1 for eid in mandatory_ids if member_att.get(eid) == "tardy")
        unexcused = sum(1 for eid in mandatory_ids if member_att.get(eid) == "absent")
        excused = sum(1 for eid in mandatory_ids if member_att.get(eid) == "excused")
        present = sum(1 for eid in mandatory_ids if member_att.get(eid) == "present")
        
        # 2 tardies = 1 strike, each unexcused absence = 1 strike
        strikes = (tardies // 2) + unexcused
        retreat_ineligible = strikes >= 3

        results.append({
            "member_id": mid,
            "full_name": member["full_name"],
            "present": present,
            "tardy": tardies,
            "excused": excused,
            "unexcused": unexcused,
            "strikes": strikes,
            "retreat_ineligible": retreat_ineligible,
            "events_attended": present + tardies,
            "total_mandatory": len(mandatory)
        })

    chapter_rate = round((total_present / total_possible * 100), 1) if total_possible > 0 else 0

    return {
        "members": results,
        "chapter_attendance_rate": chapter_rate,
        "total_mandatory_events": len(mandatory),
        "total_members": len(members.data)
    }