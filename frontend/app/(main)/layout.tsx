'use client';

import { DockNavigation } from '@/components/layout/DockNavigation';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      {children}
      <DockNavigation />
    </div>
  );
}
