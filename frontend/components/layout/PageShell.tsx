import { cn } from '@/lib/utils/cn';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  /** 窄列（手机快传等） */
  narrow?: boolean;
}

/** 统一内容栏宽度与页边距；为移动底栏预留底部空间 */
export function PageShell({ children, className, narrow }: PageShellProps) {
  return (
    <div className={cn('min-h-screen py-10 px-4 sm:px-8 pb-24 md:pb-12', className)}>
      <div className={cn('mx-auto w-full', narrow ? 'max-w-xl' : 'max-w-[1400px]')}>
        {children}
      </div>
    </div>
  );
}
