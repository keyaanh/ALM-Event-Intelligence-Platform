from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from routes import auth, events, budget, ai_service, attendance, tasks

app = FastAPI(
    title="ALM Event Platform API",
    description="Backend for ALM student organization Shura management",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173"), "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(budget.router)
app.include_router(ai_service.router)
app.include_router(attendance.router)
app.include_router(tasks.router)

@app.get("/")
async def root():
    return {"status": "ALM Platform API running", "version": "2.0.0"}

@app.get("/health")
async def health():
    return {"status": "ok"}