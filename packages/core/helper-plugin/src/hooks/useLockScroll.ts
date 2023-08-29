import * as React from 'react';

interface LockScrollProps {
  lockScroll: boolean;
}

const useLockScroll = ({ lockScroll }: LockScrollProps) => {
  React.useEffect(() => {
    if (lockScroll) {
      document.body.classList.add('lock-body-scroll');
    }

    return () => {
      document.body.classList.remove('lock-body-scroll');
    };
  }, [lockScroll]);
};

export { useLockScroll };
