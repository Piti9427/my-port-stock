import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function KeyboardShortcuts() {
  const navigate = useNavigate();
  const [keySequence, setKeySequence] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) {
        return;
      }

      const key = e.key.toLowerCase();

      // Global quick shortcuts
      if (e.key === '?') {
        setShowHelp((prev) => !prev);
        return;
      }

      if (e.key === 'escape' && showHelp) {
        setShowHelp(false);
        return;
      }

      setKeySequence((prev) => {
        const nextSequence = prev + key;

        // Handle sequences
        switch (nextSequence) {
          case 'gd':
            navigate('/');
            break;
          case 'gr':
            navigate('/risk');
            break;
          case 'gm':
            navigate('/market');
            break;
          case 'ga':
            navigate('/command-center');
            break;
          case 'gj':
            navigate('/journal');
            break;
          case 'gv':
            navigate('/analytics');
            break;
          case 'gc':
            navigate('/config');
            break;
          default:
            // If it's the start of a sequence ('g'), keep it. Otherwise, clear.
            return key === 'g' ? 'g' : '';
        }

        // Clear sequence if matched
        return '';
      });
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showHelp]);

  // Clear sequence automatically after 1.5 seconds to prevent stuck states
  useEffect(() => {
    if (keySequence) {
      const timer = setTimeout(() => setKeySequence(''), 1500);
      return () => clearTimeout(timer);
    }
  }, [keySequence]);

  if (!showHelp) return null;

  const Kbd = ({ children }) => (
    <kbd
      style={{
        background: 'var(--surface)',
        padding: '2px 8px',
        borderRadius: '4px',
        border: '1px solid var(--border-subtle)',
        fontFamily: 'monospace',
        fontSize: '0.85rem',
      }}
    >
      {children}
    </kbd>
  );

  return (
    <div className="shortcut-backdrop" onClick={() => setShowHelp(false)}>
      <div className="glass-card shortcut-dialog" onClick={(e) => e.stopPropagation()}>
        <h3
          style={{
            marginBottom: '20px',
            color: 'var(--text-primary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          Keyboard Shortcuts
          <button
            onClick={() => setShowHelp(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '1.2rem',
            }}
          >
            &times;
          </button>
        </h3>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          <li
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Dashboard</span>{' '}
            <span>
              <Kbd>g</Kbd> <Kbd>d</Kbd>
            </span>
          </li>
          <li
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Risk</span>{' '}
            <span>
              <Kbd>g</Kbd> <Kbd>r</Kbd>
            </span>
          </li>
          <li
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Market</span>{' '}
            <span>
              <Kbd>g</Kbd> <Kbd>m</Kbd>
            </span>
          </li>
          <li
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Command Center</span>{' '}
            <span>
              <Kbd>g</Kbd> <Kbd>a</Kbd>
            </span>
          </li>
          <li
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Journal</span>{' '}
            <span>
              <Kbd>g</Kbd> <Kbd>j</Kbd>
            </span>
          </li>
          <li
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Analytics</span>{' '}
            <span>
              <Kbd>g</Kbd> <Kbd>v</Kbd>
            </span>
          </li>
          <li
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Config</span>{' '}
            <span>
              <Kbd>g</Kbd> <Kbd>c</Kbd>
            </span>
          </li>
          <li
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '12px',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '16px',
            }}
          >
            <span>Show Help</span> <Kbd>?</Kbd>
          </li>
        </ul>
      </div>
    </div>
  );
}
