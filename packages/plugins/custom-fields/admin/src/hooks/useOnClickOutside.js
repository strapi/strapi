import { useEffect } from 'react';

const useOnClickOutside = (ref, listener) => {
  useEffect(() => {
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, listener]);
};

export default useOnClickOutside;
