import type { Metadata } from 'next';
import { Providers } from './providers';
import ParticleBackground from '@/components/background/ParticleBackground';
import './globals.css';

export const metadata: Metadata = {
  title: 'LumiHarbor - 拾光坞',
  description: '收集时光碎片，归航家庭港湾。个人与家庭足迹记忆管理系统。',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased bg-background text-foreground">
        <ParticleBackground />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
