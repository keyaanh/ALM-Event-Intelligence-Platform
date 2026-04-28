from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Regular client (respects RLS)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Service client (bypasses RLS — use only in trusted backend ops)
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
