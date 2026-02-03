"""相册业务逻辑层"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional, Tuple
from datetime import datetime, time
from .. import model, schema
from ..tools.utils import get_logger

logger = get_logger(__name__)
class AlbumService:
    """相册服务类（业务逻辑层）

    负责处理相册的 CRUD 操作、时间范围自动维护、封面管理等业务逻辑
    """

    @staticmethod
    def _parse_date_bound(date_str: str, field_name: str, bound: str) -> datetime:
        """解析日期字符串为 datetime 边界（start -> 00:00:00.000000，end -> 23:59:59.999999）"""
        try:
            parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError as exc:
            raise ValueError(f"{field_name} 格式错误，应为 YYYY-MM-DD") from exc

        if bound == "start":
            return datetime.combine(parsed_date, time.min)
        if bound == "end":
            return datetime.combine(parsed_date, time.max)
        raise ValueError("无效的时间边界类型")

    @staticmethod
    def _validate_cover_asset(db: Session, cover_asset_id: Optional[int]) -> None:
        """校验封面素材是否存在且未删除"""
        if cover_asset_id is None:
            return
        exists = db.query(model.Asset.id).filter(
            model.Asset.id == cover_asset_id,
            model.Asset.is_deleted == False
        ).first()
        if not exists:
            raise ValueError(f"封面素材不存在或已删除: {cover_asset_id}")

    @staticmethod
    def create_album(
        db: Session,
        album_data: schema.AlbumCreate,
        created_by: int
    ) -> model.Album:
        """创建相册

        Args:
            db: 数据库会话
            album_data: 相册创建数据
            created_by: 创建者用户ID

        Returns:
            创建的相册对象
        """
        start_dt = None
        end_dt = None
        if album_data.start_time:
            start_dt = AlbumService._parse_date_bound(album_data.start_time, "start_time", "start")
        if album_data.end_time:
            end_dt = AlbumService._parse_date_bound(album_data.end_time, "end_time", "end")
        if start_dt and end_dt and start_dt > end_dt:
            raise ValueError("start_time 不能晚于 end_time")

        AlbumService._validate_cover_asset(db, album_data.cover_asset_id)

        album = model.Album(
            name=album_data.name,
            description=album_data.description,
            visibility=album_data.visibility,
            created_by=created_by,
            start_time=start_dt,
            end_time=end_dt,
            cover_asset_id=album_data.cover_asset_id,
        )
        db.add(album)
        db.commit()
        db.refresh(album)
        return album

    @staticmethod
    def get_or_create_album(
        db: Session,
        album_id: Optional[int] = None,
        album_name: Optional[str] = None,
        created_by: int = 1,
        visibility: str = "general",
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> Tuple[Optional[model.Album], str]:
        """获取或创建相册（用于素材导入）

        Args:
            db: 数据库会话
            album_id: 现有相册ID（优先使用）
            album_name: 新建相册名称
            created_by: 创建者用户ID
            visibility: 可见性
            start_time: 相册开始时间（仅创建新相册时使用）
            end_time: 相册结束时间（仅创建新相册时使用）

        Returns:
            (相册对象, 操作类型: "found"/"created"/"failed")
        """
        # 模式 A: 使用现有相册
        if album_id is not None:
            album = AlbumService.get_album_by_id(db, album_id)
            if album:
                return album, "found"
            else:
                return None, "failed"

        # 模式 B: 创建新相册
        if album_name:
            album = model.Album(
                name=album_name,
                description="",
                visibility=visibility,
                created_by=created_by,
                start_time=start_time,
                end_time=end_time
            )
            db.add(album)
            db.commit()
            db.refresh(album)
            return album, "created"

        return None, "failed"

    @staticmethod
    def get_album_by_id(
        db: Session,
        album_id: int,
        include_deleted: bool = False
    ) -> Optional[model.Album]:
        """根据ID获取相册

        Args:
            db: 数据库会话
            album_id: 相册ID
            include_deleted: 是否包含已删除的相册

        Returns:
            相册对象，不存在返回 None
        """
        query = db.query(model.Album).filter(model.Album.id == album_id)
        if not include_deleted:
            query = query.filter(model.Album.is_deleted == False)
        return query.first()

    @staticmethod
    def list_albums(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "created_at",
        order: str = "desc",
        visibility: Optional[str] = None,
        search: Optional[str] = None,
        created_by: Optional[int] = None,
        start_time_from: Optional[str] = None,
        end_time_to: Optional[str] = None
    ) -> Tuple[List[model.Album], int]:
        """获取相册列表（支持排序、筛选、搜索）

        Args:
            db: 数据库会话
            skip: 跳过的记录数（分页）
            limit: 返回的最大记录数
            sort_by: 排序字段（created_at, updated_at, name, start_time）
            order: 排序顺序（asc, desc）
            visibility: 可见性筛选（general, private）
            search: 按名称模糊搜索
            created_by: 按创建者筛选
            start_time_from: 相册开始时间筛选（相册 start_time >= 此值）
            end_time_to: 相册结束时间筛选（相册 end_time <= 此值）

        Returns:
            (相册列表, 总数)
        """
        query = db.query(model.Album).filter(model.Album.is_deleted == False)

        # 筛选条件
        if visibility:
            query = query.filter(model.Album.visibility == visibility)
        if created_by:
            query = query.filter(model.Album.created_by == created_by)
        if search:
            query = query.filter(model.Album.name.like(f"%{search}%"))

        # 时间范围筛选（将日期字符串转换为 datetime 对象）
        if start_time_from:
            # 筛选 start_time >= start_time_from 00:00:00.000000
            start_date = datetime.strptime(start_time_from, "%Y-%m-%d").date()
            start_dt = datetime.combine(start_date, time.min)
            query = query.filter(model.Album.start_time >= start_dt)
        if end_time_to:
            # 筛选 end_time <= end_time_to 23:59:59.999999
            end_date = datetime.strptime(end_time_to, "%Y-%m-%d").date()
            end_dt = datetime.combine(end_date, time.max)
            query = query.filter(model.Album.end_time <= end_dt)

        # 获取总数
        total = query.count()

        # 排序
        sort_field = getattr(model.Album, sort_by, model.Album.created_at)
        if order == "desc":
            query = query.order_by(sort_field.desc())
        else:
            query = query.order_by(sort_field.asc())

        # 分页
        albums = query.offset(skip).limit(limit).all()

        return albums, total

    @staticmethod
    def update_album(
        db: Session,
        album_id: int,
        album_data: schema.AlbumUpdate
    ) -> Optional[model.Album]:
        """更新相册信息

        Args:
            db: 数据库会话
            album_id: 相册ID
            album_data: 更新数据

        Returns:
            更新后的相册对象，不存在返回 None
        """
        album = AlbumService.get_album_by_id(db, album_id)
        if not album:
            return None

        # 仅更新提供的字段
        update_data = album_data.model_dump(exclude_unset=True)

        if "start_time" in update_data:
            start_value = update_data["start_time"]
            update_data["start_time"] = (
                AlbumService._parse_date_bound(start_value, "start_time", "start")
                if start_value
                else None
            )

        if "end_time" in update_data:
            end_value = update_data["end_time"]
            update_data["end_time"] = (
                AlbumService._parse_date_bound(end_value, "end_time", "end")
                if end_value
                else None
            )

        if "cover_asset_id" in update_data:
            AlbumService._validate_cover_asset(db, update_data["cover_asset_id"])

        start_dt = update_data.get("start_time", album.start_time)
        end_dt = update_data.get("end_time", album.end_time)
        if start_dt and end_dt and start_dt > end_dt:
            raise ValueError("start_time 不能晚于 end_time")

        for field, value in update_data.items():
            setattr(album, field, value)

        db.commit()
        db.refresh(album)
        return album

    @staticmethod
    def delete_album(db: Session, album_id: int) -> bool:
        """删除相册（软删除）并级联删除相册下所有素材及物理文件

        Args:
            db: 数据库会话
            album_id: 相册ID

        Returns:
            是否删除成功
        """
        from .asset import AssetService

        album = AlbumService.get_album_by_id(db, album_id)
        if not album:
            return False

        # 获取相册下所有素材ID
        asset_ids = db.query(model.AlbumAsset.asset_id).filter(
            and_(
                model.AlbumAsset.album_id == album_id,
                model.AlbumAsset.is_deleted == False
            )
        ).all()
        asset_ids = [row[0] for row in asset_ids]

        # 软删除相册
        album.is_deleted = True
        db.commit()

        # 批量删除素材及物理文件（会自动处理 album_assets、asset_tags 等关联数据）
        if asset_ids:
            AssetService.batch_delete_assets(db, asset_ids)

        return True

    @staticmethod
    def add_asset_to_album(
        db: Session,
        album_id: int,
        asset_id: int
    ) -> Optional[model.AlbumAsset]:
        """添加单个素材到相册

        自动更新相册时间范围和封面（如果是第一个素材）

        Args:
            db: 数据库会话
            album_id: 相册ID
            asset_id: 素材ID

        Returns:
            关联记录，失败返回 None
        """
        # 检查相册和素材是否存在
        album = AlbumService.get_album_by_id(db, album_id)
        if not album:
            return None

        asset = db.query(model.Asset).filter(
            model.Asset.id == asset_id,
            model.Asset.is_deleted == False
        ).first()
        if not asset:
            return None

        # 检查是否已存在（避免重复添加）
        existing = db.query(model.AlbumAsset).filter(
            model.AlbumAsset.album_id == album_id,
            model.AlbumAsset.asset_id == asset_id,
            model.AlbumAsset.is_deleted == False
        ).first()
        if existing:
            return existing

        # 创建关联记录
        album_asset = model.AlbumAsset(
            album_id=album_id,
            asset_id=asset_id,
            sort_order=0
        )
        db.add(album_asset)

        # 更新相册时间范围和封面
        AlbumService._update_album_time_range(db, album_id)
        AlbumService._update_album_cover_if_needed(db, album_id)

        db.commit()
        db.refresh(album_asset)
        return album_asset

    @staticmethod
    def add_assets_to_album_batch(
        db: Session,
        album_id: int,
        asset_ids: List[int]
    ) -> Tuple[int, List[int]]:
        """批量添加素材到相册

        Args:
            db: 数据库会话
            album_id: 相册ID
            asset_ids: 素材ID列表

        Returns:
            (成功添加的数量, 失败的asset_id列表)
        """
        album = AlbumService.get_album_by_id(db, album_id)
        if not album:
            return 0, asset_ids

        success_count = 0
        failed_ids = []

        for asset_id in asset_ids:
            # 检查素材是否存在
            asset = db.query(model.Asset).filter(
                model.Asset.id == asset_id,
                model.Asset.is_deleted == False
            ).first()
            if not asset:
                failed_ids.append(asset_id)
                continue

            # 检查是否已存在
            existing = db.query(model.AlbumAsset).filter(
                model.AlbumAsset.album_id == album_id,
                model.AlbumAsset.asset_id == asset_id,
                model.AlbumAsset.is_deleted == False
            ).first()
            if existing:
                continue

            # 创建关联记录
            album_asset = model.AlbumAsset(
                album_id=album_id,
                asset_id=asset_id,
                sort_order=0
            )
            db.add(album_asset)
            success_count += 1

        # 更新相册时间范围和封面
        if success_count > 0:
            # 先 flush 确保关联记录可查询（解决封面无法设置的问题）
            db.flush()
            AlbumService._update_album_time_range(db, album_id)
            AlbumService._update_album_cover_if_needed(db, album_id)

        db.commit()
        return success_count, failed_ids

    @staticmethod
    def remove_asset_from_album(
        db: Session,
        album_id: int,
        asset_id: int
    ) -> bool:
        """从相册移除素材（软删除）

        自动更新相册时间范围和封面

        Args:
            db: 数据库会话
            album_id: 相册ID
            asset_id: 素材ID

        Returns:
            是否移除成功
        """
        album_asset = db.query(model.AlbumAsset).filter(
            model.AlbumAsset.album_id == album_id,
            model.AlbumAsset.asset_id == asset_id,
            model.AlbumAsset.is_deleted == False
        ).first()

        if not album_asset:
            return False

        album_asset.is_deleted = True

        # 更新相册时间范围和封面
        AlbumService._update_album_time_range(db, album_id)
        AlbumService._update_album_cover_if_needed(db, album_id)

        db.commit()
        return True

    @staticmethod
    def get_album_assets(
        db: Session,
        album_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[model.Asset]:
        """获取相册内的素材列表

        Args:
            db: 数据库会话
            album_id: 相册ID
            skip: 跳过的记录数
            limit: 返回的最大记录数

        Returns:
            素材列表（按 sort_order 排序）
        """
        assets = db.query(model.Asset).join(
            model.AlbumAsset,
            and_(
                model.AlbumAsset.asset_id == model.Asset.id,
                model.AlbumAsset.album_id == album_id,
                model.AlbumAsset.is_deleted == False
            )
        ).filter(
            model.Asset.is_deleted == False
        ).order_by(
            model.AlbumAsset.sort_order.asc(),
            model.Asset.shot_at.desc()
        ).offset(skip).limit(limit).all()

        return assets

    @staticmethod
    def update_asset_sort(
        db: Session,
        album_id: int,
        asset_id: int,
        sort_order: int
    ) -> bool:
        """更新素材在相册内的排序

        Args:
            db: 数据库会话
            album_id: 相册ID
            asset_id: 素材ID
            sort_order: 新的排序顺序

        Returns:
            是否更新成功
        """
        album_asset = db.query(model.AlbumAsset).filter(
            model.AlbumAsset.album_id == album_id,
            model.AlbumAsset.asset_id == asset_id,
            model.AlbumAsset.is_deleted == False
        ).first()

        if not album_asset:
            return False

        album_asset.sort_order = sort_order
        db.commit()
        return True

    @staticmethod
    def set_album_cover(
        db: Session,
        album_id: int,
        cover_asset_id: int
    ) -> Optional[model.Album]:
        """设置相册封面

        Args:
            db: 数据库会话
            album_id: 相册ID
            cover_asset_id: 封面素材ID

        Returns:
            更新后的相册对象，失败返回 None
        """
        album = AlbumService.get_album_by_id(db, album_id)
        if not album:
            return None

        # 检查素材是否在相册内
        album_asset = db.query(model.AlbumAsset).filter(
            model.AlbumAsset.album_id == album_id,
            model.AlbumAsset.asset_id == cover_asset_id,
            model.AlbumAsset.is_deleted == False
        ).first()

        if not album_asset:
            return None

        album.cover_asset_id = cover_asset_id
        db.commit()
        db.refresh(album)
        return album

    @staticmethod
    def get_album_asset_count(db: Session, album_id: int) -> int:
        """获取相册内素材数量

        Args:
            db: 数据库会话
            album_id: 相册ID

        Returns:
            素材数量
        """
        return db.query(model.AlbumAsset).filter(
            model.AlbumAsset.album_id == album_id,
            model.AlbumAsset.is_deleted == False
        ).count()

    @staticmethod
    def _update_album_time_range(db: Session, album_id: int) -> None:
        """更新相册时间范围（内部方法）

        自动根据相册内素材的拍摄时间更新 start_time 和 end_time

        Args:
            db: 数据库会话
            album_id: 相册ID
        """
        album = db.query(model.Album).filter(model.Album.id == album_id).first()
        if not album:
            return

        # 查询相册内素材的最早和最晚拍摄时间
        time_range = db.query(
            func.min(model.Asset.shot_at).label('min_time'),
            func.max(model.Asset.shot_at).label('max_time')
        ).join(
            model.AlbumAsset,
            and_(
                model.AlbumAsset.asset_id == model.Asset.id,
                model.AlbumAsset.album_id == album_id,
                model.AlbumAsset.is_deleted == False
            )
        ).filter(
            model.Asset.is_deleted == False,
            model.Asset.shot_at.isnot(None)
        ).first()

        if time_range:
            album.start_time = time_range.min_time
            album.end_time = time_range.max_time
        else:
            # 相册为空或所有素材都没有拍摄时间
            album.start_time = None
            album.end_time = None

    @staticmethod
    def _update_album_cover_if_needed(db: Session, album_id: int) -> None:
        """如果相册没有封面，自动选择第一张素材作为封面（内部方法）

        Args:
            db: 数据库会话
            album_id: 相册ID
        """
        album = db.query(model.Album).filter(model.Album.id == album_id).first()
        if not album or album.cover_asset_id:
            return  # 已有封面，无需更新

        # 选择拍摄时间最早的素材作为封面
        first_asset = db.query(model.Asset).join(
            model.AlbumAsset,
            and_(
                model.AlbumAsset.asset_id == model.Asset.id,
                model.AlbumAsset.album_id == album_id,
                model.AlbumAsset.is_deleted == False
            )
        ).filter(
            model.Asset.is_deleted == False
        ).order_by(
            model.Asset.shot_at.asc()
        ).first()

        if first_asset:
            album.cover_asset_id = first_asset.id
