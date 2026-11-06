import * as React from 'react';

/**
 * A yes-or-no question put to the admin in a dialog while a save waits for the answer: `ask` opens
 * the question and resolves with the answer, `answer` closes it. The dialog is open while `asking`.
 * Leaving the page answers no, so what waits for it never hangs.
 */
const useConfirmation = () => {
  const [asking, setAsking] = React.useState(false);
  const pending = React.useRef<React.Dispatch<boolean> | null>(null);

  const ask = React.useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        pending.current = resolve;
        setAsking(true);
      }),
    []
  );

  const answer = React.useCallback((confirmed: boolean) => {
    const resolve = pending.current;

    pending.current = null;
    setAsking(false);
    resolve?.(confirmed);
  }, []);

  React.useEffect(
    () => () => {
      pending.current?.(false);
    },
    []
  );

  return { asking, ask, answer };
};

export { useConfirmation };
