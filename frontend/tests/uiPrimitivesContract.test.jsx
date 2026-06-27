import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DataStamp } from '../src/components/ui/DataStamp.jsx';
import { DataTable } from '../src/components/ui/DataTable.jsx';
import { Drawer } from '../src/components/ui/Drawer.jsx';
import { EmptyState } from '../src/components/ui/EmptyState.jsx';
import { MetricCard } from '../src/components/ui/MetricCard.jsx';
import { Skeleton } from '../src/components/ui/Skeleton.jsx';
import { StatusBadge } from '../src/components/ui/StatusBadge.jsx';
import { Toast } from '../src/components/ui/Toast.jsx';
import { Tooltip } from '../src/components/ui/Tooltip.jsx';

afterEach(() => {
  vi.useRealTimers();
});

describe('shared UI primitives contract', () => {
  test('MetricCard renders value, semantic change, and data stamp', () => {
    render(<MetricCard label="Total Portfolio Value" value="฿1,234" change="+2.4%" changeType="positive" dataStamp="Supabase holdings" />);

    expect(screen.getByText('Total Portfolio Value')).toBeInTheDocument();
    expect(screen.getByText('฿1,234')).toHaveClass('metric-card-value');
    expect(screen.getByText('+2.4%')).toHaveClass('metric-card-change-positive');
    expect(screen.getByText('Supabase holdings')).toBeInTheDocument();
  });

  test('DataTable sorts columns and supports keyboard row activation', () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={[
          { key: 'ticker', label: 'Ticker', mono: true, sortable: true },
          { key: 'price', label: 'Price', mono: true, align: 'right', sortable: true },
        ]}
        data={[
          { ticker: 'TSM', price: 220 },
          { ticker: 'NVDA', price: 190 },
        ]}
        onRowClick={onRowClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /ticker/i }));

    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('NVDA');

    fireEvent.keyDown(screen.getByRole('row', { name: /NVDA/ }), { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledWith({ ticker: 'NVDA', price: 190 });
  });

  test('DataTable renders loading skeleton and actionable empty state', () => {
    const onAction = vi.fn();
    const { rerender } = render(<DataTable columns={[{ key: 'ticker', label: 'Ticker' }]} data={[]} loading skeletonRows={2} />);

    expect(screen.getAllByTestId('table-skeleton-row')).toHaveLength(2);

    rerender(
      <DataTable
        columns={[{ key: 'ticker', label: 'Ticker' }]}
        data={[]}
        emptyState={{ title: 'ยังไม่มีหุ้นในพอร์ต', action: 'เพิ่มหุ้นตัวแรก', onAction }}
      />
    );

    expect(screen.getByText('ยังไม่มีหุ้นในพอร์ต')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มหุ้นตัวแรก' }));
    expect(onAction).toHaveBeenCalled();
  });

  test('Drawer traps focus, closes on Escape, and restores its trigger', async () => {
    const onClose = vi.fn();

    function DrawerHarness() {
      const [open, setOpen] = useState(false);
      const close = () => {
        onClose();
        setOpen(false);
      };

      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open drawer
          </button>
          <Drawer open={open} onClose={close} title="Scenario Planner">
            <button type="button">Inside drawer</button>
          </Drawer>
        </>
      );
    }

    render(<DrawerHarness />);

    const trigger = screen.getByRole('button', { name: 'Open drawer' });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: 'Scenario Planner' })).toBeInTheDocument();
    const close = screen.getByRole('button', { name: 'Close drawer' });
    const inside = screen.getByRole('button', { name: 'Inside drawer' });
    await waitFor(() => expect(close).toHaveFocus());

    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(inside).toHaveFocus();
    fireEvent.keyDown(inside, { key: 'Tab' });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Scenario Planner' })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  test('EmptyState, DataStamp, Skeleton, and StatusBadge expose stable semantics', () => {
    const onAction = vi.fn();
    render(
      <>
        <EmptyState title="No data" description="Connect Supabase" action={{ label: 'Retry', onClick: onAction }} />
        <DataStamp source="Supabase holdings" timestamp="2026-06-20T12:00:00.000Z" />
        <Skeleton variant="text" width="120px" />
        <StatusBadge status="wait" />
      </>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onAction).toHaveBeenCalled();
    expect(screen.getByText(/Supabase holdings/)).toBeInTheDocument();
    expect(screen.getByTestId('skeleton-text')).toBeInTheDocument();
    expect(screen.getByText('Wait')).toHaveClass('status-badge-wait');
  });

  test('Toast and Tooltip handle user actions without layout copy', () => {
    const onUndo = vi.fn();
    const onDismiss = vi.fn();
    render(
      <>
        <Toast message="Removed NVDA" undoAction={onUndo} onDismiss={onDismiss} duration={0} />
        <Tooltip content="Refresh data">
          <button>Refresh</button>
        </Tooltip>
      </>
    );

    fireEvent.click(screen.getByRole('button', { name: /undo/i }));
    expect(onUndo).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();

    fireEvent.focus(screen.getByRole('button', { name: 'Refresh' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Refresh data');
  });

  test('Toast exposes progress and completes its exit before auto-dismiss', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast message="Saved" onDismiss={onDismiss} duration={5000} />);

    expect(screen.getByRole('progressbar', { name: 'Notification timeout' })).toHaveStyle({
      '--toast-duration': '5000ms',
    });

    act(() => vi.advanceTimersByTime(4850));
    expect(screen.getByText('Saved').closest('output')).toHaveClass('is-exiting');
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(150));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('Toast dismiss button plays the exit state before dismissing', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast message="Saved" onDismiss={onDismiss} duration={0} />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.getByText('Saved').closest('output')).toHaveClass('is-exiting');
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(150));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
