'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    logger.error('Application error', error, { digest: error.digest });
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg
            className="mx-auto h-16 w-16"
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-600 mb-6">
          An unexpected error occurred. Please try again or contact support if the problem
          persists.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 rounded p-4 mb-6 text-left">
            <p className="text-sm font-mono text-red-600 break-all">{error.message}</p>
          </div>
        )}
        <div className="space-x-4">
          <button
            onClick={reset}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-6 rounded"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
