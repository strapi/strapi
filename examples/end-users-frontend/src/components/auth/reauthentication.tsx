import { getReauthenticationSignInURL, isReauthenticationSignInURL } from '@better-auth-ui/core';
import { useAuth, useSignOut } from '@better-auth-ui/react';
import { useSyncExternalStore } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from 'cn';

const subscribeToLocation = () => () => undefined;

function useIsReauthenticationSignIn() {
  return useSyncExternalStore(
    subscribeToLocation,
    () => isReauthenticationSignInURL(new URL(window.location.href)),
    () => false
  );
}

export type ReauthenticationActionProps = {
  className?: string;
  showTitle?: boolean;
};

export function ReauthenticationAction({
  className,
  showTitle = true,
}: ReauthenticationActionProps) {
  const auth = useAuth();
  const signOut = useSignOut(auth.authClient);

  const handleReauthentication = () => {
    const signInURL = getReauthenticationSignInURL(
      new URL(window.location.href),
      `${auth.basePaths.auth}/${auth.viewPaths.auth.signIn}`
    );
    signOut.mutate(undefined, {
      onSuccess: () => auth.navigate({ to: signInURL }),
    });
  };

  return (
    <div className={cn('flex flex-col items-start gap-3 p-4', className)}>
      <div className="flex flex-col gap-1">
        {showTitle ? (
          <h3 className="text-sm font-medium">
            {auth.localization.settings.reauthenticationTitle}
          </h3>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {auth.localization.settings.reauthenticationDescription}
        </p>
      </div>
      <Button disabled={signOut.isPending} onClick={handleReauthentication} size="sm">
        {signOut.isPending ? <Spinner data-icon="inline-start" /> : null}
        {auth.localization.settings.reauthenticationAction}
      </Button>
    </div>
  );
}

export function ReauthenticationNotice() {
  const auth = useAuth();
  const isReauthenticationSignIn = useIsReauthenticationSignIn();
  if (!isReauthenticationSignIn) return null;

  return (
    <Alert className="mx-4 w-auto group-data-[size=sm]/card:mx-3">
      <AlertTitle>{auth.localization.settings.reauthenticationTitle}</AlertTitle>
      <AlertDescription>{auth.localization.settings.reauthenticationDescription}</AlertDescription>
    </Alert>
  );
}
