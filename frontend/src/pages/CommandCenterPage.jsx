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

  const { tradeOpen, setTradeOpen } = state;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable) {
        return;
      }
      if (event.key.toLowerCase() === 't' && !tradeOpen) {
        event.preventDefault();
        setTradeOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tradeOpen, setTradeOpen]);

  return (
    <div className="mx-auto grid min-h-0 w-full max-w-[1320px] flex-auto content-start gap-5 overflow-y-auto px-7 py-6 max-[768px]:h-auto max-[768px]:overflow-y-visible max-[640px]:p-4">
      <header className="[min-width:0] [display:grid] [grid-template-columns:auto_minmax(280px,_520px)] [align-items:end] [justify-content:space-between] [gap:var(--space-5)] [padding-bottom:var(--space-5)] [border-bottom:1px_solid_var(--border-subtle)] max-[900px]:[grid-template-columns:minmax(0,_1fr)] max-[900px]:[align-items:stretch]">
        <div
          className="[display:inline-grid] [grid-auto-flow:column] [grid-auto-columns:minmax(0,_1fr)] [border:1px_solid_var(--border-subtle)] [border-radius:var(--radius-xs)] [background:var(--bg-panel-solid)] [overflow:hidden] [&_button]:[min-height:40px] [&_button]:[border:0] [&_button]:[border-right:1px_solid_var(--border-subtle)] [&_button]:[background:transparent] [&_button]:[color:var(--text-secondary)] [&_button]:[padding:0_var(--space-3)] [&_button]:[cursor:pointer] [&_button]:[font:inherit] [&_button]:[font-size:0.78rem] [&_button]:[font-weight:700] [&_button]:[transition:background-color_0.15s_var(--ease-out-quart),_color_0.15s_var(--ease-out-quart)] [&_button:last-child]:[border-right:0] [&_button[aria-selected='true']]:[background:rgba(var(--brand-rgb),_0.12)] [&_button[aria-selected='true']]:[color:var(--brand-primary)] max-[900px]:[justify-self:start]"
          role="tablist"
          aria-label="Command Center mode"
        >
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
            <div
              className="text-balance [border:1px_solid_rgba(var(--status-warning-rgb),_0.38)] [color:var(--fin-warning)] [padding:var(--space-3)] [font-size:0.78rem] [line-height:1.45] [color:var(--fin-loss)] [font-size:0.76rem] [line-height:1.45] max-[640px]:[align-items:flex-start] max-[640px]:[flex-direction:column] max-[640px]:[gap:10px] [display:flex] [align-items:center] [gap:10px] [padding:12px_16px] [background:var(--fin-loss-dim)] [border:1px_solid_rgba(var(--status-danger-rgb),_0.3)] [border-radius:var(--radius-sm)] [font-size:0.85rem] [color:var(--text-primary)] [animation:fadeInDown_0.3s_ease] [&_strong]:[color:var(--fin-loss)]"
              role="alert"
            >
              {state.chatError}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="[display:grid] [grid-template-columns:minmax(280px,_340px)_minmax(0,_1fr)] [align-items:start] [gap:var(--space-5)] max-[900px]:[grid-template-columns:minmax(0,_1fr)]">
            <aside className="[min-width:0] [display:grid] [gap:var(--space-5)]">
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
                <div
                  className="text-balance [border:1px_solid_rgba(var(--status-warning-rgb),_0.38)] [color:var(--fin-warning)] [padding:var(--space-3)] [font-size:0.78rem] [line-height:1.45] [color:var(--fin-loss)] [font-size:0.76rem] [line-height:1.45] max-[640px]:[align-items:flex-start] max-[640px]:[flex-direction:column] max-[640px]:[gap:10px] [display:flex] [align-items:center] [gap:10px] [padding:12px_16px] [background:var(--fin-loss-dim)] [border:1px_solid_rgba(var(--status-danger-rgb),_0.3)] [border-radius:var(--radius-sm)] [font-size:0.85rem] [color:var(--text-primary)] [animation:fadeInDown_0.3s_ease] [&_strong]:[color:var(--fin-loss)]"
                  role="alert"
                >
                  {state.analysisError}
                </div>
              )}
            </aside>
            <div className="[min-width:0] [display:grid] [gap:var(--space-5)] [align-content:start]">
              <AgentResults agentStates={state.events.agentStates || {}} analysis={state.analysis} loading={state.analysisLoading} />
              {state.analysis?.deep_analysis && (
                <section className="min-w-0 overflow-hidden rounded-md border border-border-subtle bg-panel p-5">
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
