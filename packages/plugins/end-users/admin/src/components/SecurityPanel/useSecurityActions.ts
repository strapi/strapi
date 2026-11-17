import * as React from 'react';

import { useAPIErrorHandler, useNotification } from '@strapi/admin/strapi-admin';

type Outcome = PromiseLike<{ data?: unknown; error?: unknown }>;

interface Confirmation {
  message: string;
  run: () => Promise<unknown>;
}

const isForbidden = (error: unknown) =>
  typeof error === 'object' && error !== null && (error as { status?: unknown }).status === 403;

/**
 * What the Security panel's buttons share: running a change and telling what came of it, falling
 * back to read-only when the server forbids it, one email at a time, and the question a change
 * asks first.
 */
const useSecurityActions = () => {
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const [forbidden, setForbidden] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState<Confirmation | null>(null);
  // The email in flight, if any: its buttons stay disabled until the server has answered
  const [sending, setSending] = React.useState<'reset' | 'verification' | null>(null);
  const sendingRef = React.useRef(false);

  /** Runs a change: tells what happened, and falls back to read-only when the server forbids it */
  const perform = async (result: Outcome, success: string): Promise<boolean> => {
    const outcome = await result;

    if ('error' in outcome && outcome.error) {
      if (isForbidden(outcome.error)) {
        setForbidden(true);
      } else {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(outcome.error as Parameters<typeof formatAPIError>[0]),
        });
      }

      return false;
    }

    toggleNotification({ type: 'success', message: success });

    return true;
  };

  /** One email at a time: a second click while one is on its way sends nothing */
  const sendEmail = async (
    kind: 'reset' | 'verification',
    send: () => Outcome,
    success: string
  ) => {
    if (sendingRef.current) {
      return;
    }

    sendingRef.current = true;
    setSending(kind);

    try {
      await perform(send(), success);
    } finally {
      sendingRef.current = false;
      setSending(null);
    }
  };

  const confirm = (message: string, run: () => Promise<unknown>) =>
    setConfirmation({ message, run });

  return { forbidden, confirmation, setConfirmation, sending, perform, sendEmail, confirm };
};

export { isForbidden, useSecurityActions };
