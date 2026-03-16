from contextlib import asynccontextmanager

from config import STORAGE_PATH
from database import Base, engine
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from models import *
from routes import cameras, groups, inspections, segments, standards, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Photo Standards DB",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(groups.router)
app.include_router(standards.router)
app.include_router(segments.router)
app.include_router(inspections.router)
app.include_router(cameras.router)
app.include_router(users.router)

STORAGE_PATH.mkdir(exist_ok=True)
(STORAGE_PATH / "standards").mkdir(exist_ok=True)
(STORAGE_PATH / "inspections").mkdir(exist_ok=True)
(STORAGE_PATH / "models").mkdir(exist_ok=True)

app.mount("/storage", StaticFiles(directory=STORAGE_PATH), name="storage")


@app.get("/api/health")
def health_check() -> dict:
    return {"status": "OK"}
