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
import { cn } from '@/lib/utils';

export default function CommandCenterPage() {
  const state = useCommandCenter();
  const snapshot = state.analysis?.decision_snapshot || {};
  const { tradeOpen, setTradeOpen } = state;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable) return;
      if (event.key.toLowerCase() === 't' && !tradeOpen) {
        event.preventDefault();
        setTradeOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tradeOpen, setTradeOpen]);

  return (
    <div className="command-center-page command-workspace flex-1 min-h-0 p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full bg-neutral-950 text-neutral-100">
      <header className="command-workspace-header p-4 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex p-1 bg-neutral-900 rounded-lg border border-neutral-800" role="tablist" aria-label="Command Center mode">
          <button
            type="button"
            role="tab"
            aria-selected={state.workspaceMode === 'analysis'}
            className={cn(
              'px-4 py-1.5 text-xs font-semibold rounded-md transition-colors',
              state.workspaceMode === 'analysis' ? 'bg-emerald-500 text-neutral-950' : 'text-neutral-400 hover:text-neutral-200'
            )}
            aria-label="วิเคราะห์ mode"
            onClick={() => state.setWorkspaceMode('analysis')}
          >
            วิเคราะห์
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={state.workspaceMode === 'chat'}
            className={cn(
              'px-4 py-1.5 text-xs font-semibold rounded-md transition-colors',
              state.workspaceMode === 'chat' ? 'bg-emerald-500 text-neutral-950' : 'text-neutral-400 hover:text-neutral-200'
            )}
            onClick={() => state.setWorkspaceMode('chat')}
          >
            สนทนา
          </button>
        </div>
        <TickerInput value={state.searchTicker} onChange={state.setSearchTicker} onSearch={state.loadQuote} loading={state.quoteLoading} />
      </header>

      {state.workspaceMode === 'chat' ? (
        <>
          <ChatPanel ticker={state.ticker} messages={state.chatMessages} loading={state.chatLoading} onSend={state.sendChat} />
          {state.chatError && (
            <div className="p-3 border border-rose-500/30 bg-rose-500/10 text-rose-300 rounded-lg text-xs font-mono" role="alert">
              {state.chatError}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="command-progressive-grid grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            <aside className="command-setup-column flex flex-col gap-4">
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
                <div className="p-3 border border-rose-500/30 bg-rose-500/10 text-rose-300 rounded-lg text-xs font-mono" role="alert">
                  {state.analysisError}
                </div>
              )}
            </aside>
            <div className="command-results-column flex flex-col gap-6">
              <AgentResults agentStates={state.events.agentStates || {}} analysis={state.analysis} loading={state.analysisLoading} />
              {state.analysis?.deep_analysis && (
                <section className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm">
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
        currentHolding={state.analysis?.packet?.portfolio_context?.holdings_rows?.[0] || null}
        onClose={() => state.setTradeOpen(false)}
        onSubmit={state.recordTrade}
        saving={state.tradeSaving}
        serverError={state.tradeError}
      />
    </div>
  );
}
