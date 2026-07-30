import { cn } from '@/lib/utils';

export function EmptyState({ icon = null, title, description = null, action = null, onAction = null, className = '' }) {
  const actionLabel = typeof action === 'string' ? action : action?.label;
  const actionHandler = action && typeof action === 'object' ? action.onClick : onAction;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface p-8 text-center text-text-secondary',
        className
      )}
      role="status"
    >
      {icon && (
        <div className="mb-3 text-text-muted" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {description && <div className="mt-1 max-w-sm text-xs text-text-secondary">{description}</div>}
      {actionLabel && (
        <button
          className="mt-4 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-hover"
          type="button"
          onClick={actionHandler}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
