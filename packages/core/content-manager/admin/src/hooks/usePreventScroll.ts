import * as React from 'react';

const usePreventScroll = (ref: React.RefObject<HTMLDivElement>) => {
  React.useEffect(() => {
    const sidebar = ref.current;
    if (!sidebar) return;

    const handleScroll = (event: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = sidebar;
      const isAtTop = scrollTop <= 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight;

      if ((isAtTop && event.deltaY < 0) || (isAtBottom && event.deltaY > 0)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    sidebar.addEventListener("wheel", handleScroll, { passive: false });

    return () => {
      sidebar.removeEventListener("wheel", handleScroll);
    };
  }, [ref]); 
};

export default usePreventScroll;
