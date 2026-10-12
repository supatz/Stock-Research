import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders } from '@/app/providers';
import { routes } from '@/app/router';

describe('Screener page', () => {
  it('filters the illustrated universe by sector', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, { initialEntries: ['/screener'] });
    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );
    expect(await screen.findAllByRole('link', { name: 'AAPL' })).not.toHaveLength(0);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sector' }), 'utilities');
    expect(await screen.findAllByRole('link', { name: 'NEE' })).not.toHaveLength(0);
    expect(screen.queryAllByRole('link', { name: 'AAPL' })).toHaveLength(0);
  });
});
