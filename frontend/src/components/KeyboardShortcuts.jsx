import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  return <kbd className="shortcut-kbd">{children}</kbd>;
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
    <div className="shortcut-backdrop" onClick={closeHelp}>
      <div
        className="glass-card shortcut-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shortcut-dialog-header">
          <h2 id={titleId}>Keyboard Shortcuts</h2>
          <button ref={closeButtonRef} className="ui-icon-button" type="button" onClick={closeHelp} aria-label="Close keyboard shortcuts">
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        <ul className="shortcut-list">
          {HELP_SHORTCUTS.map((shortcut) => (
            <li className="shortcut-row" key={shortcut.label}>
              <span>{shortcut.label}</span>
              <span className="shortcut-keys">
                {shortcut.keys.map((key) => (
                  <ShortcutKbd key={key}>{key}</ShortcutKbd>
                ))}
              </span>
            </li>
          ))}
          <li className="shortcut-row shortcut-row-help">
            <span>Show Help</span>
            <ShortcutKbd>?</ShortcutKbd>
          </li>
        </ul>
      </div>
    </div>
  );
}
