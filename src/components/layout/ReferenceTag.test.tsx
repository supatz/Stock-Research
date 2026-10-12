import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AppProviders } from '@/app/providers';
import { ReferenceTag } from '@/components/layout/ReferenceTag';

describe('ReferenceTag', () => {
  it('copies the section reference and announces it', async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <div className="section-header">
          <ReferenceTag referenceId="section.stock.trend" />
        </div>
      </AppProviders>,
    );
    await user.click(screen.getByRole('button', { name: 'Copy section reference for Stock Detail / Trend' }));
    expect(await screen.findByText('Copied: Stock Detail / Trend [section.stock.trend]')).toBeInTheDocument();
    await expect(navigator.clipboard.readText()).resolves.toBe('Stock Detail / Trend [section.stock.trend]');
  });
});
