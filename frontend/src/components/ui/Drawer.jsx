import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Drawer({ open, onClose, title, width = '480px', children, className = '' }) {
  const titleId = useId();
  const closeButtonRef = useRef(null);
  const drawerRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    const frame = requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      cancelAnimationFrame(frame);
      const previousFocus = previousFocusRef.current;
      requestAnimationFrame(() => previousFocus?.focus());
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      drawerRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
      ) || []
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-overlay transition-opacity" tabIndex={-1} aria-hidden="true" onClick={onClose} />
      <aside
        ref={drawerRef}
        className={cn(
          'relative z-50 flex h-full w-full max-w-full flex-col overflow-hidden border-l border-border bg-surface text-foreground animate-in slide-in-from-right duration-200 sm:w-[var(--drawer-width)]',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={
          /** @type {import('react').CSSProperties & Record<`--${string}`, string>} */ ({
            '--drawer-width': width,
          })
        }
        onKeyDown={handleKeyDown}
      >
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id={titleId} className="text-base font-bold text-foreground">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            className="rounded p-1 text-text-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </aside>
    </div>
  );
}
