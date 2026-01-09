# 精选照片墙功能实现总结

## 功能概述

实现了多用户精选照片墙（BentoGrid）功能，支持用户独立收藏素材、动态布局、hover 动画、实时更新等特性。

---

## 实现内容

### 1. 数据库设计

#### 1.1 用户收藏表 (user_favorites)

```sql
CREATE TABLE user_favorites (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    asset_id BIGINT NOT NULL COMMENT '素材ID',
    favorited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '软删除标记',
    UNIQUE KEY uk_user_asset (user_id, asset_id),
    INDEX idx_user_favorited (user_id, favorited_at DESC)
) COMMENT '用户收藏表';
```

**设计要点**:
- ✅ 多用户支持：不同用户独立收藏
- ✅ 防重复收藏：唯一索引 (user_id, asset_id)
- ✅ 软删除：支持逻辑删除，保留历史数据
- ✅ 性能优化：复合索引 (user_id, favorited_at) 优化排序查询

#### 1.2 精选照片模板配置 (asset_template_tags)

```sql
INSERT INTO asset_template_tags (template_type, tag_key, sort_order) VALUES
('home_featured', 'width', 1),
('home_featured', 'height', 2),
('home_featured', 'duration', 3),
('home_featured', 'location_city', 4),
('home_featured', 'location_poi', 5),
('home_featured', 'location_formatted', 6),
('home_featured', 'device_model', 7);
```

**设计要点**:
- ✅ 模板驱动：通过配置表控制返回哪些标签
- ✅ 易扩展：新增/修改标签无需改代码
- ✅ 跨场景复用：同一标签可用于不同模板

---

### 2. 后端实现

#### 2.1 数据模型

**文件**: `backend/app/model/user_favorite.py`

```python
class UserFavorite(Base):
    __tablename__ = "user_favorites"

    id = Column(BIGINT, primary_key=True, autoincrement=True)
    user_id = Column(BIGINT, nullable=False, index=True)
    asset_id = Column(BIGINT, nullable=False, index=True)
    favorited_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_deleted = Column(Boolean, default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'asset_id', name='uk_user_asset'),
        Index('idx_user_favorited', 'user_id', 'favorited_at'),
    )
```

#### 2.2 响应模型

**文件**: `backend/app/schema/home/featured.py`

```python
class FeaturedAsset(BaseModel):
    """精选素材响应模型"""
    id: int
    type: str  # 'image' | 'video' | 'audio'
    thumbnail_url: str = Field(alias='thumbnailUrl')
    original_url: str = Field(alias='originalUrl')
    file_name: str = Field(alias='fileName')
    file_size: int = Field(alias='fileSize')
    aspect_ratio: str = Field(alias='aspectRatio')
    shot_at: Optional[datetime] = Field(None, alias='shotAt')
    created_at: datetime = Field(alias='createdAt')
    favorited_at: Optional[datetime] = Field(alias='favoritedAt')
    is_favorited: bool = Field(default=True, alias='isFavorited')
    tags: Dict[str, Any] = {}  # 标签 JSON 对象
```

**关键变更**:
- ✅ 移除了单独的 width、height、location 字段
- ✅ 新增 tags JSON 对象，包含所有标签数据
- ✅ 新增 is_favorited 字段（精选列表中固定为 true）

#### 2.3 API 接口 - 性能优化版本

**文件**: `backend/app/routers/home/featured.py`

**优化前问题**:
- ❌ 在 for 循环中查询数据库（N+1 问题）
- ❌ 硬编码标签列表（device_make, device_model, lens_model）
- ❌ SQL 查询频繁，性能低下

**优化后方案**:

