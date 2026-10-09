type QueryParameters = Record<string, string | number | boolean | null | undefined>;

/** Fetch a provider response, retaining its error message on non-success statuses. */
const fetchJson = async <Body = unknown>(
  url: string | URL,
  options: RequestInit = {}
): Promise<{ body: Body }> => {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';
  let body: unknown;
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    const text = await response.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!response.ok) {
    const error =
      typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : undefined;
    const message = error ? error.error_description || error.error || error.message : body;
    throw new Error(message ? String(message) : `HTTP ${response.status}`);
  }
  // Provider response shapes are external contracts checked by their auth callbacks.
  return { body: body as Body };
};

/** Send a bearer-authenticated profile request with encoded query parameters. */
const bearerGet = <Body = unknown>(
  url: string,
  accessToken: string | undefined,
  { headers = {}, qs = {} }: { headers?: Record<string, string>; qs?: QueryParameters } = {}
) => {
  const target = new URL(url);
  Object.entries(qs).forEach(([key, value]) => {
    if (value !== undefined && value !== null) target.searchParams.set(key, String(value));
  });
  return fetchJson<Body>(target, {
    headers: { Authorization: `Bearer ${accessToken}`, ...headers },
  });
};
export { fetchJson, bearerGet };
