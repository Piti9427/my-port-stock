import { cn } from '@/lib/utils';

export function EmptyState({ icon = null, title, description = null, action = null, onAction = null, className = '' }) {
  const actionLabel = typeof action === 'string' ? action : action?.label;
  const actionHandler = action && typeof action === 'object' ? action.onClick : onAction;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center border border-dashed border-neutral-800 rounded-xl bg-neutral-900/40 text-neutral-400',
        className
      )}
      role="status"
    >
      {icon && (
        <div className="mb-3 text-neutral-500" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="text-sm font-semibold text-neutral-200">{title}</div>
      {description && <div className="mt-1 text-xs text-neutral-400 max-w-sm">{description}</div>}
      {actionLabel && (
        <button
          className="mt-4 px-3 py-1.5 text-xs font-semibold rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white transition-colors"
          type="button"
          onClick={actionHandler}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
