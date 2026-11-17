import type { UsernameAuthClient } from '@better-auth-ui/core/plugins/username';
import { useAuth, useSession } from '@better-auth-ui/react';
import type { User } from 'better-auth';
import { User2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from 'cn';

export type UserAvatarProps = {
  className?: string;
  fallback?: ReactNode;
  isPending?: boolean;
  /** @remarks `User` */
  user?: User & { username?: string | null; displayUsername?: string | null };
};

/**
 * Display a user's avatar using session information or an explicit user prop.
 *
 * Renders a circular avatar that shows the user's image when available, a fallback node if provided, or the user's first two initials; while the session is loading (or when `isPending` is true) and no `user` prop is supplied, renders a skeleton placeholder.
 *
 * @param className - Additional CSS classes applied to the avatar container
 * @param user - Optional user object to display instead of the session user
 * @param isPending - When true, treat the component as loading and show the skeleton if no `user` is provided
 * @param fallback - Node to render inside the avatar fallback area before initials or the default icon
 * @returns The avatar element to render (JSX)
 */
export function UserAvatar({ className, user, isPending, fallback }: UserAvatarProps) {
  const { authClient } = useAuth<UsernameAuthClient>();
  const { data: session, isPending: sessionPending } = useSession(authClient, {
    enabled: !user && !isPending,
  });

  if ((isPending || sessionPending) && !user) {
    return <Skeleton className={cn('size-8 rounded-full', className)} />;
  }

  const resolvedUser = user ?? session?.user;

  const initials = (resolvedUser?.username || resolvedUser?.name || resolvedUser?.email)
    ?.slice(0, 2)
    .toUpperCase();

  return (
    <Avatar className={cn('size-8 bg-muted text-foreground text-sm rounded-full', className)}>
      <AvatarImage
        src={resolvedUser?.image ?? undefined}
        alt={resolvedUser?.displayUsername || resolvedUser?.name || resolvedUser?.email}
      />

      <AvatarFallback className="text-muted-foreground!">
        {fallback || initials || <User2 className="size-4" />}
      </AvatarFallback>
    </Avatar>
  );
}
