import { useState, useEffect, useMemo } from 'react';

import { useDataManager } from '../../DataManager/useDataManager';

interface LastSeenSchema {
  uid: string;
  type: 'contentType' | 'component';
  timestamp: number;
}

const MAX_HISTORY_SIZE = 1; // Configurable max history size

// Parse URL to extract content type or component information
const parseUrlForSchemaInfo = (): {
  uid: string | null;
  type: 'contentType' | 'component' | null;
} => {
  if (typeof window === 'undefined') {
    return { uid: null, type: null };
  }

  const pathname = window.location.pathname;

  // Content type URL pattern: /content-type-builder/content-types/[uid]
  if (pathname.includes('/content-types/')) {
    const contentTypeUid = pathname.split('/content-types/')[1];
    if (contentTypeUid) {
      return { uid: contentTypeUid, type: 'contentType' };
    }
  }

  // Component URL pattern: /component-categories/[category]/[uid]
  if (pathname.includes('/component-categories/')) {
    const parts = pathname.split('/component-categories/')[1].split('/');
    if (parts.length >= 2) {
      const componentUid = parts[1];
      return { uid: componentUid, type: 'component' };
    }
  }

  return { uid: null, type: null };
};

export const useLastSeenSchemas = () => {
  // Raw tracked schemas (unfiltered)
  const [rawSchemas, setRawSchemas] = useState<LastSeenSchema[]>([]);
  const { components, contentTypes } = useDataManager();

  // Update schema history when URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const { uid, type } = parseUrlForSchemaInfo();
      if (!uid || !type) return;

      const newSchema: LastSeenSchema = {
        uid,
        type,
        timestamp: Date.now(),
      };

      setRawSchemas((prevSchemas) => {
        // Remove existing entry with the same UID if it exists
        const filteredSchemas = prevSchemas.filter((schema) => schema.uid !== newSchema.uid);
        // Add new schema to the beginning and limit size
        return [newSchema, ...filteredSchemas].slice(0, MAX_HISTORY_SIZE);
      });
    };

    // Check on initial load
    handleUrlChange();

    // Set up listeners for navigation
    window.addEventListener('popstate', handleUrlChange);

    // Custom event to detect SPA navigation
    const detectRouteChange = () => {
      let lastPathname = window.location.pathname;

      const interval = setInterval(() => {
        const currentPathname = window.location.pathname;
        if (currentPathname !== lastPathname) {
          lastPathname = currentPathname;
          handleUrlChange();
        }
      }, 300);

      return () => clearInterval(interval);
    };

    const cleanup = detectRouteChange();

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      cleanup();
    };
  }, []);

  // Filtered schemas - updated whenever components or contentTypes change
  const lastSeenSchemas = useMemo(() => {
    return rawSchemas.filter((schema) => {
      if (schema.type === 'contentType') {
        return Object.keys(contentTypes).some((uid) => uid === schema.uid);
      }
      if (schema.type === 'component') {
        return Object.keys(components).some((uid) => uid === schema.uid);
      }
      return false;
    });
  }, [rawSchemas, components, contentTypes]);

  // Function to clear history
  const clearHistory = () => {
    setRawSchemas([]);
  };

  return {
    lastSeenSchemas,
    clearHistory,
  };
};
