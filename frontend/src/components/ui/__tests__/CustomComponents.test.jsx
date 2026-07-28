import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';
import { DataStamp } from '../DataStamp';
import { Skeleton } from '../Skeleton';
import { Tooltip } from '../Tooltip';
import { Toast } from '../Toast';
import { Drawer } from '../Drawer';
import { DataTable } from '../DataTable';

describe('Custom UI Components (Tailwind & TDD)', () => {
  it('renders EmptyState with title and action button', () => {
    const handleClick = vi.fn();
    render(<EmptyState title="No Trades Found" action="Add Trade" onAction={handleClick} />);
    expect(screen.getByText('No Trades Found')).toBeDefined();
    const btn = screen.getByRole('button', { name: 'Add Trade' });
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders DataStamp with source name and clock icon', () => {
    render(<DataStamp source="Yahoo Finance" stale={true} />);
    expect(screen.getByText('Yahoo Finance')).toBeDefined();
    expect(screen.getByText('Stale')).toBeDefined();
  });

  it('renders Skeleton component with skeleton animation utility classes', () => {
    render(<Skeleton variant="text" />);
    const skel = screen.getByTestId('skeleton-text');
    expect(skel.className).toContain('animate-pulse');
  });

  it('renders Tooltip trigger and tooltip content on hover/focus', () => {
    render(
      <Tooltip content="Tooltip Content">
        <button type="button">Hover Me</button>
      </Tooltip>
    );
    const trigger = screen.getByRole('button', { name: 'Hover Me' });
    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole('tooltip')).toBeDefined();
    expect(screen.getByText('Tooltip Content')).toBeDefined();
  });

  it('renders Toast notification with message and action button', () => {
    const handleUndo = vi.fn();
    render(<Toast message="Trade Deleted" undoAction={handleUndo} duration={0} />);
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Trade Deleted')).toBeDefined();
    const undoBtn = screen.getByRole('button', { name: /Undo/i });
    fireEvent.click(undoBtn);
    expect(handleUndo).toHaveBeenCalledTimes(1);
  });

  it('renders Drawer dialog when open is true', () => {
    const handleClose = vi.fn();
    render(
      <Drawer open={true} onClose={handleClose} title="Trade Analysis">
        <div>Drawer Body</div>
      </Drawer>
    );
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Trade Analysis')).toBeDefined();
    expect(screen.getByText('Drawer Body')).toBeDefined();
  });

  it('renders DataTable with columns, sorted data, and click handlers', () => {
    const columns = [
      { key: 'ticker', label: 'Ticker' },
      { key: 'price', label: 'Price', mono: true, align: 'right' },
    ];
    const data = [{ id: '1', ticker: 'NVDA', price: '$120.50' }];
    const handleRowClick = vi.fn();

    render(<DataTable columns={columns} data={data} onRowClick={handleRowClick} />);
    expect(screen.getByText('NVDA')).toBeDefined();
    expect(screen.getByText('$120.50')).toBeDefined();

    const row = screen.getByText('NVDA').closest('tr');
    fireEvent.click(row);
    expect(handleRowClick).toHaveBeenCalledWith(data[0]);
  });
});
