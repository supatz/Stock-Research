import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MetricHelp } from '@/components/metrics/MetricHelp';
import { getMetricDefinition } from '@/domain/metrics/definitions';

describe('MetricHelp', () => {
  it('opens from the keyboard and closes with Escape', async () => {
    const user = userEvent.setup();
    render(<MetricHelp definition={getMetricDefinition('momentum.rsi14')} />);
    const button = screen.getByRole('button', { name: 'Help for RSI 14' });
    button.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'RSI 14' })).toBeInTheDocument();
    expect(screen.getByText(/0 to 100/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
