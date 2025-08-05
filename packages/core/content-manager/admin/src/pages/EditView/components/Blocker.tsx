import * as React from 'react';

import { Blocker as AdminBlocker, useForm } from '@strapi/admin/strapi-admin';

// Needs to be wrapped in a component to have access to the form context via a hook.
// Using the Form component's render prop instead would cause unnecessary re-renders of Form children
const Blocker = () => {
  const resetForm = useForm('Blocker', (state) => state.resetForm);

  // We reset the form to the published version to avoid errors like – https://strapi-inc.atlassian.net/browse/CONTENT-2284
  return <AdminBlocker onProceed={resetForm} />;
};

export { Blocker };
