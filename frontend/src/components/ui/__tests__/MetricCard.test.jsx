import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard } from '../MetricCard';

describe('MetricCard Component (Tailwind)', () => {
  it('renders metric label and value correctly', () => {
    render(<MetricCard label="Total Portfolio Value" value="$125,400.00" />);
    expect(screen.getByText('Total Portfolio Value')).toBeDefined();
    expect(screen.getByText('$125,400.00')).toBeDefined();
  });

  it('renders positive change badge with the semantic profit token', () => {
    render(<MetricCard label="P&L" value="+$5,200" change="+4.32%" changeType="positive" />);
    const changeBadge = screen.getByText('+4.32%');
    expect(changeBadge).toBeDefined();
    expect(changeBadge.className).toContain('text-fin-profit');
  });

  it('renders negative change badge with the semantic loss token', () => {
    render(<MetricCard label="Drawdown" value="-$1,100" change="-1.20%" changeType="negative" />);
    const changeBadge = screen.getByText('-1.20%');
    expect(changeBadge).toBeDefined();
    expect(changeBadge.className).toContain('text-fin-loss');
  });

  it('applies monospace font class when mono is true', () => {
    render(<MetricCard label="Yield" value="4.85%" mono={true} />);
    const valueEl = screen.getByText('4.85%');
    expect(valueEl.className).toContain('font-mono');
  });
});
