from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from .database import get_db, engine
from . import models, schemas
from .services.historian import HistorianService
from .config import settings
import os
import uvicorn

# 确保数据库表已创建 (开发环境下)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

@app.get("/")
def read_root():
    return {"message": f"欢迎使用 {settings.PROJECT_NAME} API"}

@app.post("/tasks/import-history", tags=["Management"])
def trigger_history_import(
    owner_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """触发历史素材扫描与导入"""
    nas_path = settings.NAS_DATA_PATH
    if not os.path.exists(nas_path):
        raise HTTPException(status_code=404, detail="NAS 数据路径未找到")
    
    def run_import():
        # 1. 扫描
        assets_data = HistorianService.scan_directory(nas_path, owner_id)
        
        for data in assets_data:
            # 2. 检查是否已存在 (简单去重基于路径)
            existing = db.query(models.Asset).filter(models.Asset.original_path == data['original_path']).first()
            if existing:
                continue
            
            # 3. 存入数据库
            new_asset = models.Asset(**data)
            db.add(new_asset)
            db.commit()
            db.refresh(new_asset)
            
            # 4. 生成预览图 (后续可放入更深的异步队列)
            thumb_rel_path = f"thumbnails/{new_asset.id}.webp"
            thumb_full_path = os.path.join(nas_path, "processed", thumb_rel_path)
            original_full_path = os.path.join(nas_path, data['original_path'])
            
            if HistorianService.generate_thumbnail(original_full_path, thumb_full_path):
                new_asset.thumbnail_path = thumb_rel_path
                db.commit()

    background_tasks.add_task(run_import)
    return {"status": "Import task started in background"}

@app.get("/assets", response_model=List[schemas.AssetOut], tags=["Assets"])
def list_assets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """获取素材列表"""
    assets = db.query(models.Asset).order_by(models.Asset.shot_at.desc()).offset(skip).limit(limit).all()
    return assets

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )