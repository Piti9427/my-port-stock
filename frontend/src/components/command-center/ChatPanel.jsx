import PropTypes from 'prop-types';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils.js';
import { DataStamp } from '../ui/DataStamp.jsx';

export function ChatPanel({ ticker, messages = [], loading = false, onSend }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!ticker) {
      setError('Load a ticker before starting market chat.');
      return;
    }
    if (!trimmed || trimmed.length > 1000) {
      setError('Message must be between 1 and 1,000 characters.');
      return;
    }
    setError('');
    onSend(trimmed);
    setMessage('');
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-md border border-border-subtle bg-panel p-5" aria-labelledby="command-chat-title">
      <div className="mb-0.5 text-[0.95rem] font-semibold text-foreground">
        <div>
          <span className="[color:var(--text-secondary)] font-mono [font-size:0.68rem] [text-transform:uppercase]">Authenticated follow-up</span>
          <h2 id="command-chat-title">Market chat · {ticker || 'No ticker'}</h2>
        </div>
        <DataStamp source="Verified packet + per-user context" />
      </div>
      <div
        className="[min-height:360px] [max-height:60vh] [display:grid] [align-content:start] [gap:var(--space-3)] [overflow-y:auto] [padding:var(--space-4)_0] [border-top:1px_solid_var(--border-subtle)] [border-bottom:1px_solid_var(--border-subtle)] [&_>_p]:[color:var(--text-secondary)] [&_>_p]:[font-size:0.8rem]"
        aria-live="polite"
      >
        {messages.length === 0 && <p>Ask about the verified ticker packet, portfolio context, or analysis result.</p>}
        {messages.map((item, index) => (
          <div
            key={`${item.role}-${index}`}
            className={cn(
              'max-w-[78%] border-l-2 border-border-medium bg-panel-solid p-3 max-[560px]:max-w-[92%] [&_p]:mt-1 [&_p]:text-[0.82rem] [&_p]:leading-relaxed [&_p]:text-foreground [&_span]:text-[0.68rem] [&_span]:uppercase [&_span]:text-text-secondary',
              item.role === 'user' && 'justify-self-end border-l-brand'
            )}
          >
            <span>{item.role === 'user' ? 'You' : 'CIO'}</span>
            <p>{item.content}</p>
          </div>
        ))}
        {loading && (
          <div className="max-w-[78%] border-l-2 border-border-medium bg-panel-solid p-3 max-[560px]:max-w-[92%] [&_p]:mt-1 [&_p]:text-[0.82rem] [&_p]:leading-relaxed [&_p]:text-foreground [&_span]:text-[0.68rem] [&_span]:uppercase [&_span]:text-text-secondary">
            <span>CIO</span>
            <p>Reviewing verified context...</p>
          </div>
        )}
      </div>
      <form
        className="[display:grid] [gap:var(--space-4)] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:minmax(0,_1fr)_44px] [&_>_div]:[gap:var(--space-2)] [&_textarea]:[min-height:76px] [&_textarea]:[resize:vertical] [&_textarea]:[border:1px_solid_var(--border-subtle)] [&_textarea]:[background:var(--bg-panel-solid)] [&_textarea]:[color:var(--text-primary)] [&_textarea]:[padding:var(--space-3)]"
        onSubmit={submit}
      >
        <label htmlFor="command-chat-message">Message</label>
        <div>
          <textarea id="command-chat-message" value={message} maxLength={1000} onChange={(event) => setMessage(event.target.value)} />
          <button
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-transparent bg-brand px-5 py-3 font-sans text-sm font-bold tracking-wide text-text-inverse transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-hover disabled:text-text-secondary"
            type="submit"
            disabled={loading}
            aria-label="Send message"
          >
            <Send size={16} aria-hidden="true" />
          </button>
        </div>
        {error && (
          <div
            className="text-balance [border:1px_solid_rgba(var(--status-warning-rgb),_0.38)] [color:var(--fin-warning)] [padding:var(--space-3)] [font-size:0.78rem] [line-height:1.45] [color:var(--fin-loss)] [font-size:0.76rem] [line-height:1.45] max-[640px]:[align-items:flex-start] max-[640px]:[flex-direction:column] max-[640px]:[gap:10px] [display:flex] [align-items:center] [gap:10px] [padding:12px_16px] [background:var(--fin-loss-dim)] [border:1px_solid_rgba(var(--status-danger-rgb),_0.3)] [border-radius:var(--radius-sm)] [font-size:0.85rem] [color:var(--text-primary)] [animation:fadeInDown_0.3s_ease] [&_strong]:[color:var(--fin-loss)]"
            role="alert"
          >
            {error}
          </div>
        )}
      </form>
    </section>
  );
}

ChatPanel.propTypes = {
  ticker: PropTypes.string,
  messages: PropTypes.arrayOf(PropTypes.shape({ role: PropTypes.string, content: PropTypes.string })),
  loading: PropTypes.bool,
  onSend: PropTypes.func.isRequired,
};
