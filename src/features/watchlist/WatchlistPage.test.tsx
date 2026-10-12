import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders } from '@/app/providers';
import { routes } from '@/app/router';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

describe('Watchlist page', () => {
  beforeEach(() => localStorage.clear());

  it('adds and removes a ticker through local storage', async () => {
    const user = userEvent.setup();
    renderAt('/watchlist');
    expect(await screen.findByText('The watchlist is empty')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Add ticker'), 'aapl');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByRole('link', { name: 'AAPL' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('meridian.watchlist') ?? '[]')).toEqual(['AAPL']);
    await user.click(screen.getByRole('button', { name: 'Remove AAPL from watchlist' }));
    expect(await screen.findByText('The watchlist is empty')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('meridian.watchlist') ?? '[]')).toEqual([]);
  });
});
