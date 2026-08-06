'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { DomeGalleryContainer } from '@/components/home/DomeGalleryContainer';
import BlurText from '@/components/animations/BlurText';
import TextType from '@/components/animations/TextType';
import ParticleBackground from '@/components/background/ParticleBackground';

const Timeline = dynamic(
  () => import('@/components/home/Timeline').then((mod) => mod.Timeline),
  {
    loading: () => (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-12">
        <div className="h-8 w-40 rounded bg-background-tertiary animate-pulse mb-8" />
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-background-secondary animate-pulse" />
          ))}
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  return (
    <main className="w-full pb-24 md:pb-0">
      {/* 粒子仅首页，降低其它页首屏成本 */}
      <ParticleBackground particleCount={90} speed={0.08} particleBaseSize={80} />

      <section className="w-full pt-16 pb-12 px-4 sm:px-8 min-h-[85vh]">
        <div className="max-w-[1400px] mx-auto">
          <div className="mb-10 max-w-xl">
            <BlurText
              text="拾光坞"
              className="text-page font-heading mb-3 text-primary"
              delay={80}
              animateBy="letters"
              direction="top"
              stepDuration={0.5}
            />
            <TextType
              text={[
                '光影流转，岁月留痕',
                '那些走过的路，都藏在这里',
                '每一刻，都值得珍藏',
              ]}
              className="text-lg text-foreground-secondary"
              typingSpeed={75}
              showCursor={true}
              cursorCharacter="_"
            />
          </div>
          <DomeGalleryContainer />
        </div>
      </section>

      <section className="w-full py-14 px-4 sm:px-8 bg-background-secondary">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="max-w-md">
            <h2 className="text-section font-heading mb-2">足迹地图</h2>
            <p className="text-foreground-secondary">探索你走过的每一个角落</p>
          </div>
          <Link
            href="/map"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover text-sm transition-colors self-start sm:self-auto"
          >
            打开地图
          </Link>
        </div>
      </section>

      <section className="w-full py-14">
        <Timeline />
      </section>
    </main>
  );
}
