import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const EXIT_DURATION_MS = 150;

export function Toast({ message, undoAction = null, onDismiss = null, duration = 5000, className = '' }) {
  const [isExiting, setIsExiting] = useState(false);
  const dismissTimerRef = useRef(null);
  const exitingRef = useRef(false);

  const beginDismiss = useCallback(() => {
    if (!onDismiss || exitingRef.current) return;
    exitingRef.current = true;
    setIsExiting(true);
    dismissTimerRef.current = setTimeout(onDismiss, EXIT_DURATION_MS);
  }, [onDismiss]);

  useEffect(() => {
    if (!duration || !onDismiss) return undefined;
    const timer = setTimeout(beginDismiss, Math.max(0, duration - EXIT_DURATION_MS));
    return () => clearTimeout(timer);
  }, [beginDismiss, duration, onDismiss]);

  useEffect(
    () => () => {
      clearTimeout(dismissTimerRef.current);
    },
    []
  );

  return (
    <output
      className={cn(
        'relative flex items-center gap-3 overflow-hidden rounded-lg border border-border bg-surface px-4 py-3 text-xs text-foreground transition-all duration-150',
        isExiting && 'is-exiting opacity-0 translate-y-1 scale-95',
        className
      )}
      aria-live="polite"
    >
      <span className="font-medium">{message}</span>
      {undoAction && (
        <button
          className="ml-auto inline-flex items-center gap-1 rounded border border-fin-profit bg-fin-profit-dim px-2 py-1 text-xs font-semibold text-fin-profit transition-colors hover:border-border-hover"
          type="button"
          onClick={undoAction}
        >
          <RotateCcw size={12} aria-hidden="true" />
          Undo
        </button>
      )}
      {onDismiss && (
        <button
          className="ml-auto rounded p-1 text-text-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
          type="button"
          onClick={beginDismiss}
          aria-label="Dismiss notification"
        >
          <X size={12} aria-hidden="true" />
        </button>
      )}
      {duration > 0 && (
        <span
          className="absolute bottom-0 left-0 h-0.5 origin-left animate-toast-progress bg-fin-profit"
          role="progressbar"
          aria-label="Notification timeout"
          aria-valuemin={0}
          aria-valuemax={100}
          style={
            /** @type {import('react').CSSProperties & Record<`--${string}`, string>} */ ({
              '--toast-duration': `${duration}ms`,
            })
          }
        />
      )}
    </output>
  );
}