```python
@router.get("/featured", response_model=FeaturedResponse)
def get_featured_assets(
    user_id: int = Query(default=1),
    limit: int = Query(default=9),
    db: Session = Depends(get_db)
):
    # 1. 查询收藏列表（1 次 SQL）
    query = (
        select(Asset, UserFavorite.favorited_at)
        .join(UserFavorite, Asset.id == UserFavorite.asset_id)
        .where(UserFavorite.user_id == user_id)
        .where(UserFavorite.is_deleted == False)
        .where(Asset.is_deleted == False)
        .order_by(UserFavorite.favorited_at.desc())
        .limit(limit)
    )
    rows = db.execute(query).all()

    # 2. 查询 home_featured 模板配置（1 次 SQL）
    template_query = select(AssetTemplateTag.tag_key).where(
        AssetTemplateTag.template_type == 'home_featured'
    )
    required_tag_keys = [row[0] for row in db.execute(template_query).all()]

    # 3. 批量查询所有标签（1 次 SQL，消除 N+1 问题）
    asset_ids = [asset.id for asset, _ in rows]
    tags_query = (
        select(AssetTag)
        .where(AssetTag.asset_id.in_(asset_ids))
        .where(AssetTag.tag_key.in_(required_tag_keys))
    )
    all_tags = db.execute(tags_query).scalars().all()

    # 4. 构建标签字典：{asset_id: {tag_key: tag_value}}
    tags_by_asset = {}
    for tag in all_tags:
        if tag.asset_id not in tags_by_asset:
            tags_by_asset[tag.asset_id] = {}
        tags_by_asset[tag.asset_id][tag.tag_key] = tag.tag_value

    # 5. 构建响应
    featured_assets = []
    for asset, favorited_at in rows:
        tags_dict = tags_by_asset.get(asset.id, {})

        # 计算宽高比
        width = int(tags_dict.get('width', 0)) if tags_dict.get('width') else 0
        height = int(tags_dict.get('height', 0)) if tags_dict.get('height') else 0
        aspect_ratio = calculate_aspect_ratio(width, height)

        featured_assets.append(FeaturedAsset(
            id=asset.id,
            type=asset.asset_type,
            thumbnail_url=f"/api/v1/assets/{asset.id}/thumbnail",
            original_url=f"/api/v1/assets/{asset.id}/original",
            file_name=asset.original_path.split('/')[-1] if asset.original_path else '',
            file_size=asset.file_size or 0,
            aspect_ratio=aspect_ratio,
            shot_at=asset.shot_at,
            created_at=asset.created_at,
            favorited_at=favorited_at,
            tags=tags_dict  # 所有标签放到 tags JSON 对象中
        ))

    return FeaturedResponse(
        assets=featured_assets,
        total=total or 0,
        user_id=user_id
    )
```

**性能优化成果**:
- ✅ **总共只执行 3 次 SQL 查询**（而非 1 + N 次）
- ✅ **使用 IN 子句批量查询**，消除 N+1 问题
- ✅ **基于模板配置动态返回标签**，无硬编码
- ✅ **内存构建标签字典**，避免重复查询

#### 2.4 收藏/取消收藏接口

**文件**: `backend/app/routers/favorite.py`

```python
@router.post("/{asset_id}/favorite")
def favorite_asset(
    asset_id: int,
    user_id: int = Query(default=1),
    db: Session = Depends(get_db)
):
    """收藏素材"""
    # 检查是否已收藏（含软删除检查）
    existing = db.execute(
        select(UserFavorite).where(
            UserFavorite.user_id == user_id,
            UserFavorite.asset_id == asset_id,
            UserFavorite.is_deleted == False
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="素材已收藏")

    # 创建收藏记录
    favorite = UserFavorite(
        user_id=user_id,
        asset_id=asset_id,
        favorited_at=datetime.utcnow()
    )
    db.add(favorite)
    db.commit()

    return {"message": "收藏成功"}

@router.delete("/{asset_id}/favorite")
def unfavorite_asset(
    asset_id: int,
    user_id: int = Query(default=1),
    db: Session = Depends(get_db)
):
    """取消收藏（软删除）"""
    favorite = db.execute(
        select(UserFavorite).where(
            UserFavorite.user_id == user_id,
            UserFavorite.asset_id == asset_id,
            UserFavorite.is_deleted == False
        )
    ).scalar_one_or_none()

    if not favorite:
        raise HTTPException(status_code=404, detail="收藏记录不存在")

    # 软删除
    favorite.is_deleted = True
    db.commit()

    return {"message": "取消收藏成功"}
```

