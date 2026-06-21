import PropTypes from 'prop-types';
import { Send } from 'lucide-react';
import { useState } from 'react';
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
    <section className="command-panel command-chat-panel" aria-labelledby="command-chat-title">
      <div className="command-panel-heading">
        <div>
          <span className="command-panel-kicker">Authenticated follow-up</span>
          <h2 id="command-chat-title">Market chat · {ticker || 'No ticker'}</h2>
        </div>
        <DataStamp source="Verified packet + per-user context" />
      </div>
      <div className="command-chat-thread" aria-live="polite">
        {messages.length === 0 && <p>Ask about the verified ticker packet, portfolio context, or analysis result.</p>}
        {messages.map((item, index) => (
          <div key={`${item.role}-${index}`} className={`command-chat-message ${item.role}`}>
            <span>{item.role === 'user' ? 'You' : 'CIO'}</span>
            <p>{item.content}</p>
          </div>
        ))}
        {loading && (
          <div className="command-chat-message assistant">
            <span>CIO</span>
            <p>Reviewing verified context...</p>
          </div>
        )}
      </div>
      <form className="command-chat-form" onSubmit={submit}>
        <label htmlFor="command-chat-message">Message</label>
        <div>
          <textarea id="command-chat-message" value={message} maxLength={1000} onChange={(event) => setMessage(event.target.value)} />
          <button className="btn-analyze" type="submit" disabled={loading} aria-label="Send message">
            <Send size={16} aria-hidden="true" />
          </button>
        </div>
        {error && (
          <div className="command-inline-error" role="alert">
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
