from fastapi import APIRouter
import anthropic
import json
import os
from typing import List, Optional

router = APIRouter(prefix="/ai", tags=["ai"])
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


async def generate_event_checklist(
    event_name: str,
    event_type: str,
    expected_attendees: int,
    date: str
) -> List[dict]:
    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": f"""Generate a detailed planning checklist for this event. 
Return ONLY a JSON array with no extra text. Each item should have: 
"task" (string), "category" (one of: logistics, marketing, finance, volunteers, setup), "due_offset_days" (int, days before event).

Event: {event_name}
Type: {event_type}
Expected attendees: {expected_attendees}
Date: {date}

Return only the JSON array."""
            }]
        )

        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())

    except Exception as e:
        print(f"AI checklist error: {e}")
        return [
            {"task": "Book venue", "category": "logistics", "due_offset_days": 30},
            {"task": "Create event flyer", "category": "marketing", "due_offset_days": 21},
            {"task": "Submit budget request", "category": "finance", "due_offset_days": 21},
            {"task": "Recruit volunteers", "category": "volunteers", "due_offset_days": 14},
            {"task": "Send invitations", "category": "marketing", "due_offset_days": 14},
            {"task": "Confirm headcount", "category": "logistics", "due_offset_days": 7},
            {"task": "Day-of setup walkthrough", "category": "setup", "due_offset_days": 1},
        ]


async def flag_budget_anomaly(
    amount: float,
    purpose: str,
    past_amounts: List[float]
) -> Optional[str]:
    if not past_amounts:
        return None

    avg = sum(past_amounts) / len(past_amounts)
    max_past = max(past_amounts)

    if amount <= max_past * 1.5:
        return None

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=150,
            messages=[{
                "role": "user",
                "content": f"""A student organization budget request needs review.

Request amount: ${amount:.2f}
Purpose: {purpose}
Average past approved request: ${avg:.2f}
Highest past approved request: ${max_past:.2f}

Write a single short sentence (max 20 words) flagging why the finance officer should take a closer look. 
Be factual, not alarmist. Return only the sentence."""
            }]
        )
        return message.content[0].text.strip()

    except Exception:
        return f"This request (${amount:.2f}) is significantly above the historical average (${avg:.2f})."


async def generate_event_recap(
    event_name: str,
    event_type: str,
    attendees: int,
    notes: str
) -> str:
    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=600,
            messages=[{
                "role": "user",
                "content": f"""Write a professional post-event recap for a student organization. 
Keep it to 3 short paragraphs: summary, highlights, and lessons learned.

Event: {event_name}
Type: {event_type}
Attendees: {attendees}
Notes from organizer: {notes}"""
            }]
        )
        return message.content[0].text.strip()

    except Exception:
        return f"Post-event recap for {event_name} could not be generated. Please write manually."


@router.post("/recap")
async def create_recap(event_name: str, event_type: str, attendees: int, notes: str):
    recap = await generate_event_recap(event_name, event_type, attendees, notes)
    return {"recap": recap}