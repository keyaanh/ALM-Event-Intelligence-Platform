from database import supabase_admin
from typing import Optional


async def log_action(
    actor_id: str,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    metadata: dict = {}
):
    """Write an immutable audit log entry for any significant action."""
    try:
        supabase_admin.table("audit_log").insert({
            "actor_id": actor_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "metadata": metadata
        }).execute()
    except Exception as e:
        # Never let audit logging failures break the main request
        print(f"Audit log error: {e}")
