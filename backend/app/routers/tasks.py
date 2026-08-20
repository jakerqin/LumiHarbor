"""任务定义与补跑"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from ..db import get_db
from .. import schema
from ..services.tasks import TaskDefinitionService

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("/definitions", response_model=schema.ApiResponse[List[schema.TaskDefinitionOut]])
def list_task_definitions(db: Session = Depends(get_db)):
    items = TaskDefinitionService.list_all(db)
    data = [schema.TaskDefinitionOut.model_validate(item) for item in items]
    return schema.ApiResponse.success(data=data)


@router.patch(
    "/definitions/{task_code}",
    response_model=schema.ApiResponse[schema.TaskDefinitionOut],
)
def update_task_definition(
    task_code: str,
    payload: schema.TaskDefinitionUpdate,
    db: Session = Depends(get_db),
):
    item = TaskDefinitionService.update(db, task_code, payload)
    return schema.ApiResponse.success(data=schema.TaskDefinitionOut.model_validate(item))


@router.get("/logs", response_model=schema.ApiResponse[List[schema.TaskLogOut]])
def list_task_logs(
    task_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    items = TaskDefinitionService.list_logs(db, task_type, limit)
    data = [schema.TaskLogOut.model_validate(item) for item in items]
    return schema.ApiResponse.success(data=data)


@router.post("/batch-phash", response_model=schema.ApiResponse[dict])
def trigger_batch_phash(
    payload: schema.BatchPhashRequest,
    db: Session = Depends(get_db),
):
    result = TaskDefinitionService.trigger_batch_phash(db, payload)
    return schema.ApiResponse.success(data=result)
