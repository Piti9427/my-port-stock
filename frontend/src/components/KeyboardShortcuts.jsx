import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { X } from 'lucide-react';
import PropTypes from 'prop-types';

const HELP_SHORTCUTS = [
  { label: 'Dashboard', keys: ['g', 'd'] },
  { label: 'Risk', keys: ['g', 'r'] },
  { label: 'Market', keys: ['g', 'm'] },
  { label: 'Command Center', keys: ['g', 'a'] },
  { label: 'Journal', keys: ['g', 'j'] },
  { label: 'Analytics', keys: ['g', 'v'] },
  { label: 'Command Palette', keys: ['Cmd+K'] },
  { label: 'Config', keys: ['g', 'c'] },
];

const SEQUENCE_ROUTES = {
  gd: '/',
  gr: '/risk',
  gm: '/market',
  ga: '/command-center',
  gj: '/journal',
  gv: '/analytics',
  gc: '/config',
};

function ShortcutKbd({ children }) {
  return <kbd className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-sm">{children}</kbd>;
}

ShortcutKbd.propTypes = {
  children: PropTypes.node.isRequired,
};

export default function KeyboardShortcuts() {
  const navigate = useNavigate();
  const titleId = useId();
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const sequenceRef = useRef('');
  const sequenceTimerRef = useRef(null);
  const [showHelp, setShowHelp] = useState(false);

  const openHelp = useCallback(() => {
    previousFocusRef.current = document.activeElement;
    setShowHelp(true);
  }, []);

  const closeHelp = useCallback(() => {
    setShowHelp(false);
    requestAnimationFrame(() => previousFocusRef.current?.focus());
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === '?') {
        event.preventDefault();
        if (showHelp) closeHelp();
        else openHelp();
        return;
      }

      if (key === 'escape' && showHelp) {
        event.preventDefault();
        closeHelp();
        return;
      }

      if (key === 'tab' && showHelp) {
        event.preventDefault();
        closeButtonRef.current?.focus();
        return;
      }

      const nextSequence = sequenceRef.current + key;
      const target = SEQUENCE_ROUTES[nextSequence];
      sequenceRef.current = target ? '' : key === 'g' ? 'g' : '';

      clearTimeout(sequenceTimerRef.current);
      if (sequenceRef.current) {
        sequenceTimerRef.current = setTimeout(() => {
          sequenceRef.current = '';
        }, 1500);
      }

      if (target) navigate(target);
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown);
      clearTimeout(sequenceTimerRef.current);
    };
  }, [closeHelp, navigate, openHelp, showHelp]);

  useEffect(() => {
    if (!showHelp) return undefined;
    const frame = requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [showHelp]);

  if (!showHelp) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-overlay p-5" onClick={closeHelp}>
      <div
        className="w-full max-w-[420px] rounded-md border border-border bg-surface-elevated p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-5 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-base text-foreground">
            Keyboard Shortcuts
          </h2>
          <button
            ref={closeButtonRef}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-surface text-text-secondary transition-colors hover:border-border-hover hover:text-foreground"
            type="button"
            onClick={closeHelp}
            aria-label="Close keyboard shortcuts"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        <ul className="m-0 flex list-none flex-col gap-3 p-0 text-text-secondary">
          {HELP_SHORTCUTS.map((shortcut) => (
            <li className="flex items-center justify-between gap-4" key={shortcut.label}>
              <span>{shortcut.label}</span>
              <span className="flex items-center gap-1">
                {shortcut.keys.map((key) => (
                  <ShortcutKbd key={key}>{key}</ShortcutKbd>
                ))}
              </span>
            </li>
          ))}
          <li className="mt-3 flex items-center justify-between gap-4 border-t border-border pt-4">
            <span>Show Help</span>
            <ShortcutKbd>?</ShortcutKbd>
          </li>
        </ul>
      </div>
    </div>
  );
}
