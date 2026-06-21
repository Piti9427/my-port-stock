import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TickerInput } from '../src/components/command-center/TickerInput.jsx';
import { QuotePanel } from '../src/components/command-center/QuotePanel.jsx';
import { AnalysisControls } from '../src/components/command-center/AnalysisControls.jsx';
import { AgentResults } from '../src/components/command-center/AgentResults.jsx';
import { DecisionSnapshot } from '../src/components/command-center/DecisionSnapshot.jsx';
import { TradeTicket } from '../src/components/command-center/TradeTicket.jsx';

describe('Command Center panels', () => {
  it('normalizes valid tickers and rejects malformed values', () => {
    const onSearch = vi.fn();
    const { rerender } = render(<TickerInput value="" onChange={() => {}} onSearch={onSearch} />);

    fireEvent.change(screen.getByLabelText('Ticker symbol'), { target: { value: 'drop table' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Ticker search' }));
    expect(screen.getByRole('alert')).toHaveTextContent('valid ticker');
    expect(onSearch).not.toHaveBeenCalled();

    rerender(<TickerInput value="tsm" onChange={() => {}} onSearch={onSearch} />);
    fireEvent.submit(screen.getByRole('form', { name: 'Ticker search' }));
    expect(onSearch).toHaveBeenCalledWith('TSM');
  });

  it('labels quote trust and gate status without implying execution readiness', () => {
    const { rerender } = render(<QuotePanel quote={{ last_price: 150, price_sources: ['Yahoo Finance'], current_price_acceptance_gate: 'fail' }} />);
    expect(screen.getByText(/Display quote only/i)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Price gate: FAIL');

    rerender(<QuotePanel quote={{ last_price: 150, price_sources: ['Yahoo', 'Nasdaq'], current_price_acceptance_gate: 'pass' }} />);
    expect(screen.getByText(/Gate-passed quote/i)).toBeInTheDocument();
    expect(screen.getByText(/Price gate: PASS/i)).toBeInTheDocument();
  });

  it('renders per-source quote delay metadata without crashing', () => {
    render(
      <QuotePanel
        quote={{
          ticker: 'TSM',
          last_price: 462.12,
          price_sources: ['Yahoo Finance API', 'Finnhub API'],
          quote_delay_status: {
            'Yahoo Finance API': 'Yahoo session field',
            'Finnhub API': 'Real-time for US',
          },
          current_price_acceptance_gate: 'pass',
        }}
      />
    );

    expect(screen.getByText(/Yahoo Finance API: Yahoo session field/)).toBeInTheDocument();
    expect(screen.getByText(/Finnhub API: Real-time for US/)).toBeInTheDocument();
  });

  it('validates manual price before analysis', () => {
    const onAnalyze = vi.fn();
    render(<AnalysisControls ticker="NVDA" decisionMode="Swing Trade" onDecisionModeChange={() => {}} onAnalyze={onAnalyze} />);

    fireEvent.change(screen.getByLabelText('Manual Tier 1 price'), { target: { value: '-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'วิเคราะห์' }));
    expect(screen.getByRole('alert')).toHaveTextContent('positive number');
    expect(onAnalyze).not.toHaveBeenCalled();
  });

  it('shows streaming agent state and structured result tabs', () => {
    render(
      <AgentResults
        loading
        agentStates={{ 'fundamental-auditor': { state: 'TYPING', message: 'Reviewing fundamentals' } }}
        analysis={{ agent_results: { fundamental: { score: 7, reason: 'Healthy cash flow' } } }}
      />
    );

    expect(screen.getByRole('tab', { name: 'Fundamental' })).toBeInTheDocument();
    expect(screen.getByText('Reviewing fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Healthy cash flow')).toBeInTheDocument();
  });

  it('renders a decision snapshot with explicit next actions', () => {
    render(
      <DecisionSnapshot
        ticker="NVDA"
        snapshot={{ verdict: 'Wait', score: 6.2, gate_status: 'fail', one_line_reason: 'Gate failed', immediate_next_action: 'Confirm broker quote' }}
        onOpenTicker={() => {}}
        onLogTrade={() => {}}
      />
    );
    expect(screen.getByText('Wait')).toBeInTheDocument();
    expect(screen.getByText('Confirm broker quote')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log executed trade' })).toBeInTheDocument();
  });

  it('blocks an invalid executed trade record', () => {
    const onSubmit = vi.fn();
    render(<TradeTicket open ticker="NVDA" decisionMode="Swing Trade" onClose={() => {}} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Record executed trade' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
