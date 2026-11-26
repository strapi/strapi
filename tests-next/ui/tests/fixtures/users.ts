import type { Server } from '../../fixtures';

/** An end user (Users & Permissions) for a seed plan. */
export const endUser = (email: string) => ({
  username: email.split('@')[0],
  email,
  password: 'Testing123!',
});

/**
 * The ids of the end users with this email, read through the content API with a seeded
 * full-access token. `null` when the server rejects the token: the token is gone, so a reset ran
 * since it was seeded.
 */
export const findUsers = async (server: Server, accessKey: string, email: string) => {
  const res = await fetch(
    `${server.url}/api/users?filters[email][$eq]=${encodeURIComponent(email)}`,
    { headers: { authorization: `Bearer ${accessKey}` } }
  );
  if (res.status === 401) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`GET /api/users failed (${res.status}): ${await res.text()}`);
  }
  return ((await res.json()) as Array<{ id: number }>).map((user) => user.id);
};
