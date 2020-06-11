import React, { useReducer } from 'react';

import Tabs from '../Tabs';
import ContentTypes from './ContentTypes';
import PluginsPermissions from './Plugins';
import SettingsPermissions from './Settings';
import { roleTabsLabel } from '../../../utils';
import { useModels } from '../../../hooks';
import PermissionsProvider from './PermissionsProvider';
import reducer, { initialState } from './reducer';

const Permissions = () => {
  const { singleTypes, collectionTypes, components } = useModels();
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleCollapse = (index, value) => {
    dispatch({
      type: 'COLLAPSE_PATH',
      index,
      value,
    });
  };

  const providerValues = {
    ...state,
    components,
    onCollapse: handleCollapse,
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

export default Permissions;
