import { useEffect } from 'react';
import { AgentResults } from '../components/command-center/AgentResults.jsx';
import { AnalysisControls } from '../components/command-center/AnalysisControls.jsx';
import { ChatPanel } from '../components/command-center/ChatPanel.jsx';
import { DecisionSnapshot } from '../components/command-center/DecisionSnapshot.jsx';
import { QuotePanel } from '../components/command-center/QuotePanel.jsx';
import { TickerInput } from '../components/command-center/TickerInput.jsx';
import { TradeTicket } from '../components/command-center/TradeTicket.jsx';
import DeepAnalysisTabs from '../components/DeepAnalysisTabs';
import { useCommandCenter } from '../hooks/useCommandCenter.js';

export default function CommandCenterPage() {
  const state = useCommandCenter();
  const snapshot = state.analysis?.decision_snapshot || {};

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable) {
        return;
      }
      if (event.key.toLowerCase() === 't' && !state.tradeOpen) {
        event.preventDefault();
        state.setTradeOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.tradeOpen, state.setTradeOpen]);

  return (
    <div className="command-center-page command-workspace">
      <header className="command-workspace-header">
        <div className="command-mode-toggle" role="tablist" aria-label="Command Center mode">
          <button
            type="button"
            role="tab"
            aria-selected={state.workspaceMode === 'analysis'}
            aria-label="วิเคราะห์ mode"
            onClick={() => state.setWorkspaceMode('analysis')}
          >
            วิเคราะห์
          </button>
          <button type="button" role="tab" aria-selected={state.workspaceMode === 'chat'} onClick={() => state.setWorkspaceMode('chat')}>
            สนทนา
          </button>
        </div>
        <TickerInput value={state.searchTicker} onChange={state.setSearchTicker} onSearch={state.loadQuote} loading={state.quoteLoading} />
      </header>

      {state.workspaceMode === 'chat' ? (
        <>
          <ChatPanel ticker={state.ticker} messages={state.chatMessages} loading={state.chatLoading} onSend={state.sendChat} />
          {state.chatError && (
            <div className="command-inline-error" role="alert">
              {state.chatError}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="command-progressive-grid">
            <aside className="command-setup-column">
              <QuotePanel
                quote={state.quote}
                loading={state.quoteLoading}
                error={state.quoteError}
                onRetry={state.ticker ? () => state.loadQuote(state.ticker) : undefined}
              />
              <AnalysisControls
                ticker={state.ticker}
                decisionMode={state.decisionMode}
                onDecisionModeChange={state.setDecisionMode}
                onAnalyze={state.runAnalysis}
                loading={state.analysisLoading}
              />
              {state.analysisError && (
                <div className="command-inline-error" role="alert">
                  {state.analysisError}
                </div>
              )}
            </aside>
            <div className="command-results-column">
              <AgentResults agentStates={state.events.agentStates || {}} analysis={state.analysis} loading={state.analysisLoading} />
              {state.analysis?.deep_analysis && (
                <section className="command-panel command-deep-analysis">
                  <DeepAnalysisTabs deepAnalysis={state.analysis.deep_analysis} fallbackAnalysis={state.analysis.analysis} />
                </section>
              )}
            </div>
          </div>
          <DecisionSnapshot
            ticker={state.ticker}
            snapshot={snapshot}
            onOpenTicker={() => state.navigate(`/ticker/${encodeURIComponent(state.ticker)}`)}
            onLogTrade={() => state.setTradeOpen(true)}
          />
        </>
      )}

      <TradeTicket
        open={state.tradeOpen}
        ticker={state.ticker}
        decisionMode={state.decisionMode}
        quotePrice={Number(state.quote?.last_price) || undefined}
        currentHolding={
          state.analysis?.adaptive_drilldown?.portfolio_journal?.portfolio_context?.holdings_rows?.[0] ||
          state.analysis?.packet?.portfolio_context?.holdings_rows?.[0] ||
          null
        }
        onClose={() => state.setTradeOpen(false)}
        onSubmit={state.recordTrade}
        saving={state.tradeSaving}
        serverError={state.tradeError}
      />
    </div>
  );
}
