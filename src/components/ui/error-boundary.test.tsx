/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import { ChartErrorBoundary, ErrorBoundary } from './error-boundary';

let shouldThrow = true;

function UnstableChild() {
  if (shouldThrow) throw new Error('chart exploded');
  return <p>Recovered content</p>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true;
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('reports a child failure and lets the user retry', () => {
    const onError = jest.fn();
    render(<ErrorBoundary onError={onError}><UnstableChild /></ErrorBoundary>);

    expect(screen.getByText('chart exploded')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ componentStack: expect.any(String) }));

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Recovered content')).toBeInTheDocument();
  });

  it('uses a caller-provided fallback', () => {
    render(<ErrorBoundary fallback={<p>Safe fallback</p>}><UnstableChild /></ErrorBoundary>);

    expect(screen.getByText('Safe fallback')).toBeInTheDocument();
    expect(screen.queryByText('chart exploded')).not.toBeInTheDocument();
  });

  it('gives failed charts contextual fallback text', () => {
    render(<ChartErrorBoundary title="cycle time"><UnstableChild /></ChartErrorBoundary>);

    expect(screen.getByText('Failed to render cycle time')).toBeInTheDocument();
  });
});
