'use client';

import { useState, useEffect } from 'react';
import { DockNavigation } from '@/components/layout/DockNavigation';
import { SpotlightSearch } from '@/components/search/SpotlightSearch';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K 或 Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      // / 键
      if (e.key === '/' && !searchOpen) {
        const target = e.target as HTMLElement;
        // 如果焦点在输入框，不触发
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setSearchOpen(true);
        }
      }
      // ESC 键
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  return (
    <div className="relative min-h-screen">
      {children}
      <DockNavigation />
      <SpotlightSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
