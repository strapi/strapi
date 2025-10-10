import * as React from 'react';

const useIsMounted = () => {
  const isMounted = React.useRef(false);

  React.useLayoutEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
};

export { useIsMounted };
