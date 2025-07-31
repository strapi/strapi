import * as React from 'react';

import { Blocker as AdminBlocker, useForm } from '@strapi/admin/strapi-admin';

// Needs to be wrapped in a component to have access to the form context via a hook.
// Using the Form component's render prop instead would cause unnecessary re-renders of Form children
const Blocker = () => {
  const resetForm = useForm('Blocker', (state) => state.resetForm);

  // We reset the form to the published version to avoid errors like – https://strapi-inc.atlassian.net/browse/CONTENT-2284
  return (
    <AdminBlocker
      onProceed={resetForm}
      shouldBlock={({ currentLocation, nextLocation, modified, isSubmitting }) => {
        // Don't block if form is not modified or is submitting
        if (!modified || isSubmitting) {
          return false;
        }

        // Don't block if only pathname changed
        if (currentLocation.pathname !== nextLocation.pathname) {
          return true;
        }

        // Parse search parameters to check if only "field" parameter changed
        const currentParams = new URLSearchParams(currentLocation.search);
        const nextParams = new URLSearchParams(nextLocation.search);

        // Remove "field" parameter from both to compare other parameters
        currentParams.delete('field');
        nextParams.delete('field');

        // Block if any parameter other than "field" changed
        return currentParams.toString() !== nextParams.toString();
      }}
    />
  );
};

export { Blocker };
