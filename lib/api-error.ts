import { NextResponse } from 'next/server';

/**
 * An error whose message is safe to return to the browser.
 *
 * Unexpected errors must stay generic so stack traces, provider responses and
 * server secrets can never leak through an API route.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = 'request_failed'
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function apiError(error: unknown) {
  if (error instanceof Response) return error;

  if (error instanceof ApiError) {
    if (error.status >= 500) {
      console.error(`[${error.code}] ${error.message}`);
    }
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  console.error('Unexpected API error:', error);
  return NextResponse.json(
    { error: 'Unexpected server error', code: 'internal_error' },
    { status: 500, headers: { 'Cache-Control': 'no-store' } }
  );
}
