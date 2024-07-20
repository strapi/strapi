import * as React from 'react';

/**
 * For more details about this hook see:
 * https://www.30secondsofcode.org/react/s/use-navigator-on-line
 */
export const useNavigatorOnline = (): boolean => {
  const onlineStatus =
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true;

  const [isOnline, setIsOnline] = React.useState(onlineStatus);

  const setOnline = () => setIsOnline(true);
  const setOffline = () => setIsOnline(false);

  React.useEffect(() => {
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);

    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  return isOnline;
};
