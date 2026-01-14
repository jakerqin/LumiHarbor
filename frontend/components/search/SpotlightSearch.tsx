'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { gsap } from 'gsap';
import {
  Search,
  X,
  Image as ImageIcon,
  Video,
  FolderOpen,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { searchApi, type SearchResult } from '@/lib/api/search';

interface SpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SpotlightSearch({ isOpen, onClose }: SpotlightSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 搜索功能
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchApi.search(query);
        setResults(data);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // 自动聚焦
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setResults(null);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // 进入/退出动画
  useEffect(() => {
    if (!containerRef.current || !backdropRef.current || !panelRef.current) return;

    if (isOpen) {
      // 显示容器
      containerRef.current.style.display = 'block';

      // 进入动画
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2, ease: 'power2.out' }
      );

      gsap.fromTo(
        panelRef.current,
        { opacity: 0, scale: 0.95, y: -20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    } else {
      // 退出动画
      const tl = gsap.timeline({
        onComplete: () => {
          if (containerRef.current) {
            containerRef.current.style.display = 'none';
          }
        },
      });

      tl.to(backdropRef.current, {
        opacity: 0,
        duration: 0.15,
        ease: 'power2.in',
      });

      tl.to(
        panelRef.current,
        {
          opacity: 0,
          scale: 0.95,
          y: -20,
          duration: 0.2,
          ease: 'power2.in',
        },
        '<' // 与背景动画同时开始
      );
    }
  }, [isOpen]);

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || !results) return;

      const allItems = [
        ...results.assets.map((a) => ({ type: 'asset', id: a.id })),
        ...results.albums.map((a) => ({ type: 'album', id: a.id })),
        ...results.notes.map((n) => ({ type: 'note', id: n.id })),
      ];

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % allItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
      } else if (e.key === 'Enter' && allItems[selectedIndex]) {
        e.preventDefault();
        const item = allItems[selectedIndex];
        if (item.type === 'asset') {
          router.push(`/assets?id=${item.id}`);
        } else if (item.type === 'album') {
          router.push(`/albums/${item.id}`);
        } else if (item.type === 'note') {
          router.push(`/notes?id=${item.id}`);
        }
        onClose();
      }
    },
    [isOpen, results, selectedIndex, router, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const totalResults =
    (results?.assets.length || 0) + (results?.albums.length || 0) + (results?.notes.length || 0);

  return (
    <div ref={containerRef} style={{ display: 'none' }}>
      {/* 背景遮罩 */}
      <div
        ref={backdropRef}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
        style={{ opacity: 0 }}
      />

      {/* 搜索面板 */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 pointer-events-none">
        <div
          ref={panelRef}
          className="w-full max-w-3xl bg-background-secondary border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
          style={{ opacity: 0 }}
        >
          {/* 搜索输入 */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
            <Search size={24} className="text-primary" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索素材、相册、笔记..."
              className="flex-1 bg-transparent text-lg outline-none placeholder:text-foreground-tertiary"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              ESC
            </button>
          </div>

          {/* 搜索结果 */}
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="py-12 text-center text-foreground-secondary">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                搜索中...
              </div>
            )}

            {!loading && query && totalResults === 0 && (
              <div className="py-12 text-center text-foreground-secondary">
                <Search size={48} className="mx-auto mb-3 opacity-50" />
                <p>未找到相关结果</p>
              </div>
            )}

            {!loading && results && totalResults > 0 && (
              <div className="py-4">
                {/* 素材结果 */}
                {results.assets.length > 0 && (
                  <div className="mb-6">
                    <div className="px-6 py-2 text-sm text-foreground-secondary flex items-center gap-2">
                      <ImageIcon size={16} />
                      素材 ({results.assets.length})
                    </div>
                    {results.assets.map((asset, index) => (
                      <button
                        key={asset.id}
                        onClick={() => {
                          router.push(`/assets/${asset.id}`);
                          onClose();
                        }}
                        className={`w-full px-6 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors ${
                          selectedIndex === index ? 'bg-white/10' : ''
                        }`}
                      >
                        <img
                          src={
                            asset.thumbnail_url ||
                            asset.original_url ||
                            asset.thumbnail_path ||
                            asset.original_path
                          }
                          alt=""
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2 mb-1">
                            {asset.asset_type === 'video' && (
                              <Video size={16} className="text-accent-purple" />
                            )}
                            <span className="text-foreground">
                              {asset.location_poi || asset.location_city || '未知位置'}
                            </span>
                          </div>
                          <p className="text-sm text-foreground-secondary">
                            {new Date(asset.shot_at || asset.created_at).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                        <ArrowRight size={20} className="text-foreground-tertiary" />
                      </button>
                    ))}
                  </div>
                )}

                {/* 相册结果 */}
                {results.albums.length > 0 && (
                  <div className="mb-6">
                    <div className="px-6 py-2 text-sm text-foreground-secondary flex items-center gap-2">
                      <FolderOpen size={16} />
                      相册 ({results.albums.length})
                    </div>
                    {results.albums.map((album, index) => {
                      const globalIndex = results.assets.length + index;
                      return (
                        <button
                          key={album.id}
                          onClick={() => {
                            router.push(`/albums/${album.id}`);
                            onClose();
                          }}
                          className={`w-full px-6 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors ${
                            selectedIndex === globalIndex ? 'bg-white/10' : ''
                          }`}
                        >
                          <img
                            src={album.coverUrl}
                            alt={album.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div className="flex-1 text-left">
                            <div className="text-foreground mb-1">{album.name}</div>
                            <p className="text-sm text-foreground-secondary">
                              {album.assetCount} 张照片
                            </p>
                          </div>
                          <ArrowRight size={20} className="text-foreground-tertiary" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 笔记结果 */}
                {results.notes.length > 0 && (
                  <div>
                    <div className="px-6 py-2 text-sm text-foreground-secondary flex items-center gap-2">
                      <FileText size={16} />
                      笔记 ({results.notes.length})
                    </div>
                    {results.notes.map((note, index) => {
                      const globalIndex = results.assets.length + results.albums.length + index;
                      return (
                        <button
                          key={note.id}
                          onClick={() => {
                            router.push(`/notes?id=${note.id}`);
                            onClose();
                          }}
                          className={`w-full px-6 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors ${
                            selectedIndex === globalIndex ? 'bg-white/10' : ''
                          }`}
                        >
                          <div className="w-16 h-16 bg-gradient-to-br from-accent-purple to-accent-pink rounded-lg flex items-center justify-center">
                            <FileText size={32} className="text-white" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-foreground mb-1">{note.title}</div>
                            <p className="text-sm text-foreground-secondary line-clamp-1">
                              {note.content}
                            </p>
                          </div>
                          <ArrowRight size={20} className="text-foreground-tertiary" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {!loading && !query && (
              <div className="py-12 text-center text-foreground-secondary">
                <Search size={48} className="mx-auto mb-3 opacity-50" />
                <p>输入关键词开始搜索</p>
                <p className="text-sm mt-2 text-foreground-tertiary">
                  支持搜索素材、相册、笔记
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
