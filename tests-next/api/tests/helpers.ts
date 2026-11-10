import { appPort, type Server } from '@strapi/tests-shared';

/** Vitest worker of this file (1-based), for app names and ports that don't collide. */
export const worker = Number(process.env.VITEST_POOL_ID ?? 1);

export const port = appPort('api', worker - 1);

export interface Response {
  status: number;
  // The tests read the bodies they expect: typing every route is not worth it here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
}

/** A JSON request to a test server. */
export const request = async (
  server: Server,
  path: string,
  { method = 'GET', token, body }: { method?: string; token?: string; body?: unknown } = {}
): Promise<Response> => {
  const res = await fetch(`${server.url}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // not JSON: keep the text
  }
  return { status: res.status, body: parsed };
};

/** Log an admin user in through the API. Returns the access token. */
export const adminLogin = async (server: Server, email: string, password: string) => {
  const res = await request(server, '/admin/login', { method: 'POST', body: { email, password } });
  if (res.status !== 200) {
    throw new Error(`Admin login of ${email} failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data.token as string;
};