---

### 3. 前端实现

#### 3.1 类型定义

**文件**: `frontend/lib/api/types.ts`

```typescript
export interface Asset {
  id: number;
  type: 'image' | 'video' | 'audio';
  thumbnailUrl: string;
  originalUrl: string;
  fileName: string;
  fileSize: number;
  aspectRatio?: 'horizontal' | 'vertical' | 'square';
  shotAt: string;
  createdAt: string;
  favoritedAt?: string;
  isFavorited?: boolean;
  tags: Record<string, any>;  // 标签 JSON 对象
  blurHash?: string;
}
```

**关键变更**:
- ✅ tags 从 `string[]` 改为 `Record<string, any>`
- ✅ 新增 isFavorited 字段

#### 3.2 收藏按钮组件

**文件**: `frontend/components/assets/FavoriteButton.tsx`

```typescript
export function FavoriteButton({ assetId, initialFavorited, onToggle }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const queryClient = useQueryClient();

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorited) {
        await assetsApi.unfavorite(assetId);
      } else {
        await assetsApi.favorite(assetId);
      }
    },
    onMutate: async () => {
      // 乐观更新
      const newFavorited = !isFavorited;
      setIsFavorited(newFavorited);
      return { previousFavorited: isFavorited };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-assets'] });
      onToggle?.();
    },
    onError: (_, __, context) => {
      // 回滚
      setIsFavorited(context.previousFavorited);
    },
  });

  return (
    <button onClick={() => favoriteMutation.mutate()}>
      <Heart
        size={20}
        className={isFavorited ? "fill-red-500 text-red-500" : "text-white"}
      />
    </button>
  );
}
```

**特性**:
- ✅ 乐观更新：点击立即响应
- ✅ 错误回滚：失败时恢复原状态
- ✅ 自动刷新：成功后刷新精选列表

#### 3.3 精选照片卡片

**文件**: `frontend/components/home/BentoCard.tsx`

```typescript
export function BentoCard({ asset, size, index }: BentoCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // 从 tags 对象中提取地点信息
  const locationName = asset.tags?.location_formatted ||
                       asset.tags?.location_city ||
                       asset.tags?.location_poi;

  // 从 tags 对象中提取设备信息
  const displayTags = [
    asset.tags?.device_model,
  ].filter(Boolean) as string[];

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <Image src={asset.thumbnailUrl} alt={asset.fileName} fill />

      {/* 收藏按钮 */}
      <FavoriteButton
        assetId={asset.id}
        initialFavorited={asset.isFavorited}
      />

      {/* Hover 显示元数据 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80">
        {locationName && (
          <div className="flex items-center gap-2">
            <MapPin size={16} />
            <span>{locationName}</span>
          </div>
        )}

        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {displayTags.map((tag) => (
              <span key={tag} className="px-2 py-1 bg-white/20 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**关键变更**:
- ✅ 从 `asset.tags` 对象中动态提取地点和设备信息
- ✅ 支持多级地点回退：formatted > city > poi
- ✅ 集成收藏按钮组件

---

## 测试结果

### 1. API 接口测试

```bash
curl "http://localhost:8000/home/featured?user_id=1&limit=3"
```

**返回示例**:
```json
{
  "assets": [
    {
      "id": 1,
      "type": "image",
      "thumbnailUrl": "/api/v1/assets/1/thumbnail",
      "originalUrl": "/api/v1/assets/1/original",
      "fileName": "IMG_3195.HEIC",
      "fileSize": 1032644,
      "aspectRatio": "square",
      "shotAt": "2025-11-30T09:20:13",
      "createdAt": "2026-01-08T10:34:32",
      "favoritedAt": "2026-01-09T08:35:12",
      "isFavorited": true,
      "tags": {
        "device_model": "iPhone 14 Pro",
        "location_city": "南通市",
        "location_formatted": "江苏省南通市崇川区陈桥街道丰泰四路南通森林野生动物园",
        "location_poi": ""
      }
    }
  ],
  "total": 2,
  "userId": 1
}
```

**验证结果**:
- ✅ 所有字段正确返回
- ✅ tags 为 JSON 对象格式
- ✅ isFavorited 字段存在且为 true

### 2. SQL 性能测试

**测试代码**: 查询 3 条精选素材

**SQL 执行次数**:
```
【查询 1】获取用户收藏的素材列表
SELECT assets.*, user_favorites.favorited_at
FROM assets JOIN user_favorites ...
LIMIT 3

