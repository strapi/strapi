import { useEffect } from 'react';

export const useLockScroll = lockScroll => {
  useEffect(() => {
    if (lockScroll) {
      document.body.classList.add('lock-body-scroll');
    }
    return () => {
      document.body.classList.remove('lock-body-scroll');
    };
  }, [lockScroll]);
};
