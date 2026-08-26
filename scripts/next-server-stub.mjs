/** Minimal `next/server` stand-in for the Node-based verification script. */
export const NextResponse = {
  json(body, init = {}) {
    return new Response(JSON.stringify(body), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }
    });
  }
};
