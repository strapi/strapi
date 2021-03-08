import { get } from 'lodash';

import { CONTENT_MANAGER_PREFIX } from './utils';

const init = (state, permissionsLayout, permissions, role) => {
  let customPermissionsLayout = permissionsLayout;

  // Customize permissions layout for the Author role
  if (role.code === 'strapi-author') {
    // The publish action have to be hidden in CE for the author role.
    const contentTypesLayout = get(permissionsLayout, ['sections', 'contentTypes'], []).filter(
      pLayout => pLayout.action !== `${CONTENT_MANAGER_PREFIX}.publish`
    );

    customPermissionsLayout = {
      ...customPermissionsLayout,
      sections: {
        ...customPermissionsLayout.sections,
        contentTypes: contentTypesLayout,
      },
    };
  }

  return {
    ...state,
    ...permissions,
    permissionsLayout: customPermissionsLayout,
    initialData: permissions,
    isSuperAdmin: role && role.code === 'strapi-super-admin',
  };
};

export default init;
