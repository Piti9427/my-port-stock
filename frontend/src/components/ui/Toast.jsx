import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';

const EXIT_DURATION_MS = 150;

export function Toast({ message, undoAction, onDismiss, duration = 5000 }) {
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
    <output className={`ui-toast${isExiting ? ' is-exiting' : ''}`} aria-live="polite">
      <span className="ui-toast-message">{message}</span>
      {undoAction && (
        <button className="ui-toast-action" type="button" onClick={undoAction}>
          <RotateCcw size={12} aria-hidden="true" />
          Undo
        </button>
      )}
      {onDismiss && (
        <button className="ui-toast-dismiss" type="button" onClick={beginDismiss} aria-label="Dismiss notification">
          <X size={12} aria-hidden="true" />
        </button>
      )}
      {duration > 0 && (
        <span
          className="ui-toast-progress"
          role="progressbar"
          aria-label="Notification timeout"
          aria-valuemin="0"
          aria-valuemax="100"
          style={{ '--toast-duration': `${duration}ms` }}
        />
      )}
    </output>
  );
}
