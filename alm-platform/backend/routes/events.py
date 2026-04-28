from fastapi import APIRouter, HTTPException, Depends
from database import supabase_admin
from models.schemas import EventCreate, EventResponse
from routes.auth import get_current_user, require_role
from middleware.audit_log import log_action
from routes.ai_service import generate_event_checklist
from typing import List

router = APIRouter(prefix="/events", tags=["events"])


@router.post("/", response_model=EventResponse)
async def create_event(
    body: EventCreate,
    current_user=Depends(require_role("vp_events", "admin"))
):
    # Generate AI checklist for this event type
    checklist = await generate_event_checklist(
        event_name=body.name,
        event_type=body.event_type,
        expected_attendees=body.expected_attendees,
        date=str(body.date)
    )

    result = supabase_admin.table("events").insert({
        "name": body.name,
        "event_type": body.event_type,
        "date": str(body.date),
        "venue": body.venue,
        "expected_attendees": body.expected_attendees,
        "description": body.description,
        "checklist": checklist,
        "created_by": current_user["user_id"]
    }).execute()

    event = result.data[0]

    await log_action(
        actor_id=current_user["user_id"],
        action="event_created",
        entity_type="event",
        entity_id=event["id"],
        metadata={"event_name": event["name"]}
    )

    return _format_event(event)


@router.get("/", response_model=List[EventResponse])
async def get_events(current_user=Depends(get_current_user)):
    result = supabase_admin.table("events").select("*").order("date", desc=False).execute()
    return [_format_event(e) for e in result.data]


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, current_user=Depends(get_current_user)):
    result = supabase_admin.table("events").select("*").eq("id", event_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Event not found")
    return _format_event(result.data[0])


@router.delete("/{event_id}")
async def delete_event(event_id: str, current_user=Depends(require_role("vp_events", "admin"))):
    result = supabase_admin.table("events").select("name").eq("id", event_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Event not found")

    supabase_admin.table("events").delete().eq("id", event_id).execute()

    await log_action(
        actor_id=current_user["user_id"],
        action="event_deleted",
        entity_type="event",
        entity_id=event_id,
        metadata={"event_name": result.data[0]["name"]}
    )

    return {"message": "Event deleted"}


def _format_event(e: dict) -> dict:
    return {
        "id": e["id"],
        "name": e["name"],
        "event_type": e["event_type"],
        "date": str(e["date"]),
        "venue": e.get("venue"),
        "expected_attendees": e.get("expected_attendees", 0),
        "description": e.get("description"),
        "checklist": e.get("checklist", []),
        "created_by": e.get("created_by"),
        "created_at": str(e["created_at"])
    }
