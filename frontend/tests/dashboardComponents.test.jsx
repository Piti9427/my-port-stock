import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { AIChatCard } from '../src/components/dashboard/AIChatCard.jsx';
import { HoldingsTable } from '../src/components/dashboard/HoldingsTable.jsx';
import { PortfolioSummary } from '../src/components/dashboard/PortfolioSummary.jsx';
import { QuickActions } from '../src/components/dashboard/QuickActions.jsx';
import { WatchlistPanel } from '../src/components/dashboard/WatchlistPanel.jsx';
import { ScenarioPlanner } from '../src/components/ScenarioPlanner.jsx';

const holdings = [
  {
    ticker: 'NVDA',
    name: 'NVIDIA',
    shares: 2,
    avg_cost: 80,
    price: 100,
    change: 2,
    changePct: 2.04,
    spark: [95, 97, 96, 100],
  },
  {
    ticker: 'TSM',
    name: 'TSMC',
    shares: 1,
    avg_cost: 220,
    price: 200,
    change: -5,
    changePct: -2.44,
    spark: [210, 208, 205, 200],
  },
];

describe('Dashboard extracted components', () => {
  test('PortfolioSummary makes total value the north-star metric with semantic P/L', () => {
    render(<PortfolioSummary holdings={holdings} source="Supabase holdings" stale />);

    expect(screen.getByRole('region', { name: /Portfolio summary/i })).toBeInTheDocument();
    expect(screen.getByText('฿400')).toHaveClass('font-mono');
    expect(screen.getByText('-฿1')).toHaveClass('text-fin-loss');
    expect(screen.getByText('+฿20')).toHaveClass('text-fin-profit');
    expect(screen.getByText('Supabase holdings')).toBeInTheDocument();
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });

  test('HoldingsTable supports sortable data, drilldown, and planner actions', () => {
    const onOpenTicker = vi.fn();
    const onPlan = vi.fn();
    render(<HoldingsTable holdings={holdings} status="OK" onOpenTicker={onOpenTicker} onPlan={onPlan} />);

    fireEvent.click(screen.getByRole('button', { name: /P\/L %/i }));
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('TSM');

    fireEvent.click(screen.getByRole('row', { name: /NVDA/ }));
    expect(onOpenTicker).toHaveBeenCalledWith('NVDA');

    fireEvent.click(screen.getByRole('button', { name: /วางแผน NVDA/i }));
    expect(onPlan).toHaveBeenCalledWith('NVDA');
  });

  test('HoldingsTable distinguishes unavailable and empty portfolio states', () => {
    const { rerender } = render(<HoldingsTable holdings={[]} status="INSUFFICIENT_DATA" />);
    expect(screen.getByText('Portfolio data unavailable')).toBeInTheDocument();

    rerender(<HoldingsTable holdings={[]} status="EMPTY" />);
    expect(screen.getByText('เริ่มต้นโดยเพิ่มหุ้นในพอร์ต')).toBeInTheDocument();
    expect(screen.getByText(/No portfolio data yet/)).toBeInTheDocument();
  });

  test('WatchlistPanel exposes ticker drilldown and quick analysis without card nesting', () => {
    const onOpenTicker = vi.fn();
    const onAnalyze = vi.fn();
    render(
      <WatchlistPanel
        items={[{ ticker: 'ASTS', name: 'AST SpaceMobile', price: 80, changePct: 2.5, spark: [76, 78, 80] }]}
        status="OK"
        onOpenTicker={onOpenTicker}
        onAnalyze={onAnalyze}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Open ASTS detail/i }));
    expect(onOpenTicker).toHaveBeenCalledWith('ASTS');

    fireEvent.click(screen.getByRole('button', { name: /วิเคราะห์ ASTS/i }));
    expect(onAnalyze).toHaveBeenCalledWith('ASTS');
  });

  test('AIChatCard validates and submits normalized ticker on Enter', () => {
    const onSubmit = vi.fn();
    render(<AIChatCard onSubmit={onSubmit} />);

    fireEvent.change(screen.getByRole('textbox', { name: /Ticker to analyze/i }), {
      target: { value: 'tsm' },
    });
    fireEvent.submit(screen.getByRole('form', { name: /AI quick ask/i }));
    expect(onSubmit).toHaveBeenCalledWith('TSM');

    fireEvent.change(screen.getByRole('textbox', { name: /Ticker to analyze/i }), {
      target: { value: '$invalid' },
    });
    fireEvent.submit(screen.getByRole('form', { name: /AI quick ask/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('Ticker must use letters, numbers, dots, or dashes');
  });

  test('QuickActions exposes the three dashboard commands', () => {
    const onAnalyze = vi.fn();
    const onLogTrade = vi.fn();
    const onAddWatchlist = vi.fn();
    render(<QuickActions onAnalyze={onAnalyze} onLogTrade={onLogTrade} onAddWatchlist={onAddWatchlist} />);

    fireEvent.click(screen.getByRole('button', { name: /วิเคราะห์หุ้น/i }));
    fireEvent.click(screen.getByRole('button', { name: /บันทึกเทรด/i }));
    fireEvent.click(screen.getByRole('button', { name: /เพิ่ม Watchlist/i }));

    expect(onAnalyze).toHaveBeenCalledOnce();
    expect(onLogTrade).toHaveBeenCalledOnce();
    expect(onAddWatchlist).toHaveBeenCalledOnce();
  });

  test('ScenarioPlanner uses Drawer, quick-fill, validation, and live risk/reward', () => {
    const onClose = vi.fn();
    render(<ScenarioPlanner open ticker="NVDA" onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: /NVDA Scenario Planner/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '฿25k' }));
    expect(screen.getByRole('spinbutton', { name: /งบซื้อเพิ่ม/i })).toHaveValue(25000);

    fireEvent.change(screen.getByRole('spinbutton', { name: /แนวรับ 1/i }), { target: { value: '100' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: /จุดตัดขาดทุน/i }), { target: { value: '90' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: /ราคาเป้าหมาย/i }), { target: { value: '120' } });
    expect(screen.getByText('1:2.0')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('spinbutton', { name: /ราคาเป้าหมาย/i }), { target: { value: '80' } });
    expect(screen.getByRole('alert')).toHaveTextContent('ราคาเป้าหมายต้องสูงกว่าจุดตัดขาดทุน');
  });

  test('ScenarioPlanner clears draft levels after closing and reopening', () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open planner
          </button>
          <ScenarioPlanner open={open} ticker="NVDA" onClose={() => setOpen(false)} />
        </>
      );
    }

    render(<Harness />);
    fireEvent.change(screen.getByRole('spinbutton', { name: /แนวรับ 1/i }), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close drawer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open planner' }));

    expect(screen.getByRole('spinbutton', { name: /แนวรับ 1/i })).toHaveValue(null);
  });
});