【查询 2】获取 home_featured 模板配置
SELECT tag_key FROM asset_template_tags
WHERE template_type = 'home_featured'

【查询 3】批量查询所有素材的标签
SELECT * FROM asset_tags
WHERE asset_id IN (1, 2)
AND tag_key IN ('device_model', 'location_city', ...)
```

**验证结果**:
- ✅ **总共只执行 3 次 SELECT**
- ✅ **没有在循环中查询数据库**
- ✅ **使用 IN 子句批量查询**

---

## 技术亮点

### 1. 架构设计

- ✅ **多用户隔离**：user_favorites 中间表，支持不同用户独立收藏
- ✅ **软删除设计**：保留历史数据，支持数据恢复
- ✅ **模板驱动**：通过 asset_template_tags 配置返回哪些标签
- ✅ **跨场景复用**：同一标签可用于多个模板（image、video、home_featured）

### 2. 性能优化

- ✅ **消除 N+1 查询**：批量查询代替循环查询
- ✅ **复合索引**：(user_id, favorited_at) 优化排序查询
- ✅ **唯一索引**：(user_id, asset_id) 防止重复收藏
- ✅ **内存构建字典**：避免重复数据库查询

### 3. 前端体验

- ✅ **乐观更新**：点击收藏立即响应，无需等待
- ✅ **错误回滚**：失败时自动恢复原状态
- ✅ **自动刷新**：收藏成功后自动刷新列表
- ✅ **动态布局**：根据 aspectRatio 自动调整卡片大小

---

## 文件清单

### 数据库迁移

- `backend/migrations/001_add_user_favorites.sql` - 创建用户收藏表
- `backend/migrations/002_add_is_deleted_to_user_favorites.sql` - 添加软删除字段
- `backend/migrations/003_add_home_featured_template.sql` - 添加精选照片模板配置

### 后端代码

- `backend/app/model/user_favorite.py` - 用户收藏模型
- `backend/app/schema/home/featured.py` - 精选照片响应模型
- `backend/app/routers/home/featured.py` - 精选照片接口
- `backend/app/routers/favorite.py` - 收藏/取消收藏接口
- `backend/app/routers/home/__init__.py` - Home 路由导出

### 前端代码

- `frontend/lib/api/types.ts` - TypeScript 类型定义
- `frontend/lib/api/home.ts` - 首页 API 客户端
- `frontend/lib/api/assets.ts` - 素材 API 客户端（收藏接口）
- `frontend/components/assets/FavoriteButton.tsx` - 收藏按钮组件
- `frontend/components/home/BentoCard.tsx` - 精选照片卡片组件
- `frontend/components/home/BentoGrid.tsx` - 精选照片网格布局

### 文档更新

- `CLAUDE.md` - 更新数据库设计规范（is_deleted 字段要求）
- `IMPLEMENTATION_SUMMARY.md` - 本文档

---

## 后续计划

- [ ] 前端适配真实 API（已完成接口对接）
- [ ] 添加收藏数量显示
- [ ] 添加批量取消收藏功能
- [ ] 优化图片加载（懒加载、BlurHash）
- [ ] 添加素材详情页查看

---

**实现时间**: 2026-01-09
**版本**: v0.3.0
**状态**: ✅ 已完成
