// Needs to be wrapped in a component to have access to the form context via a hook.

import { Blocker as BaseBlocker, useForm } from '@strapi/admin/strapi-admin';

/**
 * Prevents users from leaving the page with unsaved form changes
 */
const Blocker = () => {
  const resetForm = useForm('Blocker', (state) => state.resetForm);

  // We reset the form to the published version to avoid errors like – https://strapi-inc.atlassian.net/browse/CONTENT-2284
  return <BaseBlocker onProceed={resetForm} />;
};

export { Blocker };
