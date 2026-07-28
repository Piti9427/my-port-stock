import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge Component (Tailwind & cva)', () => {
  it('renders Buy badge with the semantic profit token', () => {
    render(<StatusBadge status="buy" />);
    const badge = screen.getByText('Buy');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('text-fin-profit');
  });

  it('renders Avoid badge with the semantic loss token', () => {
    render(<StatusBadge status="avoid" />);
    const badge = screen.getByText('Avoid');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('text-fin-loss');
  });

  it('renders Wait badge with the semantic warning token', () => {
    render(<StatusBadge status="wait" />);
    const badge = screen.getByText('Wait');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('text-fin-warning');
  });

  it('handles custom labels correctly', () => {
    render(<StatusBadge status="buy" label="CUSTOM_LABEL" />);
    expect(screen.getByText('CUSTOM_LABEL')).toBeDefined();
  });
});
