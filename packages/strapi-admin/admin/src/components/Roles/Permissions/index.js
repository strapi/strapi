import React, { useReducer, forwardRef, useMemo, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';

import Tabs from '../Tabs';
import ContentTypes from './ContentTypes';
import PluginsPermissions from './Plugins';
import SettingsPermissions from './Settings';
import { roleTabsLabel } from '../../../utils';
import { useModels } from '../../../hooks';
import PermissionsProvider from './PermissionsProvider';
import reducer, { initialState } from './reducer';
import init from './init';
import { getAllAttributes } from './utils';

const Permissions = forwardRef(({ permissionsLayout, rolePermissions }, ref) => {
  const { singleTypes, collectionTypes, components } = useModels();
  const [state, dispatch] = useReducer(reducer, initialState, state =>
    init(state, permissionsLayout, rolePermissions)
  );

  useImperativeHandle(ref, () => ({
    getPermissions: () => {
      return {
        contentTypesPermissions: state.contentTypesPermissions,
        pluginsAndSettingsPermissions: state.pluginsAndSettingsPermissions,
      };
    },
  }));

  const allSingleTypesAttributes = useMemo(() => {
    return getAllAttributes(singleTypes, components);
  }, [components, singleTypes]);

  const allCollectionTypesAttributes = useMemo(() => {
    return getAllAttributes(collectionTypes, components);
  }, [components, collectionTypes]);

  const handleCollapse = (index, value) => {
    dispatch({
      type: 'COLLAPSE_PATH',
      index,
      value,
    });
  };

  const handleAttributePermissionSelect = ({ subject, action, attribute }) => {
    dispatch({
      type: 'ATTRIBUTE_PERMISSION_SELECT',
      subject,
      action,
      attribute,
    });
  };

  const handleSetAttributesPermissions = ({
    attributes,
    action,
    shouldEnable,
    hasContentTypeAction,
  }) => {
    dispatch({
      type: 'SET_ATTRIBUTES_PERMISSIONS',
      attributes,
      action,
      shouldEnable,
      hasContentTypeAction,
    });
  };

  const handleAttributesSelect = ({
    subject,
    action,
    attributes,
    shouldEnable,
    hasContentTypeAction,
  }) => {
    dispatch({
      type: 'ON_ATTRIBUTES_SELECT',
      subject,
      action,
      attributes,
      shouldEnable,
      hasContentTypeAction,
    });
  };

  const handleContentTypeActionSelect = ({ subject, action }) => {
    dispatch({
      type: 'CONTENT_TYPE_ACTION_SELECT',
      subject,
      action,
    });
  };

  const handleAllContentTypeActions = ({
    subject,
    attributes,
    shouldEnable,
    shouldSetAllContentTypes,
  }) => {
    dispatch({
      type: 'ALL_CONTENT_TYPE_PERMISSIONS_SELECT',
      subject,
      attributes,
      shouldEnable,
      shouldSetAllContentTypes,
    });
  };

  const handleGlobalPermissionsActionSelect = ({ contentTypes, action, shouldEnable }) => {
    dispatch({
      type: 'GLOBAL_PERMISSIONS_SELECT',
      contentTypes,
      action,
      shouldEnable,
    });
  };

  const handleAllAttributeActionsSelect = ({ subject, attribute }) => {
    dispatch({
      type: 'ALL_ATTRIBUTE_ACTIONS_SELECT',
      subject,
      attribute,
    });
  };

  const providerValues = {
    ...state,
    components,
    onCollapse: handleCollapse,
    onAttributePermissionSelect: handleAttributePermissionSelect,
    onAllAttributeActionsSelect: handleAllAttributeActionsSelect,
    onContentTypeActionSelect: handleContentTypeActionSelect,
    onAttributesSelect: handleAttributesSelect,
    onAllContentTypeActions: handleAllContentTypeActions,
    onGlobalPermissionsActionSelect: handleGlobalPermissionsActionSelect,
    onSetAttributesPermissions: handleSetAttributesPermissions,
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
        <PluginsPermissions />
        <SettingsPermissions />
      </Tabs>
    </PermissionsProvider>
  );
});

Permissions.propTypes = {
  permissionsLayout: PropTypes.object.isRequired,
  rolePermissions: PropTypes.object.isRequired,
};
export default Permissions;
