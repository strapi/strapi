import { useAuth, useSession } from '@better-auth-ui/react';
import { Link } from 'react-router-dom';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AUTH_MODE, STRAPI_URL } from '@/lib/auth-client';

const OTHER_MODE = AUTH_MODE === 'cookie' ? 'bearer' : 'cookie';

export function HomePage() {
  const { authClient } = useAuth();
  const { data: session, isPending } = useSession(authClient);

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">End users example</h1>
        <p className="text-muted-foreground">
          A front end on its own origin, talking to Strapi&apos;s end-user authentication (
          <code>@strapi/plugin-end-users</code>) with the Better Auth client and Better Auth UI.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isPending ? 'Checking your session' : session ? 'Signed in' : 'Signed out'}
          </CardTitle>
          <CardDescription>
            {session ? (
              <>
                You are signed in as {session.user.email}. See{' '}
                <Link className="underline" to="/account">
                  your account
                </Link>{' '}
                for your sessions.
              </>
            ) : (
              <>
                <Link className="underline" to="/sign-up">
                  Sign up
                </Link>{' '}
                or{' '}
                <Link className="underline" to="/sign-in">
                  sign in
                </Link>{' '}
                to start a session.
              </>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How this page talks to Strapi</CardTitle>
          <CardDescription>
            Mode: <code data-testid="auth-mode">{AUTH_MODE}</code>. Strapi:{' '}
            <code>{STRAPI_URL}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          {AUTH_MODE === 'cookie' ? (
            <p>
              Strapi&apos;s session cookie does the work: the browser stores it and sends it with
              every request.
            </p>
          ) : (
            <p>
              No cookie is involved: this page keeps the token Strapi returned and sends it as an{' '}
              <code>Authorization: Bearer</code> header.
            </p>
          )}
          <p>
            Set <code>VITE_AUTH_MODE</code> in <code>.env</code>, or switch this tab to{' '}
            <a className="underline" href={`/?mode=${OTHER_MODE}`}>
              {OTHER_MODE} mode
            </a>
            . Signing out and back in is the way to start over in the new mode.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
