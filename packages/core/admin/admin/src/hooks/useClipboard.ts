import { useCallback } from 'react';

const useClipboard = () => {
  const copy = useCallback(async (value: string | number) => {
    try {
      // only strings and numbers casted to strings can be copied to clipboard
      if (typeof value !== 'string' && typeof value !== 'number') {
        throw new Error(
          `Cannot copy typeof ${typeof value} to clipboard, must be a string or number`
        );
      }
      // empty strings are also considered invalid
      else if (value === '') {
        throw new Error(`Cannot copy empty string to clipboard.`);
      }

      const stringifiedValue = value.toString();

      await navigator.clipboard.writeText(stringifiedValue);

      return true;
    } catch (error) {
      /**
       * Realistically this isn't useful in production as there's nothing the user can do.
       */
      if (process.env.NODE_ENV === 'development') {
        console.warn('Copy failed', error);
      }

      return false;
    }
  }, []);

  return { copy };
};

export { useClipboard };
