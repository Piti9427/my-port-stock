import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge Component (Tailwind & cva)', () => {
  it('renders Buy badge with emerald profit classes', () => {
    render(<StatusBadge status="buy" />);
    const badge = screen.getByText('Buy');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('text-emerald-400');
  });

  it('renders Avoid badge with rose loss classes', () => {
    render(<StatusBadge status="avoid" />);
    const badge = screen.getByText('Avoid');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('text-rose-400');
  });

  it('renders Wait badge with amber warning classes', () => {
    render(<StatusBadge status="wait" />);
    const badge = screen.getByText('Wait');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('text-amber-400');
  });

  it('handles custom labels correctly', () => {
    render(<StatusBadge status="buy" label="CUSTOM_LABEL" />);
    expect(screen.getByText('CUSTOM_LABEL')).toBeDefined();
  });
});
