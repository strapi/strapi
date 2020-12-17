import React, { memo, useReducer, forwardRef, useMemo, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import init from 'ee_else_ce/components/Roles/Permissions/init';
import reducer, { initialState } from 'ee_else_ce/components/Roles/Permissions/reducer';

import Tabs from '../Tabs';
import ContentTypes from './ContentTypes';
import PluginsAndSettingsPermissions from './PluginsAndSettingsPermissions';
import { roleTabsLabel } from '../../../utils';
import { useModels } from '../../../hooks';
import PermissionsProvider from './PermissionsProvider';
import { getAllAttributes, formatPermissionsLayout } from './utils';

const Permissions = forwardRef(({ role, permissionsLayout, rolePermissions }, ref) => {
  const { singleTypes, collectionTypes, components } = useModels();
  const [state, dispatch] = useReducer(reducer, initialState, state =>
    init(state, permissionsLayout, rolePermissions, role)
  );

  useImperativeHandle(ref, () => ({
    getPermissions: () => {
      return {
        contentTypesPermissions: state.contentTypesPermissions,
        pluginsAndSettingsPermissions: state.pluginsAndSettingsPermissions,
      };
    },
    resetForm: () => {
      dispatch({ type: 'ON_RESET', initialPermissions: rolePermissions });
    },
    setFormAfterSubmit: () => {
      dispatch({ type: 'ON_SUBMIT_SUCCEEDED' });
    },
  }));

  const allSingleTypesAttributes = useMemo(() => {
    return getAllAttributes(singleTypes, components);
  }, [components, singleTypes]);

  const allCollectionTypesAttributes = useMemo(() => {
    return getAllAttributes(collectionTypes, components);
  }, [components, collectionTypes]);

  const pluginsPermissionsLayout = useMemo(() => {
    return formatPermissionsLayout(permissionsLayout.sections.plugins, 'plugin');
  }, [permissionsLayout]);

  const settingsPermissionsLayout = useMemo(() => {
    return formatPermissionsLayout(permissionsLayout.sections.settings, 'category');
  }, [permissionsLayout]);

  const providerValues = {
    ...state,
    dispatch,
    components,
  };

  return (
    <PermissionsProvider value={providerValues}>
      <Tabs tabsLabel={roleTabsLabel}>
        <ContentTypes
          allContentTypesAttributes={allCollectionTypesAttributes}
          contentTypes={collectionTypes}
        />
        <ContentTypes
          allContentTypesAttributes={allSingleTypesAttributes}
          contentTypes={singleTypes}
        />
        <PluginsAndSettingsPermissions
          permissionType="plugin"
          pluginsPermissionsLayout={pluginsPermissionsLayout}
        />
        <PluginsAndSettingsPermissions
          permissionType="settings"
          pluginsPermissionsLayout={settingsPermissionsLayout}
        />
      </Tabs>
    </PermissionsProvider>
  );
});

Permissions.defaultProps = {
  role: null,
  rolePermissions: {},
};
Permissions.propTypes = {
  permissionsLayout: PropTypes.object.isRequired,
  rolePermissions: PropTypes.object,
  role: PropTypes.object,
};

export default memo(Permissions);
