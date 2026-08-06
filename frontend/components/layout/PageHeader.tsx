import { cn } from '@/lib/utils/cn';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/** 列表页页头：标题 + 一句说明 + 右侧操作，不在标题旁贴大图标 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-page font-heading mb-1">{title}</h1>
        {description ? (
          <p className="text-foreground-secondary max-w-prose text-pretty">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>
      ) : null}
    </div>
  );
}
