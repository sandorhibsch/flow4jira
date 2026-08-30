/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ErrorPage from './error';
import { logger } from '@/lib/logger';

jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn() } }));

describe('application error boundary', () => {
  it('reports the error and exposes recovery navigation', async () => {
    const reset = jest.fn();
    const error = Object.assign(new Error('render failed'), { digest: 'digest-42' });

    render(<ErrorPage error={error} reset={reset} />);

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(logger.error).toHaveBeenCalledWith(
      'Application error', error, { digest: 'digest-42' }
    ));
  });
});
