"""任务定义 Schema"""

from pydantic import BaseModel
from typing import Optional, Any, Dict, List
from datetime import datetime


class TaskDefinitionOut(BaseModel):
    id: int
    task_code: str
    name: str
    description: Optional[str] = None
    run_mode: str
    is_enabled: bool
    extra_info: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class TaskDefinitionUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    extra_info: Optional[Dict[str, Any]] = None
    name: Optional[str] = None
    description: Optional[str] = None


class TaskLogOut(BaseModel):
    id: int
    task_type: str
    task_status: str
    asset_id: int
    retry_count: Optional[int] = None
    max_retries: Optional[int] = None
    error_message: Optional[str] = None
    executed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BatchPhashRequest(BaseModel):
    asset_ids: Optional[List[int]] = None
    missing_only: bool = True
