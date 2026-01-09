'use client';

import { Heart } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsApi } from '@/lib/api/assets';
import { useState } from 'react';

interface FavoriteButtonProps {
  assetId: number;
  initialFavorited?: boolean;
  className?: string;
  onToggle?: (isFavorited: boolean) => void;
}

export function FavoriteButton({
  assetId,
  initialFavorited = false,
  className = '',
  onToggle,
}: FavoriteButtonProps) {
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
      // 乐观更新：立即切换状态
      const newFavorited = !isFavorited;
      setIsFavorited(newFavorited);
      return { previousFavorited: isFavorited };
    },
    onSuccess: (_, __, context) => {
      // 成功后失效相关查询，触发重新获取
      queryClient.invalidateQueries({ queryKey: ['featured-assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });

      // 通知父组件
      if (onToggle) {
        onToggle(!context.previousFavorited);
      }
    },
    onError: (_, __, context) => {
      // 失败时回滚状态
      if (context?.previousFavorited !== undefined) {
        setIsFavorited(context.previousFavorited);
      }
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    favoriteMutation.mutate();
  };

  return (
    <button
      onClick={handleClick}
      disabled={favoriteMutation.isPending}
      className={`
        group relative p-2 rounded-full
        bg-black/20 backdrop-blur-sm
        hover:bg-black/40
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      aria-label={isFavorited ? '取消收藏' : '收藏'}
    >
      <Heart
        className={`
          w-5 h-5 transition-all duration-200
          ${isFavorited
            ? 'fill-red-500 text-red-500'
            : 'text-white group-hover:scale-110'
          }
          ${favoriteMutation.isPending ? 'animate-pulse' : ''}
        `}
      />
    </button>
  );
}
