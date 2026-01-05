'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CalendarBlank,
  MapPin,
  Image as ImageIcon,
  DotsThree,
} from '@phosphor-icons/react/dist/ssr';
import { albumsApi } from '@/lib/api/albums';
import { AssetCard } from '@/components/assets/AssetCard';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function AlbumDetailPage() {
  const router = useRouter();
  const params = useParams();
  const albumId = parseInt(params.id as string);

  const { data: album, isLoading } = useQuery({
    queryKey: ['album', albumId],
    queryFn: () => albumsApi.getAlbum(albumId),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-foreground-secondary">加载相册中...</p>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-foreground-secondary">相册不存在</p>
        </div>
      </div>
    );
  }

  const firstLocation = album.assets.find((a) => a.location)?.location;

  return (
    <div className="min-h-screen">
      {/* 封面区域 */}
      <div className="relative h-[50vh] overflow-hidden">
        <img
          src={album.coverUrl}
          alt={album.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* 返回按钮 */}
        <button
          onClick={() => router.back()}
          className="absolute top-8 left-8 p-3 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-xl transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={20} weight="bold" className="text-white" />
          <span className="text-white font-medium">返回</span>
        </button>

        {/* 更多操作 */}
        <button className="absolute top-8 right-8 p-3 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-xl transition-colors">
          <DotsThree size={24} weight="bold" className="text-white" />
        </button>

        {/* 相册信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-12">
          <div className="max-w-[1920px] mx-auto">
            <h1 className="text-5xl font-heading font-bold text-white mb-4">{album.name}</h1>

            <p className="text-lg text-white/80 mb-6 max-w-2xl">{album.description}</p>

            <div className="flex items-center gap-6 text-white/90">
              {/* 日期 */}
              {album.startTime && album.endTime && (
                <div className="flex items-center gap-2">
                  <CalendarBlank size={20} weight="duotone" />
                  <span>
                    {format(new Date(album.startTime), 'yyyy.MM.dd', { locale: zhCN })} -{' '}
                    {format(new Date(album.endTime), 'yyyy.MM.dd', { locale: zhCN })}
                  </span>
                </div>
              )}

              {/* 地点 */}
              {firstLocation && (
                <div className="flex items-center gap-2">
                  <MapPin size={20} weight="duotone" />
                  <span>{firstLocation.name}</span>
                </div>
              )}

              {/* 数量 */}
              <div className="flex items-center gap-2">
                <ImageIcon size={20} weight="duotone" />
                <span>{album.assetCount} 张照片</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 素材网格 */}
      <div className="py-12 px-8 bg-background">
        <div className="max-w-[1920px] mx-auto">
          {album.assets.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {album.assets.map((asset, index) => (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <AssetCard
                    asset={asset}
                    onClick={() => console.log('Open asset:', asset.id)}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <ImageIcon size={64} weight="duotone" className="mx-auto mb-4 text-foreground-tertiary" />
                <p className="text-xl text-foreground-secondary">相册为空</p>
                <p className="text-sm text-foreground-tertiary mt-2">还没有添加照片</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
