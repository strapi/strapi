import React, { useReducer, useEffect } from 'react';
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

const Permissions = ({ permissionsLayout, rolePermissions, onChange }) => {
  const { singleTypes, collectionTypes, components } = useModels();
  const [state, dispatch] = useReducer(reducer, initialState, state =>
    init(state, permissionsLayout, rolePermissions)
  );

  useEffect(() => {
    if (state.permissions) {
      // Manually trigger formk.setFieldValue to keep the form state update.
      onChange('permissions', state.permissions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.permissions]);

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

  const handleSetAttributesPermissions = ({ attributes, action, shouldEnable }) => {
    dispatch({
      type: 'SET_ATTRIBUTES_PERMISSIONS',
      attributes,
      action,
      shouldEnable,
    });
  };

  const handleContentTypeAttributesActionSelect = ({
    subject,
    action,
    attributes,
    shouldEnable,
  }) => {
    dispatch({
      type: 'CONTENT_TYPE_ATTRIBUTES_ACTION_SELECT',
      subject,
      action,
      attributes,
      shouldEnable,
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
    addContentTypeActions,
  }) => {
    dispatch({
      type: 'ALL_CONTENT_TYPE_PERMISSIONS_SELECT',
      subject,
      attributes,
      shouldEnable,
      addContentTypeActions,
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
    onContentTypeAttributesActionSelect: handleContentTypeAttributesActionSelect,
    onAllContentTypeActions: handleAllContentTypeActions,
    onGlobalPermissionsActionSelect: handleGlobalPermissionsActionSelect,
    onSetAttributesPermissions: handleSetAttributesPermissions,
  };

  return (
    <PermissionsProvider value={providerValues}>
      <Tabs tabsLabel={roleTabsLabel}>
        <ContentTypes contentTypes={collectionTypes} />
        <ContentTypes contentTypes={singleTypes} />
        <PluginsPermissions />
        <SettingsPermissions />
      </Tabs>
    </PermissionsProvider>
  );
};

Permissions.propTypes = {
  permissionsLayout: PropTypes.object.isRequired,
  rolePermissions: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};
export default Permissions;
