import { useEffect } from 'react';

export const SPRING_LOAD_DELAY_MS = 600;

export const useSpringLoadedExpand = ({
  isOver,
  canExpand,
  onExpand,
}: {
  isOver: boolean;
  canExpand: boolean;
  onExpand: () => void;
}) => {
  useEffect(() => {
    if (!isOver || !canExpand) {
      return;
    }

    const timer = setTimeout(onExpand, SPRING_LOAD_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isOver, canExpand, onExpand]);
};
