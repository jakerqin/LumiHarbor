'use client';

import { DockNavigation } from '@/components/layout/DockNavigation';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      {children}
      <DockNavigation />
      <MobileBottomNav />
    </div>
  );
}
