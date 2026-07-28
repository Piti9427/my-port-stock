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
        'relative flex items-center gap-3 px-4 py-3 border border-neutral-700 bg-neutral-900 text-neutral-100 text-xs rounded-lg shadow-xl overflow-hidden transition-all duration-150',
        isExiting && 'is-exiting opacity-0 translate-y-1 scale-95',
        className
      )}
      aria-live="polite"
    >
      <span className="font-medium">{message}</span>
      {undoAction && (
        <button
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors ml-auto"
          type="button"
          onClick={undoAction}
        >
          <RotateCcw size={12} aria-hidden="true" />
          Undo
        </button>
      )}
      {onDismiss && (
        <button
          className="p-1 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded transition-colors ml-auto"
          type="button"
          onClick={beginDismiss}
          aria-label="Dismiss notification"
        >
          <X size={12} aria-hidden="true" />
        </button>
      )}
      {duration > 0 && (
        <span
          className="absolute bottom-0 left-0 h-0.5 bg-emerald-500 origin-left animate-toast-progress"
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
