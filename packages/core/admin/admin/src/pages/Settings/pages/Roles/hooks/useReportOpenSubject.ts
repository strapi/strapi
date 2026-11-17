import * as React from 'react';

import type { PermissionsProps, PermissionsTabId } from '../components/Permissions';

/**
 * Reports through `onOpenSubjectChange` which subject (a content type, plugin or settings
 * category) is open in a tab. A tab that is left unmounts its content and so closes the subject
 * it had open: that is reported as well.
 *
 * @returns the function to call with the id of the subject that opens, or with `null` when it
 * closes
 */
const useReportOpenSubject = (
  tab: PermissionsTabId,
  onOpenSubjectChange: PermissionsProps['onOpenSubjectChange']
) => {
  const onOpenSubjectChangeRef = React.useRef(onOpenSubjectChange);
  const openIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    onOpenSubjectChangeRef.current = onOpenSubjectChange;
  });

  React.useEffect(() => {
    return () => {
      if (openIdRef.current !== null) {
        onOpenSubjectChangeRef.current?.(null);
      }
    };
  }, []);

  return React.useCallback(
    (id: string | null) => {
      // Nothing to tell when the subject that is open stays so, as when a search opens it again
      if (openIdRef.current === id) {
        return;
      }

      openIdRef.current = id;
      onOpenSubjectChangeRef.current?.(id === null ? null : { tab, id });
    },
    [tab]
  );
};

export { useReportOpenSubject };
