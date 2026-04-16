from constants import AppConstants, constants
from fastapi import APIRouter
from modules.cameras.router import router as cameras_router
from modules.groups.router import router as groups_router
from modules.inspections.router import router as inspections_router
from modules.ml_models.router import router as models_router
from modules.segments.router import segment_group_router as segment_groups_router
from modules.segments.router import segment_router as segments_router
from modules.standards.router import router as standards_router
from modules.tasks.router import router as tasks_router
from modules.training.router import router as training_router
from modules.users.router import router as users_router

api_router = APIRouter()

api_router.include_router(users_router)
api_router.include_router(groups_router)
api_router.include_router(standards_router)
api_router.include_router(segments_router)
api_router.include_router(segment_groups_router)
api_router.include_router(cameras_router)
api_router.include_router(inspections_router)
api_router.include_router(models_router)
api_router.include_router(tasks_router)
api_router.include_router(training_router)


@api_router.get(
    "/meta/constants",
    response_model=AppConstants,
    response_model_by_alias=False,
    include_in_schema=False,
)
async def get_constants() -> AppConstants:
    return constants


@api_router.get("/api/health")
def health_check() -> dict:
    return {"status": "OK"}
