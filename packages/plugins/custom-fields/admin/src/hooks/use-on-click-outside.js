import { useEffect } from 'react';

const useOnClickOutside = (ref, listener) => {
  // Close the color picker when clicking outside
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
