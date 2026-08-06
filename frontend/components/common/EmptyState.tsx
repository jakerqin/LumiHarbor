import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface EmptyAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: EmptyAction;
  secondaryAction?: EmptyAction;
  className?: string;
}

function ActionButton({ action, primary }: { action: EmptyAction; primary?: boolean }) {
  const className = cn(
    'inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm transition-colors',
    primary
      ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
      : 'bg-background-secondary border border-white/10 hover:bg-background-tertiary text-foreground'
  );

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
}

/** 空态：说明 + 引导动作，避免只剩一行「暂无」 */
export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex items-center justify-center py-20 px-4', className)}>
      <div className="text-center max-w-sm">
        <p className="text-card-title font-heading text-foreground mb-2">{title}</p>
        {description ? (
          <p className="text-sm text-foreground-secondary text-pretty mb-6">{description}</p>
        ) : (
          <div className="mb-6" />
        )}
        {(action || secondaryAction) && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {action ? <ActionButton action={action} primary /> : null}
            {secondaryAction ? <ActionButton action={secondaryAction} /> : null}
          </div>
        )}
      </div>
    </div>
  );
}
