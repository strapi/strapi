import { useAuth, useRevokeOtherSessions, useRevokeSessions } from '@better-auth-ui/react';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type PendingAction = 'other' | 'all';

export function SessionActions(props: { hasOtherSessions: boolean }) {
  const { authClient, basePaths, localization, navigate, viewPaths } = useAuth();
  const [action, setAction] = useState<PendingAction | null>(null);

  const revokeOtherSessions = useRevokeOtherSessions(authClient, {
    onSuccess: () => {
      toast.success(localization.settings.signOutOtherDevicesSuccess);
      setAction(null);
    },
  });
  const revokeSessions = useRevokeSessions(authClient, {
    onSuccess: () =>
      navigate({
        to: `${basePaths.auth}/${viewPaths.auth.signIn}`,
        replace: true,
      }),
  });

  const isPending = revokeOtherSessions.isPending || revokeSessions.isPending;
  const isEverywhere = action === 'all';

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2 border-t p-4">
        <Button
          disabled={!props.hasOtherSessions || isPending}
          onClick={() => setAction('other')}
          size="sm"
          type="button"
          variant="outline"
        >
          {localization.settings.signOutOtherDevices}
        </Button>
        <Button
          disabled={isPending}
          onClick={() => setAction('all')}
          size="sm"
          type="button"
          variant="destructive"
        >
          {localization.settings.signOutEverywhere}
        </Button>
      </div>

      <AlertDialog
        open={action !== null}
        onOpenChange={(open) => !open && !isPending && setAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <LogOut />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {isEverywhere
                ? localization.settings.signOutEverywhere
                : localization.settings.signOutOtherDevices}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isEverywhere
                ? localization.settings.signOutEverywhereDescription
                : localization.settings.signOutOtherDevicesDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {localization.settings.cancel}
            </AlertDialogCancel>
            <Button
              disabled={isPending}
              onClick={() =>
                isEverywhere ? revokeSessions.mutate() : revokeOtherSessions.mutate()
              }
              type="button"
              variant={isEverywhere ? 'destructive' : 'default'}
            >
              {isPending && <Spinner />}
              {isEverywhere
                ? localization.settings.signOutEverywhere
                : localization.settings.signOutOtherDevices}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
