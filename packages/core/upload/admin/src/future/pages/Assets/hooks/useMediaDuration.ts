import { useEffect, useState } from 'react';

/**
 * Fetches the duration of a video or audio file by loading it in a temporary media element.
 * Uses the HTML5 Media API's loadedmetadata event.
 */
export const useMediaDuration = (
  url: string | undefined,
  type: 'video' | 'audio'
): { duration: number | null; isLoading: boolean } => {
  const [duration, setDuration] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setDuration(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setDuration(null);

    const element = document.createElement(type);
    element.preload = 'metadata';

    const handleLoadedMetadata = () => {
      const d = element.duration;
      if (Number.isFinite(d) && d > 0) {
        setDuration(Math.round(d));
      }
      setIsLoading(false);
      cleanup();
    };

    const handleError = () => {
      setIsLoading(false);
      cleanup();
    };

    const cleanup = () => {
      element.removeEventListener('loadedmetadata', handleLoadedMetadata);
      element.removeEventListener('error', handleError);
      element.src = '';
      element.load();
    };

    element.addEventListener('loadedmetadata', handleLoadedMetadata);
    element.addEventListener('error', handleError);
    element.src = url;

    return () => cleanup();
  }, [url, type]);

  return { duration, isLoading };
};

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};
