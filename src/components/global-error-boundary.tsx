'use client';

import type { ReactNode, ErrorInfo } from 'react';
import { Component } from 'react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global Error Boundary for the entire application.
 * Catches unhandled errors and displays a user-friendly fallback UI.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('Unhandled application error', error, {
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    // Optionally reload the page for a clean state
    window.location.href = '/';
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <html lang="en">
          <body className="bg-gray-50 min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
              <div className="mb-6">
                <svg
                  className="mx-auto h-16 w-16 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h1>

              <p className="text-gray-600 mb-6">
                An unexpected error occurred. We apologize for the inconvenience.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                  <p className="text-red-800 font-mono text-sm break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={this.handleReset}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Go to Home
                </button>
                <button
                  onClick={this.handleReload}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </body>
        </html>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
