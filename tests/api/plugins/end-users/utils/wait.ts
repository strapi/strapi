import { sentEmails } from './email-capture-provider';

/** What `until` throws when the time is up, so a caller can tell it from an error of the check */
export class WaitTimeout extends Error {}

/**
 * Polls `check` until it answers something other than `false`, `null` or `undefined`, and gives that
 * answer back. Fails with `what` once `timeout` ms have gone by, so a test that waits for an event
 * ends on a message that names it instead of on the test runner's timeout.
 */
export const until = async <T>(
  check: () => T | Promise<T>,
  { what = 'the condition', timeout = 5000, interval = 20 } = {}
): Promise<NonNullable<T>> => {
  const deadline = Date.now() + timeout;

  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const found = await check();

    if (found !== false && found !== null && found !== undefined) {
      return found as NonNullable<T>;
    }

    if (Date.now() >= deadline) {
      throw new WaitTimeout(`Timed out after ${timeout} ms waiting for ${what}`);
    }

    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => {
      setTimeout(resolve, interval);
    });
  }
};

/**
 * Like `until`, for a wait that may end without the condition: answers whether it held within
 * `timeout` ms. Only the time running out is an answer; an error thrown by `check` is rethrown.
 */
export const holds = (check: () => boolean | Promise<boolean>, timeout = 5000): Promise<boolean> =>
  until(check, { timeout }).then(
    () => true,
    (error) => {
      if (error instanceof WaitTimeout) {
        return false;
      }

      throw error;
    }
  );

/**
 * The emails the engine has sent, once `count` of them have: they go out after the response, so
 * they land a moment after it. Throws when they do not come, naming how many did; a test that
 * expects none reads `sentEmails()` after a later mail that must arrive instead.
 */
export const emailsAfter = async (count: number, timeout = 5000) => {
  await until(() => sentEmails().length >= count, {
    what: `${count} email(s), of which ${sentEmails().length} arrived`,
    timeout,
  });

  return sentEmails();
};
