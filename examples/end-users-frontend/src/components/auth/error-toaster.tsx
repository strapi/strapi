import {
  authMutationKeys,
  authQueryKeys,
  getAuthErrorCode,
  getAuthErrorMessage,
  getAuthErrorPresentation,
  isPasswordCompromisedError,
} from '@better-auth-ui/core';
import { oneTapMutationKeys } from '@better-auth-ui/core/plugins/one-tap';
import { useAuth } from '@better-auth-ui/react';
import { matchMutation, matchQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function ErrorToaster() {
  const { localization } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const queryCache = queryClient.getQueryCache();
    const previousQueryOnError = queryCache.config.onError;

    queryCache.config.onError = (error, query) => {
      previousQueryOnError?.(error, query);

      if (!matchQuery({ queryKey: authQueryKeys.all }, query)) return;
      if (getAuthErrorPresentation(query.meta) !== 'toast') return;

      if (getAuthErrorCode(error) === 'EMAIL_NOT_VERIFIED') return;
      const message = getAuthErrorMessage(error, localization);
      if (message) {
        console.error('[Better Auth UI]', error);
        toast.error(message);
      }
    };

    const mutationCache = queryClient.getMutationCache();
    const previousMutationOnError = mutationCache.config.onError;

    mutationCache.config.onError = (error, variables, onMutateResult, mutation, context) => {
      previousMutationOnError?.(error, variables, onMutateResult, mutation, context);

      if (!matchMutation({ mutationKey: authMutationKeys.all }, mutation)) {
        return;
      }
      if (getAuthErrorPresentation(mutation.meta) !== 'toast') return;
      // Every form that sets a new password renders this one against the
      // password field, so a toast would just repeat it.
      if (isPasswordCompromisedError(error)) return;

      if (
        getAuthErrorCode(error) === 'EMAIL_NOT_VERIFIED' &&
        !matchMutation({ mutationKey: oneTapMutationKeys.prompt }, mutation)
      ) {
        return;
      }
      const message = getAuthErrorMessage(error, localization, mutation.options.mutationKey);
      if (message) {
        console.error('[Better Auth UI]', error);
        toast.error(message);
      }
    };

    return () => {
      queryCache.config.onError = previousQueryOnError;
      mutationCache.config.onError = previousMutationOnError;
    };
  }, [queryClient, localization]);

  return null;
}
