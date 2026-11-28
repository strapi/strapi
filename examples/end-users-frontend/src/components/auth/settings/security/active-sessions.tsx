'use client';

import { isReauthenticationRequiredError } from '@better-auth-ui/core';
import { useAuth, useListSessions, useSession } from '@better-auth-ui/react';
import { Fragment } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Item, ItemContent, ItemGroup, ItemMedia, ItemSeparator } from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from 'cn';
import { ReauthenticationAction } from '../../reauthentication';
import { ActiveSession } from './active-session';
import { SessionActions } from './session-actions';

export type ActiveSessionsProps = {
  className?: string;
};

/**
 * Render a card listing all active sessions for the current user with revoke controls.
 *
 * Shows each session's browser, OS, IP address, and creation time. The current session is marked
 * and navigates to sign-out on click, while other sessions can be revoked individually.
 *
 * @returns A JSX element containing the sessions card
 */
export function ActiveSessions({ className }: ActiveSessionsProps) {
  const { authClient, localization } = useAuth();
  const { data: session } = useSession(authClient);

  const sessionsQuery = useListSessions(authClient, {
    meta: { errorPresentation: 'inline' },
  });
  const { data: sessions, error, isPending } = sessionsQuery;

  const activeSessions = [...(sessions ?? [])].sort((activeSession) =>
    activeSession.id === session?.session.id ? -1 : 1
  );

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3">{localization.settings.activeSessions}</h2>

      <Card className={cn('gap-0 p-0', className)}>
        <CardContent className="p-0">
          {isReauthenticationRequiredError(error) ? (
            <ReauthenticationAction />
          ) : error ? (
            <div className="p-4 text-destructive text-sm">{error.message}</div>
          ) : isPending ? (
            <SessionRowSkeleton />
          ) : (
            <ItemGroup className="gap-0!">
              {activeSessions?.map((activeSession, index) => (
                <Fragment key={activeSession.id}>
                  {index > 0 && <ItemSeparator className="my-0!" />}
                  <ActiveSession activeSession={activeSession} />
                </Fragment>
              ))}
            </ItemGroup>
          )}
        </CardContent>
        {!isPending && !error && (
          <SessionActions
            hasOtherSessions={activeSessions.some(
              (activeSession) => activeSession.id !== session?.session.id
            )}
          />
        )}
      </Card>
    </div>
  );
}

function SessionRowSkeleton() {
  return (
    <Item>
      <ItemMedia>
        <Skeleton className="size-10 rounded-md" />
      </ItemMedia>
      <ItemContent>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-32" />
      </ItemContent>
    </Item>
  );
}
