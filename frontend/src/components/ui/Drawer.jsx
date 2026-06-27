import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export function Drawer({ open, onClose, title, width = '480px', children }) {
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
    <div className="ui-drawer-root">
      <div className="ui-drawer-backdrop" tabIndex={-1} aria-hidden="true" onClick={onClose} />
      <aside
        ref={drawerRef}
        className="ui-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ width }}
        onKeyDown={handleKeyDown}
      >
        <header className="ui-drawer-header">
          <h2 id={titleId}>{title}</h2>
          <button ref={closeButtonRef} className="ui-icon-button" type="button" onClick={onClose} aria-label="Close drawer">
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        <div className="ui-drawer-body">{children}</div>
      </aside>
    </div>
  );
}
