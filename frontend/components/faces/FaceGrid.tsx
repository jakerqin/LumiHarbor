'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { facesApi, type Face, type FacesResponse } from '@/lib/api/faces';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { EmptyState } from '@/components/common/EmptyState';
import { FaceCard } from './FaceCard';

interface FaceGridProps {
  subjectId: number;
  onFaceClick: (face: Face) => void;
  emptyTitle: string;
  emptyDescription: string;
}

export function FaceGrid({
  subjectId,
  onFaceClick,
  emptyTitle,
  emptyDescription,
}: FaceGridProps) {
  const [page, setPage] = useState(1);
  const [allFaces, setAllFaces] = useState<Face[]>([]);
  const pageSize = 30;
  const lastProcessedPageRef = useRef(0);

  const { data, isLoading, error, isFetching } = useQuery<FacesResponse>({
    queryKey: ['faces', page, pageSize, subjectId],
    queryFn: () => facesApi.getFaces(page, pageSize, undefined, subjectId),
  });

  useEffect(() => {
    if (data && page > lastProcessedPageRef.current) {
      if (page === 1) {
        setAllFaces(data.faces);
      } else {
        setAllFaces((prev) => [...prev, ...data.faces]);
      }
      lastProcessedPageRef.current = page;
    }
  }, [data, page]);

  useInfiniteScroll(
    () => {
      if (data?.has_more) {
        setPage((p) => p + 1);
      }
    },
    data?.has_more ?? false,
    isFetching,
    500
  );

  if ((isLoading || isFetching) && page === 1 && allFaces.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-xl bg-background-secondary border border-white/5 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="加载失败"
        description="请检查网络后刷新页面重试。"
        action={{ label: '刷新', onClick: () => window.location.reload() }}
      />
    );
  }

  if (allFaces.length === 0 && !isLoading && !isFetching) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={{ label: '去面孔名单', href: '/faces' }}
      />
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {allFaces.map((face) => (
          <FaceCard key={face.id} face={face} onClick={() => onFaceClick(face)} />
        ))}
      </div>
      {isFetching && page > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl bg-background-secondary border border-white/5 animate-pulse"
            />
          ))}
        </div>
      )}
      {!data?.has_more && allFaces.length > 0 && (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-foreground-secondary">已加载全部 {data?.total} 张面孔</p>
        </div>
      )}
    </div>
  );
}
