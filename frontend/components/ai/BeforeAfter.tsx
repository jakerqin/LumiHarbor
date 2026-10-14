'use client';

interface BeforeAfterProps {
  before: string;
  after: string;
}

function Figure({ src, label }: { src: string; label: string }) {
  return (
    <figure className="min-w-0">
      <a href={src} target="_blank" rel="noreferrer" title="在新标签页查看大图"
        className="block rounded-xl bg-black/30 overflow-hidden">
        <img src={src} alt={label} className="block w-full h-[38vh] sm:h-[52vh] object-contain" />
      </a>
      <figcaption className="mt-2 text-xs text-center text-foreground-secondary">{label}</figcaption>
    </figure>
  );
}

/** 修图前后并排对比：两张都完整显示（窄屏上下排），点图看大图 */
export function BeforeAfter({ before, after }: BeforeAfterProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Figure src={before} label="修改前" />
      <Figure src={after} label="修改后" />
    </div>
  );
}
