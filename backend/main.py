import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import auth, messages, tickets, users

# Create database tables on startup if they don't exist yet.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TechFlow API",
    description=(
        "Backend REST API for the TechFlow support ticket system.\n\n"
        "**Authentication:** use `POST /auth/login` with your email and password "
        "to receive a Bearer token, then click *Authorize* above."
    ),
    version="1.0.0",
)

# Restrict allowed origins via the ALLOWED_ORIGINS environment variable
# (comma-separated list, e.g. "https://app.example.com,https://admin.example.com").
# Defaults to "*" for local development only — always set this in production.
_origins_env = os.environ.get("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in _origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tickets.router)
app.include_router(messages.router)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "message": "TechFlow API is running"}
