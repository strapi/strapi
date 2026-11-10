import * as React from 'react';

/**
 * A question put to the admin in a dialog while something waits for the answer: `ask` shows the
 * question and resolves with the answer, `answer` closes it. The dialog is open while `question` is
 * set. Leaving the page answers `false`, so what waits for it never hangs.
 */
const useQuestion = <TQuestion>() => {
  const [question, setQuestion] = React.useState<TQuestion | null>(null);
  const pending = React.useRef<React.Dispatch<boolean> | null>(null);

  const ask = React.useCallback(
    (next: TQuestion) =>
      new Promise<boolean>((resolve) => {
        pending.current = resolve;
        setQuestion(next);
      }),
    []
  );

  const answer = React.useCallback((confirmed: boolean) => {
    const resolve = pending.current;

    pending.current = null;
    setQuestion(null);
    resolve?.(confirmed);
  }, []);

  React.useEffect(
    () => () => {
      pending.current?.(false);
    },
    []
  );

  return { question, ask, answer };
};

export { useQuestion };
